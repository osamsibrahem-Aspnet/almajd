using Almajd.Application.Common;
using Almajd.Application.DTOs.Purchasing;
using Almajd.Application.Interfaces;
using Almajd.Domain.Entities;
using AutoMapper;
using Microsoft.EntityFrameworkCore;

namespace Almajd.Application.Services;

public class SupplierService : ISupplierService
{
    private readonly IUnitOfWork _uow;
    private readonly IMapper _mapper;

    public SupplierService(IUnitOfWork uow, IMapper mapper)
    {
        _uow = uow;
        _mapper = mapper;
    }

    public async Task<ApiResponse<PagedResult<SupplierDto>>> SearchAsync(SupplierSearchQuery q)
    {
        var page = Math.Max(q.Page, 1);
        var pageSize = Math.Clamp(q.PageSize, 1, 200);

        IQueryable<Supplier> query = _uow.Repository<Supplier>().Query().Include(s => s.SuppliedSkus).AsNoTracking();

        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var term = $"%{q.Search.Trim()}%";
            query = query.Where(s =>
                EF.Functions.Like(s.Code, term) ||
                EF.Functions.Like(s.Name, term) ||
                (s.ContactPerson != null && EF.Functions.Like(s.ContactPerson, term)) ||
                (s.Phone != null && EF.Functions.Like(s.Phone, term)));
        }

        if (q.IsActive.HasValue) query = query.Where(s => s.IsActive == q.IsActive);

        var total = await query.CountAsync();
        var items = await query
            .OrderBy(s => s.Name)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync();

        return ApiResponse<PagedResult<SupplierDto>>.Ok(new PagedResult<SupplierDto>
        {
            Items = items.Select(_mapper.Map<SupplierDto>).ToList(),
            Total = total,
            Page = page,
            PageSize = pageSize
        });
    }

    public async Task<ApiResponse<SupplierDto>> GetAsync(Guid id)
    {
        var s = await _uow.Repository<Supplier>().Query()
            .Include(x => x.SuppliedSkus)
            .FirstOrDefaultAsync(x => x.Id == id);

        return s is null
            ? ApiResponse<SupplierDto>.Fail(404, "Supplier not found.")
            : ApiResponse<SupplierDto>.Ok(_mapper.Map<SupplierDto>(s));
    }

    public async Task<ApiResponse<SupplierDto>> CreateAsync(SupplierCreateDto dto)
    {
        var supplier = new Supplier
        {
            Code =await NextSupplierCodeAsync(),
            Name = dto.Name.Trim(),
            TaxId = dto.TaxId?.Trim(),
            Phone = dto.Phone?.Trim(),
            Email = dto.Email?.Trim(),
            Address = dto.Address?.Trim(),
            ContactPerson = dto.ContactPerson?.Trim(),
            PaymentTermsNetDays = dto.PaymentTermsNetDays,
            Currency = dto.Currency,
            IsActive = true
        };

        await _uow.Repository<Supplier>().AddAsync(supplier);
        await _uow.CompleteAsync();

        return ApiResponse<SupplierDto>.Created(_mapper.Map<SupplierDto>(supplier));
    }

    public async Task<ApiResponse<SupplierDto>> UpdateAsync(Guid id, SupplierUpdateDto dto)
    {
        var s = await _uow.Repository<Supplier>().GetByIdAsync(id);
        if (s is null) return ApiResponse<SupplierDto>.Fail(404, "Supplier not found.");

        s.Name = dto.Name.Trim();
        s.TaxId = dto.TaxId?.Trim();
        s.Phone = dto.Phone?.Trim();
        s.Email = dto.Email?.Trim();
        s.Address = dto.Address?.Trim();
        s.ContactPerson = dto.ContactPerson?.Trim();
        s.PaymentTermsNetDays = dto.PaymentTermsNetDays;
        s.Currency = dto.Currency;
        s.IsActive = dto.IsActive;

        _uow.Repository<Supplier>().Update(s);
        await _uow.CompleteAsync();
        return await GetAsync(id);
    }

    public async Task<ApiResponse> DeleteAsync(Guid id)
    {
        var s = await _uow.Repository<Supplier>().GetByIdAsync(id);
        if (s is null) return ApiResponse.Fail(404, "Supplier not found.");

        if (await _uow.Repository<PurchaseOrder>().AnyAsync(p => p.SupplierId == id))
            return ApiResponse.Fail(409, "Supplier has purchase orders. Deactivate instead.");

        _uow.Repository<Supplier>().SoftDelete(s);
        await _uow.CompleteAsync();
        return ApiResponse.Ok("Supplier deleted.");
    }

    public async Task<ApiResponse<IReadOnlyList<SupplierSkuDto>>> ListSkusAsync(Guid supplierId)
    {
        if (!await _uow.Repository<Supplier>().AnyAsync(s => s.Id == supplierId))
            return ApiResponse<IReadOnlyList<SupplierSkuDto>>.Fail(404, "Supplier not found.");

        var items = await _uow.Repository<SupplierSku>().Query()
            .Include(s => s.Supplier)
            .Include(s => s.Sku).ThenInclude(sk => sk.Product)
            .Where(s => s.SupplierId == supplierId)
            .OrderByDescending(s => s.IsPreferred).ThenBy(s => s.Sku.Code)
            .ToListAsync();

        return ApiResponse<IReadOnlyList<SupplierSkuDto>>.Ok(items.Select(_mapper.Map<SupplierSkuDto>).ToList());
    }

    public async Task<ApiResponse<SupplierSkuDto>> UpsertSkuAsync(Guid supplierId, SupplierSkuUpsertDto dto)
    {
        if (!await _uow.Repository<Supplier>().AnyAsync(s => s.Id == supplierId))
            return ApiResponse<SupplierSkuDto>.Fail(404, "Supplier not found.");
        if (!await _uow.Repository<Sku>().AnyAsync(s => s.Id == dto.SkuId))
            return ApiResponse<SupplierSkuDto>.Fail(400, "SKU not found.");

        if (dto.IsPreferred)
        {
            // Demote all other preferred entries for this SKU
            var others = await _uow.Repository<SupplierSku>()
                .FindAsync(x => x.SkuId == dto.SkuId && x.IsPreferred);
            foreach (var o in others)
            {
                o.IsPreferred = false;
                _uow.Repository<SupplierSku>().Update(o);
            }
        }

        var existing = await _uow.Repository<SupplierSku>()
            .FirstOrDefaultAsync(s => s.SupplierId == supplierId && s.SkuId == dto.SkuId);

        if (existing is null)
        {
            existing = new SupplierSku
            {
                SupplierId = supplierId,
                SkuId = dto.SkuId,
                SupplierSkuCode = dto.SupplierSkuCode,
                LeadTimeDays = dto.LeadTimeDays,
                CostPrice = dto.CostPrice,
                Currency = dto.Currency,
                IsPreferred = dto.IsPreferred
            };
            await _uow.Repository<SupplierSku>().AddAsync(existing);
        }
        else
        {
            existing.SupplierSkuCode = dto.SupplierSkuCode;
            existing.LeadTimeDays = dto.LeadTimeDays;
            existing.CostPrice = dto.CostPrice;
            existing.Currency = dto.Currency;
            existing.IsPreferred = dto.IsPreferred;
            _uow.Repository<SupplierSku>().Update(existing);
        }

        await _uow.CompleteAsync();

        var reloaded = await _uow.Repository<SupplierSku>().Query()
            .Include(s => s.Supplier)
            .Include(s => s.Sku).ThenInclude(sk => sk.Product)
            .FirstOrDefaultAsync(s => s.Id == existing.Id);

        return ApiResponse<SupplierSkuDto>.Ok(_mapper.Map<SupplierSkuDto>(reloaded ?? existing));
    }

    public async Task<ApiResponse> RemoveSkuAsync(Guid supplierId, Guid skuId)
    {
        var link = await _uow.Repository<SupplierSku>()
            .FirstOrDefaultAsync(s => s.SupplierId == supplierId && s.SkuId == skuId);

        if (link is null) return ApiResponse.Fail(404, "Supplier SKU link not found.");

        _uow.Repository<SupplierSku>().SoftDelete(link);
        await _uow.CompleteAsync();
        return ApiResponse.Ok("Supplier SKU link removed.");
    }

    public async Task<ApiResponse<IReadOnlyList<SupplierPriceCompareItemDto>>> CompareSuppliersForSkuAsync(Guid skuId)
    {
        if (!await _uow.Repository<Sku>().AnyAsync(s => s.Id == skuId))
            return ApiResponse<IReadOnlyList<SupplierPriceCompareItemDto>>.Fail(404, "SKU not found.");

        var items = await _uow.Repository<SupplierSku>().Query()
            .Include(s => s.Supplier)
            .Where(s => s.SkuId == skuId && s.Supplier.IsActive)
            .OrderBy(s => s.CostPrice)
            .Select(s => new SupplierPriceCompareItemDto
            {
                SupplierId = s.SupplierId,
                SupplierName = s.Supplier.Name,
                SupplierSkuCode = s.SupplierSkuCode,
                LeadTimeDays = s.LeadTimeDays,
                CostPrice = s.CostPrice,
                Currency = s.Currency,
                IsPreferred = s.IsPreferred
            })
            .ToListAsync();

        return ApiResponse<IReadOnlyList<SupplierPriceCompareItemDto>>.Ok(items);
    }

    private async Task<string> NextSupplierCodeAsync()
    {
        var lastCode = await _uow.Repository<Supplier>().Query()
            .OrderByDescending(s => s.Code)
            .Select(s => s.Code)
            .FirstOrDefaultAsync();

        var nextNum = 1;
        if (!string.IsNullOrWhiteSpace(lastCode) && lastCode.StartsWith("SUP-") &&
            int.TryParse(lastCode.AsSpan(4), out var parsed))
        {
            nextNum = parsed + 1;
        }

        return $"SUP-{nextNum:D5}";
    }
}
