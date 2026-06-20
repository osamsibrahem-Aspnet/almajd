using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Almajd.Application.Common;
using Almajd.Application.DTOs.Billing;
using Almajd.Application.DTOs.Catalog;
using Almajd.Application.DTOs.Crm;
using Almajd.Application.DTOs.Fulfilment;
using Almajd.Application.DTOs.Inventory;
using Almajd.Application.DTOs.Sales;
using Almajd.Domain.Enums;
using Almajd.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Almajd.IntegrationTests.Infrastructure;

/// <summary>
/// Convenience builders that hit the API to set up test scenarios.
/// All methods require a pre-authorized HttpClient (use AuthHelpers.GetAdminClientAsync).
/// </summary>
public static class SeedHelpers
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    public static async Task<BrandDto> CreateBrandAsync(HttpClient client, string? name = null)
    {
        var dto = new BrandCreateDto { Name = name ?? $"Brand-{Guid.NewGuid():N}"[..12] };
        var response = await client.PostAsJsonAsync("/api/brands", dto);
        response.EnsureSuccessStatusCode();
        var api = await response.ReadApiResponseAsync<BrandDto>();
        return api.Data!;
    }

    public static async Task<CategoryDto> CreateCategoryAsync(HttpClient client, string? name = null)
    {
        var dto = new CategoryCreateDto { Name = name ?? $"Cat-{Guid.NewGuid():N}"[..12] };
        var response = await client.PostAsJsonAsync("/api/categories", dto);
        response.EnsureSuccessStatusCode();
        var api = await response.ReadApiResponseAsync<CategoryDto>();
        return api.Data!;
    }

    /// <summary>
    /// Creates a Product (Active status) with one SKU and returns the SKU id.
    /// Also sets a price-list entry for the default price list so orders can be priced.
    /// </summary>
    public static async Task<(Guid ProductId, Guid SkuId)> CreateProductWithSkuAsync(
        HttpClient client,
        Guid brandId,
        AlmajdWebAppFactory factory,
        string? productName = null,
        string? skuCode = null,
        decimal unitPrice = 100m)
    {
        var pName = productName ?? $"Prod-{Guid.NewGuid():N}"[..14];
        var productDto = new ProductCreateDto
        {
            BrandId = brandId,
            Name = pName,
            Status = ProductStatus.Published
        };
        var prodResp = await client.PostAsJsonAsync("/api/products", productDto);
        prodResp.EnsureSuccessStatusCode();
        var product = (await prodResp.ReadApiResponseAsync<ProductDto>()).Data!;

        var code = skuCode ?? $"SKU-{Guid.NewGuid():N}".ToUpperInvariant()[..16];
        var barcode = $"BAR{Guid.NewGuid():N}".ToUpperInvariant()[..13];

        var skuDto = new SkuCreateDto
        {
            ProductId = product.Id,
            Code = code,
            Barcode = barcode,
            WeightG = 500
        };
        var skuResp = await client.PostAsJsonAsync("/api/products/skus", skuDto);
        skuResp.EnsureSuccessStatusCode();
        var sku = (await skuResp.ReadApiResponseAsync<SkuDto>()).Data!;

        // Seed a price-list line so pricing works (uses the default price list).
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var priceList = await db.PriceLists.FirstAsync(p => p.IsDefault);

        db.PriceListLines.Add(new Almajd.Domain.Entities.PriceListLine
        {
            PriceListId = priceList.Id,
            SkuId = sku.Id,
            UnitPrice = unitPrice
            // Tax rate comes from config (Pricing:DefaultVatPct = 14 by default)
        });
        await db.SaveChangesAsync();

        return (product.Id, sku.Id);
    }

    public static async Task<CustomerDto> CreateCustomerAsync(
        HttpClient client,
        string? name = null,
        decimal creditLimit = 999_999m)
    {
        var dto = new CustomerCreateDto
        {
            LegalName = name ?? $"TestCust-{Guid.NewGuid():N}"[..17],
            PaymentTermsNetDays = 30,
            CreditLimit = creditLimit,
            Tier = CustomerTier.Mid
        };
        var response = await client.PostAsJsonAsync("/api/customers", dto);
        response.EnsureSuccessStatusCode();
        return (await response.ReadApiResponseAsync<CustomerDto>()).Data!;
    }

    /// <summary>
    /// Calls POST /api/inventory/receive to put qty units of skuId at locationId.
    /// </summary>
    public static async Task ReceiveStockAsync(
        HttpClient client,
        Guid skuId,
        Guid locationId,
        int quantity)
    {
        var dto = new ReceiveStockDto
        {
            SkuId = skuId,
            ToLocationId = locationId,
            Quantity = quantity
        };
        var response = await client.PostAsJsonAsync("/api/inventory/receive", dto);
        response.EnsureSuccessStatusCode();
    }

    /// <summary>
    /// Gets the first pickable location in the MAIN warehouse.
    /// </summary>
    public static async Task<Guid> GetPickableLocationIdAsync(AlmajdWebAppFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var loc = await db.Locations
            .Include(l => l.Warehouse)
            .FirstAsync(l => l.IsPickable && l.Warehouse.Code == "MAIN");
        return loc.Id;
    }

    /// <summary>
    /// Gets the MAIN warehouse id.
    /// </summary>
    public static async Task<Guid> GetMainWarehouseIdAsync(AlmajdWebAppFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        return (await db.Warehouses.FirstAsync(w => w.Code == "MAIN")).Id;
    }

    /// <summary>
    /// Gets all locations in MAIN warehouse.
    /// </summary>
    public static async Task<List<Guid>> GetAllMainLocationsAsync(AlmajdWebAppFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        return await db.Locations
            .Include(l => l.Warehouse)
            .Where(l => l.Warehouse.Code == "MAIN")
            .Select(l => l.Id)
            .ToListAsync();
    }

    /// <summary>
    /// Creates a Draft order, submits it (which triggers stock reservation + approval),
    /// and returns the resulting OrderDto. Requires stock to be pre-received at a pickable location.
    /// </summary>
    public static async Task<OrderDto?> CreateAndSubmitOrderAsync(
        HttpClient client,
        Guid customerId,
        List<OrderLineInputDto> lines)
    {
        var createDto = new OrderCreateDto
        {
            CustomerId = customerId,
            Channel = OrderChannel.WalkIn,
            Lines = lines
        };
        var createResp = await client.PostAsJsonAsync("/api/orders", createDto);
        if (!createResp.IsSuccessStatusCode) return null;
        var order = (await createResp.ReadApiResponseAsync<OrderDto>()).Data!;

        var submitResp = await client.PostAsJsonAsync($"/api/orders/{order.Id}/submit", new { });
        if (!submitResp.IsSuccessStatusCode) return null;
        return (await submitResp.ReadApiResponseAsync<OrderDto>()).Data;
    }

    /// <summary>
    /// Advances an Approved order all the way to Shipped status so it can be invoiced.
    /// Flow: Approve -> already approved from Submit -> mark picklist picked -> create shipment -> dispatch.
    /// Because the order goes through submit+approve in CreateAndSubmitOrderAsync, we just need
    /// to create a shipment. This requires the order to be in ReadyToShip state.
    /// So we need to go Approved -> InPreparation -> ReadyToShip -> Shipped.
    /// Simplification: set state directly via DB since there's no single "ship" endpoint.
    /// </summary>
    public static async Task ForceOrderToShippedAsync(AlmajdWebAppFactory factory, Guid orderId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var order = await db.Orders.FirstAsync(o => o.Id == orderId);
        order.Status = Almajd.Domain.Enums.OrderStatus.Shipped;
        order.ShippedAt = DateTime.UtcNow.AddMinutes(-1);
        await db.SaveChangesAsync();
    }

    /// <summary>
    /// Issues an invoice for an order that is already in Shipped/Delivered state.
    /// </summary>
    public static async Task<InvoiceDto?> IssueInvoiceAsync(HttpClient client, Guid orderId)
    {
        var dto = new IssueInvoiceFromOrderDto { OrderId = orderId };
        var response = await client.PostAsJsonAsync("/api/invoices/issue-from-order", dto);
        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync();
            return null;
        }
        return (await response.ReadApiResponseAsync<InvoiceDto>()).Data;
    }

    /// <summary>
    /// Full pipeline: create customer + receive stock + create order + submit + ship + issue invoice.
    /// Returns (customerId, orderId, invoiceDto).
    /// </summary>
    public static async Task<(Guid CustomerId, Guid OrderId, InvoiceDto Invoice)> CreateFullInvoiceScenarioAsync(
        HttpClient client,
        AlmajdWebAppFactory factory,
        Guid skuId,
        Guid locationId,
        int qty = 5,
        decimal unitPrice = 100m)
    {
        var customer = await CreateCustomerAsync(client);
        await ReceiveStockAsync(client, skuId, locationId, qty + 50); // receive plenty

        var order = await CreateAndSubmitOrderAsync(client, customer.Id, new List<OrderLineInputDto>
        {
            new() { SkuId = skuId, Qty = qty }
        });

        if (order is null || order.Status != OrderStatus.Approved)
            throw new InvalidOperationException($"Order did not reach Approved state. Status: {order?.Status}");

        await ForceOrderToShippedAsync(factory, order.Id);

        var invoice = await IssueInvoiceAsync(client, order.Id)
            ?? throw new InvalidOperationException("Failed to issue invoice.");

        return (customer.Id, order.Id, invoice);
    }
}
