using Almajd.Application.Common;
using Almajd.Application.DTOs.Inventory;
using Almajd.Application.Interfaces;
using Almajd.Domain.Entities;
using AutoMapper;
using Microsoft.EntityFrameworkCore;

namespace Almajd.Application.Services;

public class LocationService : ILocationService
{
    private readonly IUnitOfWork _uow;
    private readonly IMapper _mapper;

    public LocationService(IUnitOfWork uow, IMapper mapper)
    {
        _uow = uow;
        _mapper = mapper;
    }

    public async Task<ApiResponse<IReadOnlyList<LocationDto>>> ListByWarehouseAsync(Guid warehouseId)
    {
        var items = await _uow.Repository<Location>().Query()
            .Include(l => l.Warehouse)
            .Where(l => l.WarehouseId == warehouseId)
            .OrderBy(l => l.Zone).ThenBy(l => l.Aisle).ThenBy(l => l.Shelf).ThenBy(l => l.Bin)
            .ToListAsync();

        return ApiResponse<IReadOnlyList<LocationDto>>.Ok(items.Select(_mapper.Map<LocationDto>).ToList());
    }

    public async Task<ApiResponse<LocationDto>> GetAsync(Guid id)
    {
        var loc = await _uow.Repository<Location>().Query()
            .Include(l => l.Warehouse)
            .FirstOrDefaultAsync(l => l.Id == id);

        return loc is null
            ? ApiResponse<LocationDto>.Fail(404, "Location not found.")
            : ApiResponse<LocationDto>.Ok(_mapper.Map<LocationDto>(loc));
    }

    public async Task<ApiResponse<LocationDto>> CreateAsync(LocationCreateDto dto)
    {
        if (!await _uow.Repository<Warehouse>().AnyAsync(w => w.Id == dto.WarehouseId))
            return ApiResponse<LocationDto>.Fail(400, "Warehouse not found.");

        var zone = dto.Zone.Trim().ToUpperInvariant();
        var aisle = dto.Aisle.Trim().ToUpperInvariant();
        var shelf = dto.Shelf.Trim().ToUpperInvariant();
        var bin = dto.Bin.Trim().ToUpperInvariant();

        if (await _uow.Repository<Location>().AnyAsync(l =>
                l.WarehouseId == dto.WarehouseId &&
                l.Zone == zone && l.Aisle == aisle && l.Shelf == shelf && l.Bin == bin))
            return ApiResponse<LocationDto>.Fail(409, "This location already exists in the warehouse.");

        var location = new Location
        {
            WarehouseId = dto.WarehouseId,
            Zone = zone,
            Aisle = aisle,
            Shelf = shelf,
            Bin = bin,
            IsPickable = dto.IsPickable
        };

        await _uow.Repository<Location>().AddAsync(location);
        await _uow.CompleteAsync();

        return await GetAsync(location.Id) is { IsSuccess: true } loaded
            ? ApiResponse<LocationDto>.Created(loaded.Data!)
            : ApiResponse<LocationDto>.Fail(500, "Created but failed to reload.");
    }

    public async Task<ApiResponse<LocationDto>> UpdateAsync(Guid id, LocationUpdateDto dto)
    {
        var location = await _uow.Repository<Location>().GetByIdAsync(id);
        if (location is null) return ApiResponse<LocationDto>.Fail(404, "Location not found.");

        if (!await _uow.Repository<Warehouse>().AnyAsync(w => w.Id == dto.WarehouseId))
            return ApiResponse<LocationDto>.Fail(400, "Warehouse not found.");

        var zone = dto.Zone.Trim().ToUpperInvariant();
        var aisle = dto.Aisle.Trim().ToUpperInvariant();
        var shelf = dto.Shelf.Trim().ToUpperInvariant();
        var bin = dto.Bin.Trim().ToUpperInvariant();

        var changed = location.WarehouseId != dto.WarehouseId
            || location.Zone != zone || location.Aisle != aisle
            || location.Shelf != shelf || location.Bin != bin;

        if (changed && await _uow.Repository<Location>().AnyAsync(l =>
                l.Id != id &&
                l.WarehouseId == dto.WarehouseId &&
                l.Zone == zone && l.Aisle == aisle && l.Shelf == shelf && l.Bin == bin))
            return ApiResponse<LocationDto>.Fail(409, "Another location already uses this address.");

        location.WarehouseId = dto.WarehouseId;
        location.Zone = zone;
        location.Aisle = aisle;
        location.Shelf = shelf;
        location.Bin = bin;
        location.IsPickable = dto.IsPickable;

        _uow.Repository<Location>().Update(location);
        await _uow.CompleteAsync();

        return await GetAsync(id);
    }

    public async Task<ApiResponse> DeleteAsync(Guid id)
    {
        var location = await _uow.Repository<Location>().GetByIdAsync(id);
        if (location is null) return ApiResponse.Fail(404, "Location not found.");

        var hasStock = await _uow.Repository<StockItem>().AnyAsync(s =>
            s.LocationId == id && (s.QtyOnHand > 0 || s.QtyReserved > 0));

        if (hasStock) return ApiResponse.Fail(409, "Location holds stock. Move it before deleting.");

        _uow.Repository<Location>().SoftDelete(location);
        await _uow.CompleteAsync();
        return ApiResponse.Ok("Location deleted.");
    }
}
