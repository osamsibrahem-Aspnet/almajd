using Almajd.Application.Common;
using Almajd.Application.DTOs.Purchasing;
using Almajd.Application.Interfaces;
using Almajd.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Almajd.Application.Services;

public class ReplenishmentService : IReplenishmentService
{
    private readonly IUnitOfWork _uow;

    public ReplenishmentService(IUnitOfWork uow) => _uow = uow;

    public async Task<ApiResponse<IReadOnlyList<ReplenishmentSuggestionDto>>> ListSuggestionsAsync(Guid? supplierId = null)
    {
        // SKUs with reorder point set; include product for name
        var skus = await _uow.Repository<Sku>().Query()
            .Include(s => s.Product)
            .Where(s => s.IsActive && s.ReorderPoint != null && s.ReorderQty != null && s.ReorderPoint > 0)
            .ToListAsync();

        if (skus.Count == 0)
            return ApiResponse<IReadOnlyList<ReplenishmentSuggestionDto>>.Ok(Array.Empty<ReplenishmentSuggestionDto>());

        var skuIds = skus.Select(s => s.Id).ToHashSet();

        // Available qty per SKU across all locations
        var availability = await _uow.Repository<StockItem>().Query()
            .Where(s => skuIds.Contains(s.SkuId))
            .GroupBy(s => s.SkuId)
            .Select(g => new { SkuId = g.Key, Available = g.Sum(x => x.QtyOnHand - x.QtyReserved) })
            .ToDictionaryAsync(x => x.SkuId, x => x.Available);

        // Preferred supplier per SKU (and its current cost)
        var preferredBySku = await _uow.Repository<SupplierSku>().Query()
            .Include(s => s.Supplier)
            .Where(s => skuIds.Contains(s.SkuId) && s.IsPreferred && s.Supplier.IsActive)
            .ToDictionaryAsync(s => s.SkuId, s => s);

        var result = new List<ReplenishmentSuggestionDto>();
        foreach (var sku in skus)
        {
            var available = availability.TryGetValue(sku.Id, out var a) ? a : 0;
            if (available >= sku.ReorderPoint!.Value) continue;

            preferredBySku.TryGetValue(sku.Id, out var pref);

            if (supplierId.HasValue && pref?.SupplierId != supplierId.Value) continue;

            result.Add(new ReplenishmentSuggestionDto
            {
                SkuId = sku.Id,
                SkuCode = sku.Code,
                Barcode = sku.Barcode,
                ProductName = sku.Product.Name,
                ReorderPoint = sku.ReorderPoint!.Value,
                ReorderQty = sku.ReorderQty!.Value,
                AvailableQty = available,
                SuggestedQty = sku.ReorderQty!.Value,
                PreferredSupplierId = pref?.SupplierId,
                PreferredSupplierName = pref?.Supplier.Name,
                LastCostPrice = pref?.CostPrice
            });
        }

        return ApiResponse<IReadOnlyList<ReplenishmentSuggestionDto>>.Ok(
            result.OrderBy(r => r.PreferredSupplierName).ThenBy(r => r.SkuCode).ToList());
    }
}
