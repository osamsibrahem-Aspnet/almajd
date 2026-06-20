using Almajd.Application.Common;
using Almajd.Application.DTOs.Fulfilment;
using Almajd.Application.Interfaces;
using Almajd.Domain.Entities;
using Almajd.Domain.Enums;
using AutoMapper;
using Microsoft.EntityFrameworkCore;

namespace Almajd.Application.Services;

public class PickListService : IPickListService
{
    private readonly IUnitOfWork _uow;
    private readonly IMapper _mapper;

    public PickListService(IUnitOfWork uow, IMapper mapper)
    {
        _uow = uow;
        _mapper = mapper;
    }

    public async Task<ApiResponse<PagedResult<PickListDto>>> SearchAsync(PickListSearchQuery q)
    {
        var page = Math.Max(q.Page, 1);
        var pageSize = Math.Clamp(q.PageSize, 1, 200);

        IQueryable<PickList> query = _uow.Repository<PickList>().Query()
            .Include(p => p.Order).ThenInclude(o => o.Customer)
            .Include(p => p.Lines)
            .Include(p => p.PickedBy)
            .AsNoTracking();

        if (q.Status.HasValue) query = query.Where(p => p.Status == q.Status);
        if (q.OrderId.HasValue) query = query.Where(p => p.OrderId == q.OrderId);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(p => p.GeneratedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync();

        return ApiResponse<PagedResult<PickListDto>>.Ok(new PagedResult<PickListDto>
        {
            Items = items.Select(_mapper.Map<PickListDto>).ToList(),
            Total = total,
            Page = page,
            PageSize = pageSize
        });
    }

    public async Task<ApiResponse<PickListDetailDto>> GetAsync(Guid id)
    {
        var pl = await LoadDetailQuery().FirstOrDefaultAsync(p => p.Id == id);
        return pl is null
            ? ApiResponse<PickListDetailDto>.Fail(404, "Picklist not found.")
            : ApiResponse<PickListDetailDto>.Ok(_mapper.Map<PickListDetailDto>(pl));
    }

    public async Task<ApiResponse<PickListDetailDto>> GetByOrderAsync(Guid orderId)
    {
        var pl = await LoadDetailQuery().FirstOrDefaultAsync(p => p.OrderId == orderId);
        return pl is null
            ? ApiResponse<PickListDetailDto>.Fail(404, "No picklist for this order.")
            : ApiResponse<PickListDetailDto>.Ok(_mapper.Map<PickListDetailDto>(pl));
    }

    public async Task<ApiResponse<PickListLineDto>> PickLineAsync(Guid lineId, PickLineInputDto dto, Guid? userId)
    {
        var line = await _uow.Repository<PickListLine>().Query()
            .Include(l => l.PickList)
            .Include(l => l.Sku)
            .Include(l => l.Location)
            .FirstOrDefaultAsync(l => l.Id == lineId);

        if (line is null) return ApiResponse<PickListLineDto>.Fail(404, "Picklist line not found.");

        if (line.PickList.Status is PickListStatus.Completed or PickListStatus.Cancelled or PickListStatus.ShortPicked)
            return ApiResponse<PickListLineDto>.Fail(409,
                $"Cannot pick on a {line.PickList.Status} picklist.");

        if (line.IsShort)
            return ApiResponse<PickListLineDto>.Fail(409, "Line already marked short.");

        // Scan verification
        var expectedLocation = $"{line.Location.Zone}-{line.Location.Aisle}-{line.Location.Shelf}-{line.Location.Bin}";
        if (!string.Equals(dto.ScannedSku, line.Sku.Barcode, StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(dto.ScannedSku, line.Sku.Code, StringComparison.OrdinalIgnoreCase))
            return ApiResponse<PickListLineDto>.Fail(409,
                $"Scanned SKU '{dto.ScannedSku}' does not match expected '{line.Sku.Code}/{line.Sku.Barcode}'.");

        if (!string.Equals(dto.ScannedLocation.Replace(" ", ""), expectedLocation.Replace(" ", ""),
                StringComparison.OrdinalIgnoreCase))
            return ApiResponse<PickListLineDto>.Fail(409,
                $"Scanned location '{dto.ScannedLocation}' does not match expected '{expectedLocation}'.");

        if (dto.Qty <= 0)
            return ApiResponse<PickListLineDto>.Fail(400, "Picked qty must be positive.");
        if (line.PickedQty + dto.Qty > line.RequestedQty)
            return ApiResponse<PickListLineDto>.Fail(400,
                $"Picked qty would exceed requested ({line.RequestedQty}).");

        line.PickedQty += dto.Qty;

        if (line.PickList.Status == PickListStatus.Pending)
        {
            line.PickList.Status = PickListStatus.InProgress;
            line.PickList.PickedByUserId = userId;
            _uow.Repository<PickList>().Update(line.PickList);
        }

        _uow.Repository<PickListLine>().Update(line);
        await _uow.CompleteAsync();

        return ApiResponse<PickListLineDto>.Ok(_mapper.Map<PickListLineDto>(line));
    }

    public async Task<ApiResponse<PickListLineDto>> MarkShortAsync(Guid lineId, MarkShortInputDto dto, Guid? userId)
    {
        var line = await _uow.Repository<PickListLine>().Query()
            .Include(l => l.PickList)
            .Include(l => l.Sku)
            .Include(l => l.Location)
            .FirstOrDefaultAsync(l => l.Id == lineId);

        if (line is null) return ApiResponse<PickListLineDto>.Fail(404, "Picklist line not found.");

        if (line.PickList.Status is PickListStatus.Completed or PickListStatus.Cancelled or PickListStatus.ShortPicked)
            return ApiResponse<PickListLineDto>.Fail(409,
                $"Cannot mark short on a {line.PickList.Status} picklist.");

        line.IsShort = true;
        line.ShortReason = dto.Reason;

        if (line.PickList.Status == PickListStatus.Pending)
        {
            line.PickList.Status = PickListStatus.InProgress;
            line.PickList.PickedByUserId = userId;
            _uow.Repository<PickList>().Update(line.PickList);
        }

        _uow.Repository<PickListLine>().Update(line);
        await _uow.CompleteAsync();

        return ApiResponse<PickListLineDto>.Ok(_mapper.Map<PickListLineDto>(line));
    }

    public async Task<ApiResponse<PickListDetailDto>> CompleteAsync(Guid id, Guid? userId)
    {
        var pl = await _uow.Repository<PickList>().Query()
            .Include(p => p.Order)
            .Include(p => p.Lines)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (pl is null) return ApiResponse<PickListDetailDto>.Fail(404, "Picklist not found.");

        if (pl.Status is PickListStatus.Completed or PickListStatus.ShortPicked)
            return ApiResponse<PickListDetailDto>.Fail(409, $"Picklist is already {pl.Status}.");

        if (pl.Status == PickListStatus.Cancelled)
            return ApiResponse<PickListDetailDto>.Fail(409, "Picklist is cancelled.");

        var allHandled = pl.Lines.All(l => l.PickedQty >= l.RequestedQty || l.IsShort);
        if (!allHandled)
            return ApiResponse<PickListDetailDto>.Fail(400,
                "All lines must be fully picked or explicitly marked short before completion.");

        var anyShort = pl.Lines.Any(l => l.IsShort);
        pl.Status = anyShort ? PickListStatus.ShortPicked : PickListStatus.Completed;
        pl.CompletedAt = DateTime.UtcNow;
        pl.PickedByUserId ??= userId;

        // Order moves to ReadyToShip when picklist is finalized.
        pl.Order.Status = OrderStatus.ReadyToShip;

        _uow.Repository<PickList>().Update(pl);
        _uow.Repository<Order>().Update(pl.Order);
        await _uow.CompleteAsync();

        return await GetAsync(id);
    }

    public async Task<ApiResponse> CancelAsync(Guid id)
    {
        var pl = await _uow.Repository<PickList>().GetByIdAsync(id);
        if (pl is null) return ApiResponse.Fail(404, "Picklist not found.");

        if (pl.Status is PickListStatus.Completed or PickListStatus.ShortPicked)
            return ApiResponse.Fail(409, $"Cannot cancel a {pl.Status} picklist.");

        pl.Status = PickListStatus.Cancelled;
        _uow.Repository<PickList>().Update(pl);
        await _uow.CompleteAsync();
        return ApiResponse.Ok("Picklist cancelled.");
    }

    private IQueryable<PickList> LoadDetailQuery() =>
        _uow.Repository<PickList>().Query()
            .Include(p => p.Order).ThenInclude(o => o.Customer)
            .Include(p => p.PickedBy)
            .Include(p => p.Lines).ThenInclude(l => l.Sku).ThenInclude(s => s.Product)
            .Include(p => p.Lines).ThenInclude(l => l.Location);
}
