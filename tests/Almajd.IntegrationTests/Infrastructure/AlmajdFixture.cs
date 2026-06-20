using Almajd.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Almajd.IntegrationTests.Infrastructure;

/// <summary>
/// Shared collection fixture: one SQL Server container for the whole test run.
/// Exposes the factory so tests can create HttpClients and access the DI scope.
///
/// Per-test cleanup strategy:
///   Each test that mutates data calls CleanMutableDataAsync() at the start (or end) to truncate
///   rows from transactional tables while LEAVING seeded reference data intact:
///     - admin user, roles, MAIN warehouse, default price list, invoice counter, notification templates.
///   Truncation order respects FK constraints (children before parents).
/// </summary>
[CollectionDefinition("Almajd")]
public class AlmajdCollection : ICollectionFixture<AlmajdFixture> { }

public class AlmajdFixture : IAsyncLifetime
{
    public AlmajdWebAppFactory Factory { get; } = new();

    public async Task InitializeAsync()
    {
        await Factory.InitializeAsync();

        // Trigger the factory to boot the app (which runs migrations + seeding).
        using var client = Factory.CreateClient();
        var _ = await client.GetAsync("/api/health");
    }

    public async Task DisposeAsync()
    {
        await Factory.DisposeAsync();
    }

    /// <summary>
    /// Truncates all mutable transactional tables while preserving seeded reference data.
    /// Call at the start of each test that creates data to ensure a clean slate.
    /// Order matters: FK children must be deleted before parents.
    /// </summary>
    public async Task CleanMutableDataAsync()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        // Use raw SQL for speed. Disable constraints temporarily to avoid ordering issues.
        var sql = @"
            EXEC sp_MSforeachtable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL';

            DELETE FROM [PaymentAllocations];
            DELETE FROM [Payments];
            DELETE FROM [CreditNotes];
            DELETE FROM [InvoiceLines];
            DELETE FROM [Invoices];
            DELETE FROM [InventoryCountLines];
            DELETE FROM [InventoryCounts];
            DELETE FROM [StockMovements];
            DELETE FROM [StockItems];
            DELETE FROM [PickListLines];
            DELETE FROM [PickLists];
            DELETE FROM [GoodsReceiptLines];
            DELETE FROM [GoodsReceipts];
            DELETE FROM [PurchaseOrderLines];
            DELETE FROM [PurchaseOrders];
            DELETE FROM [OrderLines];
            DELETE FROM [Orders];
            DELETE FROM [CustomerAddresses];
            DELETE FROM [CustomerContacts];
            DELETE FROM [CustomerNotes];
            DELETE FROM [CustomerPriceLists];
            DELETE FROM [Customers];
            DELETE FROM [PriceListLines];
            DELETE FROM [Shipments];
            DELETE FROM [SupplierSkus];
            DELETE FROM [Suppliers];
            DELETE FROM [ProductMedia];
            DELETE FROM [Skus];
            DELETE FROM [Products];
            DELETE FROM [DiscountCoupons];
            DELETE FROM [Brands];
            DELETE FROM [Categories];
            DELETE FROM [OtpChallenges];
            DELETE FROM [Notifications];
            DELETE FROM [DeviceTokens];
            DELETE FROM [UserNotificationPreferences];

            -- Reset invoice counter to 1 for test year without deleting the row (seeded by DbInitializer).
            UPDATE [InvoiceCounters] SET [NextSequence] = 1;

            EXEC sp_MSforeachtable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL';
        ";

        await db.Database.ExecuteSqlRawAsync(sql);
    }
}
