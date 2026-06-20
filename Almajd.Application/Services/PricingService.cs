using Almajd.Application.Common;
using Almajd.Application.Interfaces;
using Almajd.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Almajd.Application.Services;

/// <summary>
/// Pricing precedence:
///   1. Manual unit-price override (rep with permission)
///   2. Customer-specific price list (via CustomerPriceList, highest Priority wins)
///   3. Tier-specific price list (PriceList.Tier matches Customer.Tier)
///   4. Default price list
/// Then: apply manual discount-% override if provided, else 0.
/// Tax rate comes from configuration (Pricing:DefaultVatPct).
/// </summary>
public class PricingService : IPricingService
{
    private readonly IUnitOfWork _uow;
    private readonly IConfiguration _config;

    public PricingService(IUnitOfWork uow, IConfiguration config)
    {
        _uow = uow;
        _config = config;
    }

    public async Task<ApiResponse<PricedLine>> PriceLineAsync(Guid customerId, Guid skuId, int qty,
        decimal? unitPriceOverride = null, decimal? discountPctOverride = null)
    {
        if (qty <= 0) return ApiResponse<PricedLine>.Fail(400, "Quantity must be positive.");

        var customer = await _uow.Repository<Customer>().GetByIdAsync(customerId);
        if (customer is null) return ApiResponse<PricedLine>.Fail(404, "Customer not found.");

        if (!await _uow.Repository<Sku>().AnyAsync(s => s.Id == skuId))
            return ApiResponse<PricedLine>.Fail(404, "SKU not found.");

        var taxPct = decimal.TryParse(_config["Pricing:DefaultVatPct"], out var v) ? v : 14m;

        // 1. Manual override
        if (unitPriceOverride is { } overridePrice)
        {
            if (overridePrice < 0)
                return ApiResponse<PricedLine>.Fail(400, "Override price cannot be negative.");

            return ApiResponse<PricedLine>.Ok(new PricedLine(
                skuId, qty, overridePrice, NormalizeDiscount(discountPctOverride), taxPct, "Manual"));
        }

        var now = DateTime.UtcNow;

        // 2. Customer-specific price lists, ordered by priority desc
        var customerLists = await _uow.Repository<CustomerPriceList>().Query()
            .Where(c => c.CustomerId == customerId)
            .OrderByDescending(c => c.Priority)
            .Select(c => c.PriceListId)
            .ToListAsync();

        foreach (var listId in customerLists)
        {
            var line = await FindActiveLineAsync(listId, skuId, qty, now);
            if (line is not null)
                return ApiResponse<PricedLine>.Ok(new PricedLine(
                    skuId, qty, line.UnitPrice, NormalizeDiscount(discountPctOverride), taxPct, "CustomerOverride"));
        }

        // 3. Tier-specific list
        var tierListId = await _uow.Repository<PriceList>().Query()
            .Where(p => p.IsActive && p.Tier == customer.Tier)
            .OrderByDescending(p => p.IsDefault)
            .Select(p => (Guid?)p.Id)
            .FirstOrDefaultAsync();

        if (tierListId.HasValue)
        {
            var line = await FindActiveLineAsync(tierListId.Value, skuId, qty, now);
            if (line is not null)
                return ApiResponse<PricedLine>.Ok(new PricedLine(
                    skuId, qty, line.UnitPrice, NormalizeDiscount(discountPctOverride), taxPct, "TierList"));
        }

        // 4. Default list
        var defaultListId = await _uow.Repository<PriceList>().Query()
            .Where(p => p.IsActive && p.IsDefault && p.Tier == null)
            .Select(p => (Guid?)p.Id)
            .FirstOrDefaultAsync();

        if (defaultListId.HasValue)
        {
            var line = await FindActiveLineAsync(defaultListId.Value, skuId, qty, now);
            if (line is not null)
                return ApiResponse<PricedLine>.Ok(new PricedLine(
                    skuId, qty, line.UnitPrice, NormalizeDiscount(discountPctOverride), taxPct, "DefaultList"));
        }

        return ApiResponse<PricedLine>.Fail(409,
            "No price found for this SKU. Add it to the default price list or a customer-specific list.");
    }

    private async Task<PriceListLine?> FindActiveLineAsync(Guid priceListId, Guid skuId, int qty, DateTime now) =>
        await _uow.Repository<PriceListLine>().Query()
            .Where(l => l.PriceListId == priceListId
                        && l.SkuId == skuId
                        && (l.ValidFrom == null || l.ValidFrom <= now)
                        && (l.ValidTo == null || l.ValidTo >= now)
                        && l.MinQty <= qty)
            .OrderByDescending(l => l.MinQty) // prefer the most-specific bracket
            .FirstOrDefaultAsync();

    private static decimal NormalizeDiscount(decimal? d)
    {
        if (d is null) return 0m;
        return Math.Clamp(d.Value, 0m, 100m);
    }
}
