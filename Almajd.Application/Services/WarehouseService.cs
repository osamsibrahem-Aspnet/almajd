using Almajd.Application.Common;
using Almajd.Application.DTOs.Inventory;
using Almajd.Application.Interfaces;
using Almajd.Domain.Entities;
using AutoMapper;
using Microsoft.EntityFrameworkCore;

namespace Almajd.Application.Services;

public class WarehouseService : IWarehouseService
{
    private readonly IUnitOfWork _uow;
    private readonly IMapper _mapper;

    public WarehouseService(IUnitOfWork uow, IMapper mapper)
    {
        _uow = uow;
        _mapper = mapper;
    }

    public async Task<ApiResponse<IReadOnlyList<WarehouseDto>>> ListAsync(bool includeInactive = false)
    {
        IQueryable<Warehouse> query = _uow.Repository<Warehouse>().Query().Include(w => w.Locations);

        if (!includeInactive) query = query.Where(w => w.IsActive);

        var items = await query.OrderBy(w => w.Code).ToListAsync();
        return ApiResponse<IReadOnlyList<WarehouseDto>>.Ok(items.Select(_mapper.Map<WarehouseDto>).ToList());
    }

    public async Task<ApiResponse<WarehouseDto>> GetAsync(Guid id)
    {
        var w = await _uow.Repository<Warehouse>().Query()
            .Include(x => x.Locations)
            .FirstOrDefaultAsync(x => x.Id == id);

        return w is null
            ? ApiResponse<WarehouseDto>.Fail(404, "Warehouse not found.")
            : ApiResponse<WarehouseDto>.Ok(_mapper.Map<WarehouseDto>(w));
    }

    public async Task<ApiResponse<WarehouseDto>> CreateAsync(WarehouseCreateDto dto)
    {
        var code = dto.Code.Trim().ToUpperInvariant();
        if (await _uow.Repository<Warehouse>().AnyAsync(w => w.Code == code))
            return ApiResponse<WarehouseDto>.Fail(409, "A warehouse with this code already exists.");

        var warehouse = new Warehouse
        {
            Code = code,
            Name = dto.Name.Trim(),
            Address = dto.Address,
            IsActive = true
        };

        await _uow.Repository<Warehouse>().AddAsync(warehouse);
        await _uow.CompleteAsync();

        return ApiResponse<WarehouseDto>.Created(_mapper.Map<WarehouseDto>(warehouse));
    }

    public async Task<ApiResponse<WarehouseDto>> UpdateAsync(Guid id, WarehouseUpdateDto dto)
    {
        var warehouse = await _uow.Repository<Warehouse>().GetByIdAsync(id);
        if (warehouse is null) return ApiResponse<WarehouseDto>.Fail(404, "Warehouse not found.");

        var newCode = dto.Code.Trim().ToUpperInvariant();
        if (newCode != warehouse.Code &&
            await _uow.Repository<Warehouse>().AnyAsync(w => w.Code == newCode && w.Id != id))
            return ApiResponse<WarehouseDto>.Fail(409, "Another warehouse already uses this code.");

        warehouse.Code = newCode;
        warehouse.Name = dto.Name.Trim();
        warehouse.Address = dto.Address;
        warehouse.IsActive = dto.IsActive;

        _uow.Repository<Warehouse>().Update(warehouse);
        await _uow.CompleteAsync();

        return await GetAsync(id);
    }

    public async Task<ApiResponse> DeleteAsync(Guid id)
    {
        var warehouse = await _uow.Repository<Warehouse>().GetByIdAsync(id);
        if (warehouse is null) return ApiResponse.Fail(404, "Warehouse not found.");

        if (await _uow.Repository<Location>().AnyAsync(l => l.WarehouseId == id))
            return ApiResponse.Fail(409, "Warehouse has locations. Deactivate it or move locations first.");

        _uow.Repository<Warehouse>().SoftDelete(warehouse);
        await _uow.CompleteAsync();
        return ApiResponse.Ok("Warehouse deleted.");
    }
}
