using Almajd.Application.Common;
using Almajd.Application.DTOs.Inventory;

namespace Almajd.Application.Interfaces;

public interface IInventoryCountService
{
    Task<ApiResponse<IReadOnlyList<InventoryCountDto>>> ListAsync(Guid? warehouseId = null);
    Task<ApiResponse<InventoryCountDetailDto>> GetAsync(Guid id);
    Task<ApiResponse<InventoryCountDto>> CreateAsync(CreateInventoryCountDto dto);
    Task<ApiResponse<InventoryCountDto>> StartAsync(Guid id);
    Task<ApiResponse<InventoryCountDetailDto>> SetLinesAsync(Guid id, IReadOnlyList<CountLineInputDto> lines);
    Task<ApiResponse<InventoryCountDto>> PostAsync(Guid id, Guid? userId);
    Task<ApiResponse> CancelAsync(Guid id);
}
