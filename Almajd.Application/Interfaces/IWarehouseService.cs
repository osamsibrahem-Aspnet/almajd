using Almajd.Application.Common;
using Almajd.Application.DTOs.Inventory;

namespace Almajd.Application.Interfaces;

public interface IWarehouseService
{
    Task<ApiResponse<IReadOnlyList<WarehouseDto>>> ListAsync(bool includeInactive = false);
    Task<ApiResponse<WarehouseDto>> GetAsync(Guid id);
    Task<ApiResponse<WarehouseDto>> CreateAsync(WarehouseCreateDto dto);
    Task<ApiResponse<WarehouseDto>> UpdateAsync(Guid id, WarehouseUpdateDto dto);
    Task<ApiResponse> DeleteAsync(Guid id);
}
