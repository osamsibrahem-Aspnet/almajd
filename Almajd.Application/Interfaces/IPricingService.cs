using Almajd.Application.Common;

namespace Almajd.Application.Interfaces;

public interface IPricingService
{
    Task<ApiResponse<PricedLine>> PriceLineAsync(Guid customerId, Guid skuId, int qty,
        decimal? unitPriceOverride = null, decimal? discountPctOverride = null);
}

public record PricedLine(
    Guid SkuId,
    int Qty,
    decimal UnitPrice,
    decimal DiscountPct,
    decimal TaxPct,
    string PriceSource);
