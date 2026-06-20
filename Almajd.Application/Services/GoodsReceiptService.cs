using Almajd.Application.Common;
using Almajd.Application.DTOs.Purchasing;
using Almajd.Application.Interfaces;
using Almajd.Domain.Entities;
using Almajd.Domain.Enums;
using AutoMapper;
using Microsoft.EntityFrameworkCore;

namespace Almajd.Application.Services;

public class GoodsReceiptService : IGoodsReceiptService
{
    private readonly IUnitOfWork _uow;
    private readonly IMapper _mapper;

    public GoodsReceiptService(IUnitOfWork uow, IMapper mapper)
    {
        _uow = uow;
        _mapper = mapper;
    }

    public async Task<ApiResponse<PagedResult<GoodsReceiptDto>>> SearchAsync(GoodsReceiptSearchQuery q)
    {
        var page = Math.Max(q.Page, 1);
        var pageSize = Math.Clamp(q.PageSize, 1, 200);

        IQueryable<GoodsReceipt> query = _uow.Repository<GoodsReceipt>().Query()
            .Include(g => g.PurchaseOrder).ThenInclude(p => p.Supplier)
            .Include(g => g.ReceivedBy)
            .Include(g => g.Lines).ThenInclude(l => l.Sku).ThenInclude(s => s.Product)
            .Include(g => g.Lines).ThenInclude(l => l.Location)
            .AsNoTracking();

        if (q.PurchaseOrderId.HasValue) query = query.Where(g => g.PurchaseOrderId == q.PurchaseOrderId);
        if (q.From.HasValue) query = query.Where(g => g.ReceivedAt >= q.From);
        if (q.To.HasValue) query = query.Where(g => g.ReceivedAt <= q.To);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(g => g.ReceivedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync();

        return ApiResponse<PagedResult<GoodsReceiptDto>>.Ok(new PagedResult<GoodsReceiptDto>
        {
            Items = items.Select(_mapper.Map<GoodsReceiptDto>).ToList(),
            Total = total,
            Page = page,
            PageSize = pageSize
        });
    }

    public async Task<ApiResponse<GoodsReceiptDto>> GetAsync(Guid id)
    {
        var gr = await LoadDetailQuery().FirstOrDefaultAsync(g => g.Id == id);
        return gr is null
            ? ApiResponse<GoodsReceiptDto>.Fail(404, "Goods receipt not found.")
            : ApiResponse<GoodsReceiptDto>.Ok(_mapper.Map<GoodsReceiptDto>(gr));
    }

    public async Task<ApiResponse<GoodsReceiptDto>> CreateAsync(GoodsReceiptCreateDto dto, Guid? userId)
    {
        var po = await _uow.Repository<PurchaseOrder>().Query()
            .Include(p => p.Lines).ThenInclude(l => l.Sku)
            .FirstOrDefaultAsync(p => p.Id == dto.PurchaseOrderId);

        if (po is null) return ApiResponse<GoodsReceiptDto>.Fail(400, "Purchase order not found.");

        if (po.Status is not PurchaseOrderStatus.Approved
            and not PurchaseOrderStatus.PartiallyReceived)
            return ApiResponse<GoodsReceiptDto>.Fail(409,
                $"PO must be Approved or PartiallyReceived to receive goods (current: {po.Status}).");

        // Validate each line input
        var poLineMap = po.Lines.ToDictionary(l => l.Id, l => l);
        foreach (var input in dto.Lines)
        {
            if (!poLineMap.TryGetValue(input.PurchaseOrderLineId, out var poLine))
                return ApiResponse<GoodsReceiptDto>.Fail(400, $"PO line {input.PurchaseOrderLineId} not on this PO.");

            var outstanding = poLine.Qty - poLine.ReceivedQty;
            if (input.Qty > outstanding)
                return ApiResponse<GoodsReceiptDto>.Fail(400,
                    $"Cannot receive {input.Qty} of SKU {poLine.Sku.Code}: only {outstanding} outstanding.");

            if (!await _uow.Repository<Location>().AnyAsync(loc => loc.Id == input.LocationId))
                return ApiResponse<GoodsReceiptDto>.Fail(400, $"Location {input.LocationId} not found.");
        }

        var receipt = new GoodsReceipt
        {
            Number = await NextReceiptNumberAsync(),
            PurchaseOrderId = po.Id,
            ReceivedAt = DateTime.UtcNow,
            ReceivedByUserId = userId,
            Notes = dto.Notes
        };

        // Process each line: update stock + emit Receive movement + update PO line + moving-avg cost
        foreach (var input in dto.Lines)
        {
            var poLine = poLineMap[input.PurchaseOrderLineId];
            var stockItem = await EnsureStockItemAsync(poLine.SkuId, input.LocationId);
            stockItem.QtyOnHand += input.Qty;

            await _uow.Repository<StockMovement>().AddAsync(new StockMovement
            {
                SkuId = poLine.SkuId,
                ToLocationId = input.LocationId,
                Quantity = input.Qty,
                Type = StockMovementType.Receive,
                ReferenceType = "GoodsReceipt",
                ReferenceId = receipt.Id,
                UserId = userId,
                OccurredAt = DateTime.UtcNow
            });

            poLine.ReceivedQty += input.Qty;
            _uow.Repository<PurchaseOrderLine>().Update(poLine);

            // Moving weighted-average cost update on Sku
            await UpdateAverageCostAsync(poLine.Sku, input.Qty, poLine.CostPrice);

            receipt.Lines.Add(new GoodsReceiptLine
            {
                PurchaseOrderLineId = poLine.Id,
                SkuId = poLine.SkuId,
                Qty = input.Qty,
                LocationId = input.LocationId
            });
        }

        // Update PO status
        var allFullyReceived = po.Lines.All(l => l.ReceivedQty >= l.Qty);
        po.Status = allFullyReceived ? PurchaseOrderStatus.FullyReceived : PurchaseOrderStatus.PartiallyReceived;
        _uow.Repository<PurchaseOrder>().Update(po);

        await _uow.Repository<GoodsReceipt>().AddAsync(receipt);
        await _uow.CompleteAsync();

        return await GetAsync(receipt.Id) is { IsSuccess: true } loaded
            ? ApiResponse<GoodsReceiptDto>.Created(loaded.Data!)
            : ApiResponse<GoodsReceiptDto>.Fail(500, "Receipt created but failed to reload.");
    }

    // ---- helpers ----

    private IQueryable<GoodsReceipt> LoadDetailQuery() =>
        _uow.Repository<GoodsReceipt>().Query()
            .Include(g => g.PurchaseOrder).ThenInclude(p => p.Supplier)
            .Include(g => g.ReceivedBy)
            .Include(g => g.Lines).ThenInclude(l => l.Sku).ThenInclude(s => s.Product)
            .Include(g => g.Lines).ThenInclude(l => l.Location);

    private async Task<StockItem> EnsureStockItemAsync(Guid skuId, Guid locationId)
    {
        var existing = await _uow.Repository<StockItem>()
            .FirstOrDefaultAsync(s => s.SkuId == skuId && s.LocationId == locationId);

        if (existing is not null) return existing;

        var item = new StockItem { SkuId = skuId, LocationId = locationId };
        await _uow.Repository<StockItem>().AddAsync(item);
        return item;
    }

    /// <summary>
    /// Moving weighted-average cost:
    ///   newAvg = (oldOnHand * oldAvg + receivedQty * receivedCost) / (oldOnHand + receivedQty)
    /// If oldAvg is null (first receipt), newAvg = receivedCost.
    /// </summary>
    private async Task UpdateAverageCostAsync(Sku sku, int receivedQty, decimal receivedCost)
    {
        var oldOnHand = await _uow.Repository<StockItem>().Query()
            .Where(s => s.SkuId == sku.Id)
            .SumAsync(s => (int?)s.QtyOnHand) ?? 0;

        // oldOnHand here already includes the newly received qty because EnsureStockItem
        // updated QtyOnHand before this is called. So subtract receivedQty to get the pre-receipt qty.
        var preReceiptOnHand = Math.Max(0, oldOnHand - receivedQty);

        if (sku.AverageCost is null || preReceiptOnHand == 0)
        {
            sku.AverageCost = receivedCost;
        }
        else
        {
            var blended = (preReceiptOnHand * sku.AverageCost.Value + receivedQty * receivedCost)
                          / (preReceiptOnHand + receivedQty);
            sku.AverageCost = Math.Round(blended, 4, MidpointRounding.AwayFromZero);
        }

        _uow.Repository<Sku>().Update(sku);
    }

    private async Task<string> NextReceiptNumberAsync()
    {
        var year = DateTime.UtcNow.Year;
        var prefix = $"GR-{year}-";

        var last = await _uow.Repository<GoodsReceipt>().Query()
            .Where(g => g.Number.StartsWith(prefix))
            .OrderByDescending(g => g.Number)
            .Select(g => g.Number)
            .FirstOrDefaultAsync();

        var next = 1;
        if (!string.IsNullOrWhiteSpace(last) && int.TryParse(last.AsSpan(prefix.Length), out var parsed))
            next = parsed + 1;

        return $"{prefix}{next:D6}";
    }
}
