using Almajd.Application.Common;
using Almajd.Application.DTOs.Inventory;
using Almajd.Application.Interfaces;
using Almajd.Domain.Entities;
using Almajd.Domain.Enums;
using AutoMapper;
using Microsoft.EntityFrameworkCore;

namespace Almajd.Application.Services;

public class InventoryService : IInventoryService
{
    private readonly IUnitOfWork _uow;
    private readonly IMapper _mapper;

    public InventoryService(IUnitOfWork uow, IMapper mapper)
    {
        _uow = uow;
        _mapper = mapper;
    }

    // ---------------- Queries ----------------

    public async Task<ApiResponse<PagedResult<StockItemDto>>> SearchStockAsync(StockSearchQuery q)
    {
        var page = Math.Max(q.Page, 1);
        var pageSize = Math.Clamp(q.PageSize, 1, 500);

        IQueryable<StockItem> query = _uow.Repository<StockItem>().Query()
            .Include(s => s.Sku).ThenInclude(s => s.Product)
            .Include(s => s.Location).ThenInclude(l => l.Warehouse)
            .AsNoTracking();

        if (q.SkuId.HasValue) query = query.Where(s => s.SkuId == q.SkuId);
        if (!string.IsNullOrWhiteSpace(q.SkuCode)) query = query.Where(s => s.Sku.Code == q.SkuCode);
        if (!string.IsNullOrWhiteSpace(q.Barcode)) query = query.Where(s => s.Sku.Barcode == q.Barcode);
        if (q.WarehouseId.HasValue) query = query.Where(s => s.Location.WarehouseId == q.WarehouseId);
        if (q.LocationId.HasValue) query = query.Where(s => s.LocationId == q.LocationId);
        if (q.OnlyAvailable) query = query.Where(s => s.QtyOnHand - s.QtyReserved > 0);

        var total = await query.CountAsync();
        var items = await query
            .OrderBy(s => s.Location.Warehouse.Code)
            .ThenBy(s => s.Location.Zone).ThenBy(s => s.Location.Aisle)
            .ThenBy(s => s.Location.Shelf).ThenBy(s => s.Location.Bin)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync();

        return ApiResponse<PagedResult<StockItemDto>>.Ok(new PagedResult<StockItemDto>
        {
            Items = items.Select(_mapper.Map<StockItemDto>).ToList(),
            Total = total,
            Page = page,
            PageSize = pageSize
        });
    }

    public async Task<ApiResponse<PagedResult<StockMovementDto>>> SearchMovementsAsync(MovementSearchQuery q)
    {
        var page = Math.Max(q.Page, 1);
        var pageSize = Math.Clamp(q.PageSize, 1, 500);

        IQueryable<StockMovement> query = _uow.Repository<StockMovement>().Query()
            .Include(m => m.Sku).ThenInclude(s => s.Product)
            .Include(m => m.FromLocation)
            .Include(m => m.ToLocation)
            .AsNoTracking();

        if (q.SkuId.HasValue) query = query.Where(m => m.SkuId == q.SkuId);
        if (q.LocationId.HasValue)
            query = query.Where(m => m.FromLocationId == q.LocationId || m.ToLocationId == q.LocationId);
        if (q.Type.HasValue) query = query.Where(m => m.Type == q.Type);
        if (!string.IsNullOrWhiteSpace(q.ReferenceType)) query = query.Where(m => m.ReferenceType == q.ReferenceType);
        if (q.ReferenceId.HasValue) query = query.Where(m => m.ReferenceId == q.ReferenceId);
        if (q.From.HasValue) query = query.Where(m => m.OccurredAt >= q.From);
        if (q.To.HasValue) query = query.Where(m => m.OccurredAt <= q.To);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(m => m.OccurredAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync();

        return ApiResponse<PagedResult<StockMovementDto>>.Ok(new PagedResult<StockMovementDto>
        {
            Items = items.Select(_mapper.Map<StockMovementDto>).ToList(),
            Total = total,
            Page = page,
            PageSize = pageSize
        });
    }

    // ---------------- Operations ----------------

    public async Task<ApiResponse<StockItemDto>> ReceiveAsync(ReceiveStockDto dto, Guid? userId)
    {
        var validation = await ValidateSkuAndLocationAsync(dto.SkuId, dto.ToLocationId);
        if (validation is not null) return ApiResponse<StockItemDto>.Fail(validation.Value.code, validation.Value.message);

        var to = await EnsureStockItemAsync(dto.SkuId, dto.ToLocationId);
        to.QtyOnHand += dto.Quantity;

        await RecordMovementAsync(new StockMovement
        {
            SkuId = dto.SkuId,
            ToLocationId = dto.ToLocationId,
            Quantity = dto.Quantity,
            Type = StockMovementType.Receive,
            ReferenceType = dto.ReferenceType,
            ReferenceId = dto.ReferenceId,
            UserId = userId,
            Notes = dto.Notes
        });

        await _uow.CompleteAsync();
        return await LoadStockItemDtoAsync(to.Id);
    }

    public async Task<ApiResponse<StockItemDto>> AdjustAsync(AdjustStockDto dto, Guid? userId)
    {
        if (dto.Delta == 0) return ApiResponse<StockItemDto>.Fail(400, "Delta must be non-zero.");

        var validation = await ValidateSkuAndLocationAsync(dto.SkuId, dto.LocationId);
        if (validation is not null) return ApiResponse<StockItemDto>.Fail(validation.Value.code, validation.Value.message);

        var item = await EnsureStockItemAsync(dto.SkuId, dto.LocationId);
        var newOnHand = item.QtyOnHand + dto.Delta;

        if (newOnHand < 0)
            return ApiResponse<StockItemDto>.Fail(400, $"Adjustment would push on-hand below 0 (current {item.QtyOnHand}).");
        if (newOnHand < item.QtyReserved)
            return ApiResponse<StockItemDto>.Fail(400,
                $"Adjustment would break invariant (reserved={item.QtyReserved}, new on-hand={newOnHand}).");

        item.QtyOnHand = newOnHand;

        await RecordMovementAsync(new StockMovement
        {
            SkuId = dto.SkuId,
            FromLocationId = dto.Delta < 0 ? dto.LocationId : null,
            ToLocationId = dto.Delta > 0 ? dto.LocationId : null,
            Quantity = Math.Abs(dto.Delta),
            Type = dto.Delta > 0 ? StockMovementType.AdjustIn : StockMovementType.AdjustOut,
            ReferenceType = "AdjustmentManual",
            UserId = userId,
            Notes = dto.Reason
        });

        await _uow.CompleteAsync();
        return await LoadStockItemDtoAsync(item.Id);
    }

    public async Task<ApiResponse> TransferAsync(TransferStockDto dto, Guid? userId)
    {
        if (dto.FromLocationId == dto.ToLocationId)
            return ApiResponse.Fail(400, "Source and destination locations must differ.");

        var fromCheck = await ValidateSkuAndLocationAsync(dto.SkuId, dto.FromLocationId);
        if (fromCheck is not null) return ApiResponse.Fail(fromCheck.Value.code, fromCheck.Value.message);

        var toCheck = await ValidateSkuAndLocationAsync(dto.SkuId, dto.ToLocationId);
        if (toCheck is not null) return ApiResponse.Fail(toCheck.Value.code, toCheck.Value.message);

        var from = await EnsureStockItemAsync(dto.SkuId, dto.FromLocationId);
        var to = await EnsureStockItemAsync(dto.SkuId, dto.ToLocationId);

        if (from.QtyOnHand - from.QtyReserved < dto.Quantity)
            return ApiResponse.Fail(409,
                $"Insufficient available stock at source ({from.QtyOnHand - from.QtyReserved} available).");

        from.QtyOnHand -= dto.Quantity;
        to.QtyOnHand += dto.Quantity;

        await RecordMovementAsync(new StockMovement
        {
            SkuId = dto.SkuId,
            FromLocationId = dto.FromLocationId,
            ToLocationId = dto.ToLocationId,
            Quantity = dto.Quantity,
            Type = StockMovementType.Transfer,
            ReferenceType = "Transfer",
            UserId = userId,
            Notes = dto.Notes
        });

        await _uow.CompleteAsync();
        return ApiResponse.Ok("Transfer posted.");
    }

    public async Task<ApiResponse<StockItemDto>> ReserveAsync(ReserveStockDto dto, Guid? userId)
    {
        var validation = await ValidateSkuAndLocationAsync(dto.SkuId, dto.LocationId);
        if (validation is not null) return ApiResponse<StockItemDto>.Fail(validation.Value.code, validation.Value.message);

        var item = await EnsureStockItemAsync(dto.SkuId, dto.LocationId);

        if (item.QtyOnHand - item.QtyReserved < dto.Quantity)
            return ApiResponse<StockItemDto>.Fail(409,
                $"Insufficient available stock to reserve ({item.QtyOnHand - item.QtyReserved} available).");

        item.QtyReserved += dto.Quantity;

        await RecordMovementAsync(new StockMovement
        {
            SkuId = dto.SkuId,
            FromLocationId = dto.LocationId,
            Quantity = dto.Quantity,
            Type = StockMovementType.Reserve,
            ReferenceType = dto.ReferenceType,
            ReferenceId = dto.ReferenceId,
            UserId = userId
        });

        await _uow.CompleteAsync();
        return await LoadStockItemDtoAsync(item.Id);
    }

    public async Task<ApiResponse<StockItemDto>> ReleaseAsync(ReserveStockDto dto, Guid? userId)
    {
        var item = await _uow.Repository<StockItem>()
            .FirstOrDefaultAsync(s => s.SkuId == dto.SkuId && s.LocationId == dto.LocationId);

        if (item is null)
            return ApiResponse<StockItemDto>.Fail(404, "No stock record at this SKU/location.");

        if (item.QtyReserved < dto.Quantity)
            return ApiResponse<StockItemDto>.Fail(400,
                $"Cannot release more than reserved ({item.QtyReserved} reserved).");

        item.QtyReserved -= dto.Quantity;

        await RecordMovementAsync(new StockMovement
        {
            SkuId = dto.SkuId,
            FromLocationId = dto.LocationId,
            Quantity = dto.Quantity,
            Type = StockMovementType.Release,
            ReferenceType = dto.ReferenceType,
            ReferenceId = dto.ReferenceId,
            UserId = userId
        });

        await _uow.CompleteAsync();
        return await LoadStockItemDtoAsync(item.Id);
    }

    public async Task<ApiResponse<StockItemDto>> ConfirmSaleAsync(ConfirmSaleDto dto, Guid? userId)
    {
        var item = await _uow.Repository<StockItem>()
            .FirstOrDefaultAsync(s => s.SkuId == dto.SkuId && s.LocationId == dto.LocationId);

        if (item is null)
            return ApiResponse<StockItemDto>.Fail(404, "No stock record at this SKU/location.");

        if (item.QtyReserved < dto.Quantity)
            return ApiResponse<StockItemDto>.Fail(400,
                $"Cannot confirm sale beyond reserved qty ({item.QtyReserved} reserved).");
        if (item.QtyOnHand < dto.Quantity)
            return ApiResponse<StockItemDto>.Fail(400,
                $"Cannot confirm sale beyond on-hand qty ({item.QtyOnHand} on hand).");

        item.QtyOnHand -= dto.Quantity;
        item.QtyReserved -= dto.Quantity;

        await RecordMovementAsync(new StockMovement
        {
            SkuId = dto.SkuId,
            FromLocationId = dto.LocationId,
            Quantity = dto.Quantity,
            Type = StockMovementType.Sell,
            ReferenceType = dto.ReferenceType,
            ReferenceId = dto.ReferenceId,
            UserId = userId
        });

        await _uow.CompleteAsync();
        return await LoadStockItemDtoAsync(item.Id);
    }

    // ---------------- Helpers ----------------

    private async Task<(int code, string message)?> ValidateSkuAndLocationAsync(Guid skuId, Guid locationId)
    {
        if (!await _uow.Repository<Sku>().AnyAsync(s => s.Id == skuId))
            return (400, "SKU not found.");
        if (!await _uow.Repository<Location>().AnyAsync(l => l.Id == locationId))
            return (400, "Location not found.");
        return null;
    }

    private async Task<StockItem> EnsureStockItemAsync(Guid skuId, Guid locationId)
    {
        var existing = await _uow.Repository<StockItem>()
            .FirstOrDefaultAsync(s => s.SkuId == skuId && s.LocationId == locationId);

        if (existing is not null) return existing;

        var item = new StockItem
        {
            SkuId = skuId,
            LocationId = locationId,
            QtyOnHand = 0,
            QtyReserved = 0
        };

        await _uow.Repository<StockItem>().AddAsync(item);
        return item;
    }

    private async Task RecordMovementAsync(StockMovement movement)
    {
        movement.OccurredAt = DateTime.UtcNow;
        await _uow.Repository<StockMovement>().AddAsync(movement);
    }

    private async Task<ApiResponse<StockItemDto>> LoadStockItemDtoAsync(Guid stockItemId)
    {
        var item = await _uow.Repository<StockItem>().Query()
            .Include(s => s.Sku).ThenInclude(s => s.Product)
            .Include(s => s.Location).ThenInclude(l => l.Warehouse)
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == stockItemId);

        return item is null
            ? ApiResponse<StockItemDto>.Fail(500, "Stock item could not be reloaded.")
            : ApiResponse<StockItemDto>.Ok(_mapper.Map<StockItemDto>(item));
    }
}
