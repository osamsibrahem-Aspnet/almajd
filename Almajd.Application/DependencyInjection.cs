using Almajd.Application.Interfaces;
using Almajd.Application.Services;
using Microsoft.Extensions.DependencyInjection;

namespace Almajd.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddAutoMapper(cfg => cfg.AddMaps(typeof(DependencyInjection).Assembly));

        services.AddScoped<IAuthService, AuthService>();

        // Catalog
        services.AddScoped<IBrandService, BrandService>();
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<IProductService, ProductService>();

        // Inventory
        services.AddScoped<IWarehouseService, WarehouseService>();
        services.AddScoped<ILocationService, LocationService>();
        services.AddScoped<IInventoryService, InventoryService>();
        services.AddScoped<IInventoryCountService, InventoryCountService>();

        // CRM
        services.AddScoped<ICustomerService, CustomerService>();
        services.AddScoped<ICustomerCreditService, CustomerCreditService>();

        // Sales
        services.AddScoped<IPricingService, PricingService>();
        services.AddScoped<IPriceListService, PriceListService>();
        services.AddScoped<ICouponService, CouponService>();
        services.AddScoped<IOrderService, OrderService>();

        // Fulfilment
        services.AddScoped<IPickListService, PickListService>();
        services.AddScoped<IShipmentService, ShipmentService>();

        // Purchasing
        services.AddScoped<ISupplierService, SupplierService>();
        services.AddScoped<IPurchaseOrderService, PurchaseOrderService>();
        services.AddScoped<IGoodsReceiptService, GoodsReceiptService>();
        services.AddScoped<IReplenishmentService, ReplenishmentService>();

        // Billing
        services.AddScoped<IInvoiceService, InvoiceService>();
        services.AddScoped<IPaymentService, PaymentService>();
        services.AddScoped<ICreditNoteService, CreditNoteService>();
        services.AddScoped<IArAgingService, ArAgingService>();

        // Notifications + Reports
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<IReportService, ReportService>();

        // Admin: users management
        services.AddScoped<IUserService, UserService>();

        return services;
    }
}
