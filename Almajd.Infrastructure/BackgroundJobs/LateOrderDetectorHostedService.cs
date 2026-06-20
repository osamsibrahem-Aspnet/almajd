using Almajd.Application.Interfaces;
using Almajd.Domain.Constants;
using Almajd.Domain.Entities;
using Almajd.Domain.Enums;
using Almajd.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Almajd.Infrastructure.BackgroundJobs;

/// <summary>
/// Hourly: surface orders past their ExpectedShipAt but not yet shipped. Alerts ops manager.
/// </summary>
public class LateOrderDetectorHostedService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(1);
    private static readonly TimeSpan InitialDelay = TimeSpan.FromMinutes(2);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<LateOrderDetectorHostedService> _logger;

    public LateOrderDetectorHostedService(IServiceScopeFactory scopeFactory, ILogger<LateOrderDetectorHostedService> logger)
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
                _logger.LogError(ex, "LateOrderDetector run failed");
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
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        var now = DateTime.UtcNow;

        var late = await db.Orders
            .Include(o => o.Customer)
            .Where(o => o.ExpectedShipAt != null
                        && o.ExpectedShipAt < now
                        && o.Status < OrderStatus.Shipped
                        && o.Status != OrderStatus.Cancelled)
            .ToListAsync(ct);

        if (late.Count == 0) return;

        var opsManagers = await userManager.GetUsersInRoleAsync(AppRoles.OpsManager);
        var admins = await userManager.GetUsersInRoleAsync(AppRoles.Admin);
        var recipients = opsManagers.Concat(admins).Select(u => u.Id).Distinct().ToList();
        if (recipients.Count == 0) return;

        foreach (var order in late)
        {
            var hoursLate = (int)(now - order.ExpectedShipAt!.Value).TotalHours;
            // Throttle: only alert on the first hour we detect the order as late
            if (hoursLate != 1 && hoursLate != 24 && hoursLate != 72) continue;

            var data = new Dictionary<string, string>
            {
                ["OrderNumber"] = order.Number,
                ["CustomerName"] = order.Customer.TradeName ?? order.Customer.LegalName,
                ["HoursLate"] = hoursLate.ToString(),
                ["ExpectedShipAt"] = order.ExpectedShipAt!.Value.ToString("yyyy-MM-dd HH:mm"),
                ["Status"] = order.Status.ToString()
            };

            await notify.BroadcastAsync(recipients, "ORDER_LATE", data);
        }
    }
}
