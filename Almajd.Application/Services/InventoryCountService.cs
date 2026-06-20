using Almajd.Application.Common;
using Almajd.Application.DTOs.Inventory;
using Almajd.Application.Interfaces;
using Almajd.Domain.Entities;
using Almajd.Domain.Enums;
using AutoMapper;
using Microsoft.EntityFrameworkCore;

namespace Almajd.Application.Services;

public class InventoryCountService : IInventoryCountService
{
    private readonly IUnitOfWork _uow;
    private readonly IMapper _mapper;
    private readonly IInventoryService _inventory;

    public InventoryCountService(IUnitOfWork uow, IMapper mapper, IInventoryService inventory)
    {
        _uow = uow;
        _mapper = mapper;
        _inventory = inventory;
    }

    public async Task<ApiResponse<IReadOnlyList<InventoryCountDto>>> ListAsync(Guid? warehouseId = null)
    {
        IQueryable<InventoryCount> query = _uow.Repository<InventoryCount>().Query()
            .Include(c => c.Warehouse)
            .Include(c => c.Lines);

        if (warehouseId.HasValue) query = query.Where(c => c.WarehouseId == warehouseId);

        var items = await query.OrderByDescending(c => c.CreatedAt).ToListAsync();
        return ApiResponse<IReadOnlyList<InventoryCountDto>>.Ok(items.Select(_mapper.Map<InventoryCountDto>).ToList());
    }

    public async Task<ApiResponse<InventoryCountDetailDto>> GetAsync(Guid id)
    {
        var item = await LoadDetailQuery().FirstOrDefaultAsync(c => c.Id == id);
        return item is null
            ? ApiResponse<InventoryCountDetailDto>.Fail(404, "Inventory count not found.")
            : ApiResponse<InventoryCountDetailDto>.Ok(_mapper.Map<InventoryCountDetailDto>(item));
    }

    public async Task<ApiResponse<InventoryCountDto>> CreateAsync(CreateInventoryCountDto dto)
    {
        if (!await _uow.Repository<Warehouse>().AnyAsync(w => w.Id == dto.WarehouseId))
            return ApiResponse<InventoryCountDto>.Fail(400, "Warehouse not found.");

        var count = new InventoryCount
        {
            WarehouseId = dto.WarehouseId,
            Status = InventoryCountStatus.Draft,
            Notes = dto.Notes
        };

        await _uow.Repository<InventoryCount>().AddAsync(count);
        await _uow.CompleteAsync();

        return ApiResponse<InventoryCountDto>.Created(_mapper.Map<InventoryCountDto>(count));
    }

    public async Task<ApiResponse<InventoryCountDto>> StartAsync(Guid id)
    {
        var count = await _uow.Repository<InventoryCount>().GetByIdAsync(id);
        if (count is null) return ApiResponse<InventoryCountDto>.Fail(404, "Inventory count not found.");

        if (count.Status != InventoryCountStatus.Draft)
            return ApiResponse<InventoryCountDto>.Fail(400, $"Cannot start a count in state {count.Status}.");

        count.Status = InventoryCountStatus.InProgress;
        count.StartedAt = DateTime.UtcNow;

        _uow.Repository<InventoryCount>().Update(count);
        await _uow.CompleteAsync();

        return ApiResponse<InventoryCountDto>.Ok(_mapper.Map<InventoryCountDto>(count));
    }

    public async Task<ApiResponse<InventoryCountDetailDto>> SetLinesAsync(Guid id, IReadOnlyList<CountLineInputDto> lines)
    {
        var count = await _uow.Repository<InventoryCount>().Query()
            .Include(c => c.Lines)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (count is null) return ApiResponse<InventoryCountDetailDto>.Fail(404, "Inventory count not found.");
        if (count.Status != InventoryCountStatus.InProgress)
            return ApiResponse<InventoryCountDetailDto>.Fail(400, $"Cannot edit lines in state {count.Status}.");

        // Replace lines: simpler than diff-merging for MVP.
        foreach (var existing in count.Lines.ToList())
            _uow.Repository<InventoryCountLine>().SoftDelete(existing);

        var locationsInWarehouse = await _uow.Repository<Location>()
            .FindAsync(l => l.WarehouseId == count.WarehouseId);
        var locationIds = locationsInWarehouse.Select(l => l.Id).ToHashSet();

        var stockSnapshot = await _uow.Repository<StockItem>().Query()
            .Where(s => locationIds.Contains(s.LocationId))
            .ToDictionaryAsync(s => (s.SkuId, s.LocationId), s => s.QtyOnHand);

        foreach (var input in lines)
        {
            if (!locationIds.Contains(input.LocationId))
                return ApiResponse<InventoryCountDetailDto>.Fail(400,
                    $"Location {input.LocationId} does not belong to this warehouse.");

            if (!await _uow.Repository<Sku>().AnyAsync(s => s.Id == input.SkuId))
                return ApiResponse<InventoryCountDetailDto>.Fail(400, $"SKU {input.SkuId} not found.");

            var systemQty = stockSnapshot.TryGetValue((input.SkuId, input.LocationId), out var qty) ? qty : 0;

            await _uow.Repository<InventoryCountLine>().AddAsync(new InventoryCountLine
            {
                CountId = id,
                SkuId = input.SkuId,
                LocationId = input.LocationId,
                SystemQty = systemQty,
                CountedQty = input.CountedQty
            });
        }

        await _uow.CompleteAsync();

        return await GetAsync(id);
    }

    public async Task<ApiResponse<InventoryCountDto>> PostAsync(Guid id, Guid? userId)
    {
        var count = await _uow.Repository<InventoryCount>().Query()
            .Include(c => c.Lines)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (count is null) return ApiResponse<InventoryCountDto>.Fail(404, "Inventory count not found.");
        if (count.Status != InventoryCountStatus.InProgress)
            return ApiResponse<InventoryCountDto>.Fail(400, $"Cannot post a count in state {count.Status}.");
        if (count.Lines.Count == 0)
            return ApiResponse<InventoryCountDto>.Fail(400, "No lines to post.");

        // Generate one adjustment movement per variant line.
        foreach (var line in count.Lines)
        {
            var delta = line.CountedQty - line.SystemQty;
            if (delta == 0) continue;

            var result = await _inventory.AdjustAsync(new AdjustStockDto
            {
                SkuId = line.SkuId,
                LocationId = line.LocationId,
                Delta = delta,
                Reason = $"Inventory count {id:N} variance"
            }, userId);

            if (!result.IsSuccess)
                return ApiResponse<InventoryCountDto>.Fail(result.StatusCode,
                    $"Failed to post line for SKU {line.SkuId}: {result.Message}");
        }

        count.Status = InventoryCountStatus.Posted;
        count.PostedAt = DateTime.UtcNow;

        _uow.Repository<InventoryCount>().Update(count);
        await _uow.CompleteAsync();

        return ApiResponse<InventoryCountDto>.Ok(_mapper.Map<InventoryCountDto>(count));
    }

    public async Task<ApiResponse> CancelAsync(Guid id)
    {
        var count = await _uow.Repository<InventoryCount>().GetByIdAsync(id);
        if (count is null) return ApiResponse.Fail(404, "Inventory count not found.");

        if (count.Status == InventoryCountStatus.Posted)
            return ApiResponse.Fail(400, "Cannot cancel a posted count.");

        count.Status = InventoryCountStatus.Cancelled;
        _uow.Repository<InventoryCount>().Update(count);
        await _uow.CompleteAsync();

        return ApiResponse.Ok("Inventory count cancelled.");
    }

    private IQueryable<InventoryCount> LoadDetailQuery() =>
        _uow.Repository<InventoryCount>().Query()
            .Include(c => c.Warehouse)
            .Include(c => c.Lines).ThenInclude(l => l.Sku).ThenInclude(s => s.Product)
            .Include(c => c.Lines).ThenInclude(l => l.Location);
}
