using Almajd.Application.Common;
using Almajd.Application.DTOs.Sales;
using Almajd.Application.Interfaces;
using Almajd.Domain.Entities;
using AutoMapper;
using Microsoft.EntityFrameworkCore;

namespace Almajd.Application.Services;

public class PriceListService : IPriceListService
{
    private readonly IUnitOfWork _uow;
    private readonly IMapper _mapper;

    public PriceListService(IUnitOfWork uow, IMapper mapper)
    {
        _uow = uow;
        _mapper = mapper;
    }

    public async Task<ApiResponse<IReadOnlyList<PriceListDto>>> ListAsync(bool includeInactive = false)
    {
        IQueryable<PriceList> query = _uow.Repository<PriceList>().Query().Include(p => p.Lines);
        if (!includeInactive) query = query.Where(p => p.IsActive);

        var items = await query.OrderByDescending(p => p.IsDefault).ThenBy(p => p.Name).ToListAsync();
        return ApiResponse<IReadOnlyList<PriceListDto>>.Ok(items.Select(_mapper.Map<PriceListDto>).ToList());
    }

    public async Task<ApiResponse<PriceListDetailDto>> GetAsync(Guid id)
    {
        var pl = await _uow.Repository<PriceList>().Query()
            .Include(p => p.Lines).ThenInclude(l => l.Sku).ThenInclude(s => s.Product)
            .FirstOrDefaultAsync(p => p.Id == id);

        return pl is null
            ? ApiResponse<PriceListDetailDto>.Fail(404, "Price list not found.")
            : ApiResponse<PriceListDetailDto>.Ok(_mapper.Map<PriceListDetailDto>(pl));
    }

    public async Task<ApiResponse<PriceListDto>> CreateAsync(PriceListCreateDto dto)
    {
        if (await _uow.Repository<PriceList>().AnyAsync(p => p.Name == dto.Name))
            return ApiResponse<PriceListDto>.Fail(409, "A price list with this name already exists.");

        var priceList = new PriceList
        {
            Name = dto.Name.Trim(),
            Currency = dto.Currency,
            Tier = dto.Tier,
            IsDefault = false,
            IsActive = true
        };

        await _uow.Repository<PriceList>().AddAsync(priceList);
        await _uow.CompleteAsync();

        return ApiResponse<PriceListDto>.Created(_mapper.Map<PriceListDto>(priceList));
    }

    public async Task<ApiResponse<PriceListDto>> UpdateAsync(Guid id, PriceListUpdateDto dto)
    {
        var pl = await _uow.Repository<PriceList>().GetByIdAsync(id);
        if (pl is null) return ApiResponse<PriceListDto>.Fail(404, "Price list not found.");

        if (pl.Name != dto.Name && await _uow.Repository<PriceList>().AnyAsync(p => p.Name == dto.Name && p.Id != id))
            return ApiResponse<PriceListDto>.Fail(409, "Another price list already uses this name.");

        pl.Name = dto.Name.Trim();
        pl.Currency = dto.Currency;
        pl.Tier = dto.Tier;
        pl.IsActive = dto.IsActive;

        _uow.Repository<PriceList>().Update(pl);
        await _uow.CompleteAsync();
        return ApiResponse<PriceListDto>.Ok(_mapper.Map<PriceListDto>(pl));
    }

    public async Task<ApiResponse> DeleteAsync(Guid id)
    {
        var pl = await _uow.Repository<PriceList>().GetByIdAsync(id);
        if (pl is null) return ApiResponse.Fail(404, "Price list not found.");

        if (pl.IsDefault) return ApiResponse.Fail(409, "The default price list cannot be deleted.");

        _uow.Repository<PriceList>().SoftDelete(pl);
        await _uow.CompleteAsync();
        return ApiResponse.Ok("Price list deleted.");
    }

    public async Task<ApiResponse<PriceListLineDto>> UpsertLineAsync(Guid priceListId, PriceListLineUpsertDto dto)
    {
        if (!await _uow.Repository<PriceList>().AnyAsync(p => p.Id == priceListId))
            return ApiResponse<PriceListLineDto>.Fail(404, "Price list not found.");

        if (!await _uow.Repository<Sku>().AnyAsync(s => s.Id == dto.SkuId))
            return ApiResponse<PriceListLineDto>.Fail(400, "SKU not found.");

        var existing = await _uow.Repository<PriceListLine>()
            .FirstOrDefaultAsync(l => l.PriceListId == priceListId && l.SkuId == dto.SkuId);

        if (existing is null)
        {
            existing = new PriceListLine
            {
                PriceListId = priceListId,
                SkuId = dto.SkuId,
                UnitPrice = dto.UnitPrice,
                MinQty = dto.MinQty,
                ValidFrom = dto.ValidFrom,
                ValidTo = dto.ValidTo
            };
            await _uow.Repository<PriceListLine>().AddAsync(existing);
        }
        else
        {
            existing.UnitPrice = dto.UnitPrice;
            existing.MinQty = dto.MinQty;
            existing.ValidFrom = dto.ValidFrom;
            existing.ValidTo = dto.ValidTo;
            _uow.Repository<PriceListLine>().Update(existing);
        }

        await _uow.CompleteAsync();

        var reloaded = await _uow.Repository<PriceListLine>().Query()
            .Include(l => l.Sku).ThenInclude(s => s.Product)
            .FirstOrDefaultAsync(l => l.Id == existing.Id);

        return ApiResponse<PriceListLineDto>.Ok(_mapper.Map<PriceListLineDto>(reloaded ?? existing));
    }

    public async Task<ApiResponse> RemoveLineAsync(Guid priceListId, Guid skuId)
    {
        var line = await _uow.Repository<PriceListLine>()
            .FirstOrDefaultAsync(l => l.PriceListId == priceListId && l.SkuId == skuId);

        if (line is null) return ApiResponse.Fail(404, "Price list line not found.");

        _uow.Repository<PriceListLine>().SoftDelete(line);
        await _uow.CompleteAsync();
        return ApiResponse.Ok("Line removed.");
    }

    public async Task<ApiResponse> AssignToCustomerAsync(Guid customerId, CustomerPriceListAssignDto dto)
    {
        if (!await _uow.Repository<Customer>().AnyAsync(c => c.Id == customerId))
            return ApiResponse.Fail(404, "Customer not found.");

        if (!await _uow.Repository<PriceList>().AnyAsync(p => p.Id == dto.PriceListId))
            return ApiResponse.Fail(400, "Price list not found.");

        var existing = await _uow.Repository<CustomerPriceList>()
            .FirstOrDefaultAsync(c => c.CustomerId == customerId && c.PriceListId == dto.PriceListId);

        if (existing is null)
        {
            await _uow.Repository<CustomerPriceList>().AddAsync(new CustomerPriceList
            {
                CustomerId = customerId,
                PriceListId = dto.PriceListId,
                Priority = dto.Priority
            });
        }
        else
        {
            existing.Priority = dto.Priority;
            _uow.Repository<CustomerPriceList>().Update(existing);
        }

        await _uow.CompleteAsync();
        return ApiResponse.Ok("Price list assigned.");
    }

    public async Task<ApiResponse> UnassignFromCustomerAsync(Guid customerId, Guid priceListId)
    {
        var link = await _uow.Repository<CustomerPriceList>()
            .FirstOrDefaultAsync(c => c.CustomerId == customerId && c.PriceListId == priceListId);

        if (link is null) return ApiResponse.Fail(404, "Assignment not found.");

        _uow.Repository<CustomerPriceList>().SoftDelete(link);
        await _uow.CompleteAsync();
        return ApiResponse.Ok("Assignment removed.");
    }
}
