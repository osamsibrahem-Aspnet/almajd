using Almajd.Application.Common;
using Almajd.Application.DTOs.Purchasing;
using Almajd.Application.Interfaces;
using Almajd.Domain.Entities;
using Almajd.Domain.Enums;
using AutoMapper;
using Microsoft.EntityFrameworkCore;

namespace Almajd.Application.Services;

public class PurchaseOrderService : IPurchaseOrderService
{
    private readonly IUnitOfWork _uow;
    private readonly IMapper _mapper;

    public PurchaseOrderService(IUnitOfWork uow, IMapper mapper)
    {
        _uow = uow;
        _mapper = mapper;
    }

    public async Task<ApiResponse<PagedResult<PurchaseOrderListItemDto>>> SearchAsync(PurchaseOrderSearchQuery q)
    {
        var page = Math.Max(q.Page, 1);
        var pageSize = Math.Clamp(q.PageSize, 1, 200);

        IQueryable<PurchaseOrder> query = _uow.Repository<PurchaseOrder>().Query()
            .Include(p => p.Supplier)
            .Include(p => p.Lines)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var term = $"%{q.Search.Trim()}%";
            query = query.Where(p =>
                EF.Functions.Like(p.Number, term) ||
                EF.Functions.Like(p.Supplier.Name, term));
        }

        if (q.SupplierId.HasValue) query = query.Where(p => p.SupplierId == q.SupplierId);
        if (q.Status.HasValue) query = query.Where(p => p.Status == q.Status);
        if (q.From.HasValue) query = query.Where(p => p.CreatedAt >= q.From);
        if (q.To.HasValue) query = query.Where(p => p.CreatedAt <= q.To);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync();

        return ApiResponse<PagedResult<PurchaseOrderListItemDto>>.Ok(new PagedResult<PurchaseOrderListItemDto>
        {
            Items = items.Select(_mapper.Map<PurchaseOrderListItemDto>).ToList(),
            Total = total,
            Page = page,
            PageSize = pageSize
        });
    }

    public async Task<ApiResponse<PurchaseOrderDto>> GetAsync(Guid id)
    {
        var po = await LoadDetailQuery().FirstOrDefaultAsync(p => p.Id == id);
        return po is null
            ? ApiResponse<PurchaseOrderDto>.Fail(404, "Purchase order not found.")
            : ApiResponse<PurchaseOrderDto>.Ok(_mapper.Map<PurchaseOrderDto>(po));
    }

    public async Task<ApiResponse<PurchaseOrderDto>> GetByNumberAsync(string number)
    {
        var normalized = number.Trim().ToUpperInvariant();
        var po = await LoadDetailQuery().FirstOrDefaultAsync(p => p.Number == normalized);
        return po is null
            ? ApiResponse<PurchaseOrderDto>.Fail(404, "Purchase order not found.")
            : ApiResponse<PurchaseOrderDto>.Ok(_mapper.Map<PurchaseOrderDto>(po));
    }

    public async Task<ApiResponse<PurchaseOrderDto>> CreateDraftAsync(PurchaseOrderCreateDto dto)
    {
        var supplier = await _uow.Repository<Supplier>().GetByIdAsync(dto.SupplierId);
        if (supplier is null) return ApiResponse<PurchaseOrderDto>.Fail(400, "Supplier not found.");
        if (!supplier.IsActive) return ApiResponse<PurchaseOrderDto>.Fail(409, "Supplier is inactive.");

        var po = new PurchaseOrder
        {
            Number = await NextPoNumberAsync(),
            SupplierId = dto.SupplierId,
            Status = PurchaseOrderStatus.Draft,
            Currency = supplier.Currency,
            ExpectedAt = dto.ExpectedAt,
            Notes = dto.Notes
        };

        var validation = await ApplyLinesAsync(po, dto.Lines);
        if (!validation.IsSuccess) return ApiResponse<PurchaseOrderDto>.Fail(validation.StatusCode, validation.Message!);

        await _uow.Repository<PurchaseOrder>().AddAsync(po);
        await _uow.CompleteAsync();

        return await GetAsync(po.Id) is { IsSuccess: true } loaded
            ? ApiResponse<PurchaseOrderDto>.Created(loaded.Data!)
            : ApiResponse<PurchaseOrderDto>.Fail(500, "PO created but failed to reload.");
    }

    public async Task<ApiResponse<PurchaseOrderDto>> UpdateDraftAsync(Guid id, PurchaseOrderUpdateDraftDto dto)
    {
        var po = await _uow.Repository<PurchaseOrder>().Query()
            .Include(p => p.Lines)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (po is null) return ApiResponse<PurchaseOrderDto>.Fail(404, "PO not found.");
        if (po.Status != PurchaseOrderStatus.Draft)
            return ApiResponse<PurchaseOrderDto>.Fail(409, $"Only Draft POs can be edited (current: {po.Status}).");

        po.ExpectedAt = dto.ExpectedAt;
        po.Notes = dto.Notes;

        foreach (var existing in po.Lines.ToList())
            _uow.Repository<PurchaseOrderLine>().SoftDelete(existing);
        po.Lines.Clear();

        var validation = await ApplyLinesAsync(po, dto.Lines);
        if (!validation.IsSuccess) return ApiResponse<PurchaseOrderDto>.Fail(validation.StatusCode, validation.Message!);

        _uow.Repository<PurchaseOrder>().Update(po);
        await _uow.CompleteAsync();

        return await GetAsync(id);
    }

    public async Task<ApiResponse<PurchaseOrderDto>> SubmitAsync(Guid id)
    {
        var po = await _uow.Repository<PurchaseOrder>().Query()
            .Include(p => p.Lines)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (po is null) return ApiResponse<PurchaseOrderDto>.Fail(404, "PO not found.");
        if (po.Status != PurchaseOrderStatus.Draft)
            return ApiResponse<PurchaseOrderDto>.Fail(409, $"Only Draft POs can be submitted (current: {po.Status}).");
        if (po.Lines.Count == 0)
            return ApiResponse<PurchaseOrderDto>.Fail(400, "PO has no lines.");

        po.Status = PurchaseOrderStatus.Submitted;
        po.SubmittedAt = DateTime.UtcNow;

        _uow.Repository<PurchaseOrder>().Update(po);
        await _uow.CompleteAsync();

        return await GetAsync(id);
    }

    public async Task<ApiResponse<PurchaseOrderDto>> ApproveAsync(Guid id, Guid? userId)
    {
        var po = await _uow.Repository<PurchaseOrder>().GetByIdAsync(id);
        if (po is null) return ApiResponse<PurchaseOrderDto>.Fail(404, "PO not found.");

        if (po.Status != PurchaseOrderStatus.Submitted)
            return ApiResponse<PurchaseOrderDto>.Fail(409, $"Only Submitted POs can be approved (current: {po.Status}).");

        po.Status = PurchaseOrderStatus.Approved;
        po.ApprovedAt = DateTime.UtcNow;
        po.ApprovedByUserId = userId;

        _uow.Repository<PurchaseOrder>().Update(po);
        await _uow.CompleteAsync();

        return await GetAsync(id);
    }

    public async Task<ApiResponse<PurchaseOrderDto>> CancelAsync(Guid id, CancelPurchaseOrderDto dto)
    {
        var po = await _uow.Repository<PurchaseOrder>().Query()
            .Include(p => p.Lines)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (po is null) return ApiResponse<PurchaseOrderDto>.Fail(404, "PO not found.");

        if (po.Status is PurchaseOrderStatus.FullyReceived or PurchaseOrderStatus.Cancelled)
            return ApiResponse<PurchaseOrderDto>.Fail(409, $"PO in state {po.Status} cannot be cancelled.");

        if (po.Lines.Any(l => l.ReceivedQty > 0))
            return ApiResponse<PurchaseOrderDto>.Fail(409,
                "PO has received goods; create a Purchase Return instead (Phase 2).");

        po.Status = PurchaseOrderStatus.Cancelled;
        po.CancelledAt = DateTime.UtcNow;
        po.CancellationReason = dto.Reason;

        _uow.Repository<PurchaseOrder>().Update(po);
        await _uow.CompleteAsync();

        return await GetAsync(id);
    }

    // ---- helpers ----

    private IQueryable<PurchaseOrder> LoadDetailQuery() =>
        _uow.Repository<PurchaseOrder>().Query()
            .Include(p => p.Supplier)
            .Include(p => p.ApprovedBy)
            .Include(p => p.Lines).ThenInclude(l => l.Sku).ThenInclude(s => s.Product);

    private async Task<ApiResponse> ApplyLinesAsync(PurchaseOrder po, IReadOnlyList<PurchaseOrderLineInputDto> inputs)
    {
        decimal total = 0;
        foreach (var input in inputs)
        {
            if (!await _uow.Repository<Sku>().AnyAsync(s => s.Id == input.SkuId))
                return ApiResponse.Fail(400, $"SKU {input.SkuId} not found.");

            po.Lines.Add(new PurchaseOrderLine
            {
                SkuId = input.SkuId,
                Qty = input.Qty,
                CostPrice = input.CostPrice,
                ReceivedQty = 0
            });

            total += input.Qty * input.CostPrice;
        }

        po.Total = total;
        return ApiResponse.Ok();
    }

    private async Task<string> NextPoNumberAsync()
    {
        var year = DateTime.UtcNow.Year;
        var prefix = $"PO-{year}-";

        var last = await _uow.Repository<PurchaseOrder>().Query()
            .Where(p => p.Number.StartsWith(prefix))
            .OrderByDescending(p => p.Number)
            .Select(p => p.Number)
            .FirstOrDefaultAsync();

        var next = 1;
        if (!string.IsNullOrWhiteSpace(last) && int.TryParse(last.AsSpan(prefix.Length), out var parsed))
            next = parsed + 1;

        return $"{prefix}{next:D6}";
    }
}
