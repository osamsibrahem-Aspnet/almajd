using Almajd.Application.Common;
using Almajd.Application.DTOs.Fulfilment;

namespace Almajd.Application.Interfaces;

public interface IShipmentService
{
    Task<ApiResponse<PagedResult<ShipmentDto>>> SearchAsync(ShipmentSearchQuery query);
    Task<ApiResponse<ShipmentDto>> GetAsync(Guid id);
    Task<ApiResponse<ShipmentDto>> GetByNumberAsync(string number);

    Task<ApiResponse<ShipmentDto>> CreateAsync(ShipmentCreateDto dto);
    Task<ApiResponse<ShipmentDto>> AssignDriverAsync(Guid id, AssignDriverDto dto);
    Task<ApiResponse<ShipmentDto>> DispatchAsync(Guid id, Guid? userId);
    Task<ApiResponse<ShipmentDto>> DeliverAsync(Guid id, DeliverDto dto, Guid? userId);
    Task<ApiResponse<ShipmentDto>> CancelAsync(Guid id, CancelShipmentDto dto, Guid? userId);
}
