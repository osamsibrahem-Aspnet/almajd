using Almajd.Application.Interfaces;
using Almajd.Domain.Constants;
using Almajd.Domain.Entities;
using Almajd.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Almajd.Infrastructure.BackgroundJobs;

/// <summary>
/// Hourly: scan SKUs below reorder point and notify Admin + Procurement users.
/// </summary>
public class LowStockAlertHostedService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(1);
    private static readonly TimeSpan InitialDelay = TimeSpan.FromMinutes(1);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<LowStockAlertHostedService> _logger;

    public LowStockAlertHostedService(IServiceScopeFactory scopeFactory, ILogger<LowStockAlertHostedService> logger)
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
                _logger.LogError(ex, "LowStockAlert run failed");
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

        var lowSkus = await db.Skus
            .Where(s => s.IsActive && s.ReorderPoint != null && s.ReorderPoint > 0)
            .Select(s => new
            {
                s.Id,
                s.Code,
                s.Barcode,
                Product = s.Product.Name,
                ReorderPoint = s.ReorderPoint!.Value,
                Available = db.StockItems.Where(x => x.SkuId == s.Id).Sum(x => x.QtyOnHand - x.QtyReserved)
            })
            .Where(x => x.Available < x.ReorderPoint)
            .ToListAsync(ct);

        if (lowSkus.Count == 0) return;

        var procurement = await userManager.GetUsersInRoleAsync(AppRoles.Procurement);
        var admins = await userManager.GetUsersInRoleAsync(AppRoles.Admin);
        var recipients = procurement.Concat(admins).Select(u => u.Id).Distinct().ToList();
        if (recipients.Count == 0) return;

        _logger.LogInformation("Low stock alert: {Count} SKUs below reorder point → {Recipients} users",
            lowSkus.Count, recipients.Count);

        foreach (var sku in lowSkus)
        {
            var data = new Dictionary<string, string>
            {
                ["SkuCode"] = sku.Code,
                ["Barcode"] = sku.Barcode,
                ["ProductName"] = sku.Product,
                ["Available"] = sku.Available.ToString(),
                ["ReorderPoint"] = sku.ReorderPoint.ToString()
            };

            await notify.BroadcastAsync(recipients, "LOW_STOCK", data);
        }
    }
}
