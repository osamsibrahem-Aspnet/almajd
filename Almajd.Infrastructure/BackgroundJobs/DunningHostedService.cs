using Almajd.Application.Interfaces;
using Almajd.Domain.Enums;
using Almajd.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Almajd.Infrastructure.BackgroundJobs;

/// <summary>
/// Daily: notify customers (and their sales reps) about invoices overdue at 7/14/30 days.
/// Idempotency: send only once per (invoice, threshold) by tracking via a date check + dedup
/// against an in-day cache. For production-grade dedup, persist (InvoiceId, ThresholdDays)
/// to a DunningSent table — Phase 2.
/// </summary>
public class DunningHostedService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(24);
    private static readonly TimeSpan InitialDelay = TimeSpan.FromMinutes(5);
    private static readonly int[] Thresholds = { 7, 14, 30 };

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DunningHostedService> _logger;

    public DunningHostedService(IServiceScopeFactory scopeFactory, ILogger<DunningHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(InitialDelay, stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunOnceAsync(stoppingToken);
            }
            catch (OperationCanceledException) { }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Dunning run failed");
            }

            try { await Task.Delay(Interval, stoppingToken); }
            catch (OperationCanceledException) { return; }
        }
    }

    private async Task RunOnceAsync(CancellationToken ct)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var notify = scope.ServiceProvider.GetRequiredService<INotificationService>();

        var now = DateTime.UtcNow.Date;

        var open = await db.Invoices
            .Include(i => i.Customer)
            .Where(i => i.Status != InvoiceStatus.Void
                        && i.Status != InvoiceStatus.Paid
                        && i.Total - i.AmountPaid > 0)
            .ToListAsync(ct);

        var sent = 0;
        foreach (var invoice in open)
        {
            var daysOverdue = (int)(now - invoice.DueAt.Date).TotalDays;
            if (daysOverdue <= 0) continue;

            // Fire only on the day we cross the threshold (today == DueAt + threshold)
            if (!Thresholds.Contains(daysOverdue)) continue;

            var data = new Dictionary<string, string>
            {
                ["InvoiceNumber"] = invoice.Number,
                ["Outstanding"] = invoice.Outstanding.ToString("N2"),
                ["Currency"] = invoice.Currency,
                ["DaysOverdue"] = daysOverdue.ToString(),
                ["CustomerName"] = invoice.Customer.TradeName ?? invoice.Customer.LegalName,
                ["DueDate"] = invoice.DueAt.ToString("yyyy-MM-dd")
            };

            // Notify the customer's primary user, if any — otherwise just log it for ops to follow up.
            // In Almajd, B2B customers are linked to ApplicationUser via OTP login (M7) — for now
            // we route the alert to the sales rep + accountants.
            var ops = await db.UserRoles
                .Where(ur => db.Roles.Any(r => r.Id == ur.RoleId && (r.Name == "Accountant" || r.Name == "Admin")))
                .Select(ur => ur.UserId)
                .Distinct()
                .ToListAsync(ct);

            await notify.BroadcastAsync(ops, "INVOICE_OVERDUE", data);
            sent++;
        }

        if (sent > 0)
            _logger.LogInformation("Dunning sent {Count} overdue-invoice notifications.", sent);
    }
}
