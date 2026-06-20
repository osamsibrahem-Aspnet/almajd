using Almajd.Application.Common;
using Almajd.Application.DTOs.Inventory;

namespace Almajd.Application.Interfaces;

public interface ILocationService
{
    Task<ApiResponse<IReadOnlyList<LocationDto>>> ListByWarehouseAsync(Guid warehouseId);
    Task<ApiResponse<LocationDto>> GetAsync(Guid id);
    Task<ApiResponse<LocationDto>> CreateAsync(LocationCreateDto dto);
    Task<ApiResponse<LocationDto>> UpdateAsync(Guid id, LocationUpdateDto dto);
    Task<ApiResponse> DeleteAsync(Guid id);
}
