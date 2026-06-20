using Almajd.Application.Common;
using Almajd.Application.DTOs.Sales;

namespace Almajd.Application.Interfaces;

public interface IOrderService
{
    Task<ApiResponse<PagedResult<OrderListItemDto>>> SearchAsync(OrderSearchQuery query);
    Task<ApiResponse<OrderDto>> GetAsync(Guid id);
    Task<ApiResponse<OrderDto>> GetByNumberAsync(string number);

    Task<ApiResponse<OrderDto>> CreateDraftAsync(OrderCreateDto dto, Guid? salesRepId);
    Task<ApiResponse<OrderDto>> UpdateDraftAsync(Guid id, OrderUpdateDraftDto dto);
    Task<ApiResponse<OrderDto>> SubmitAsync(Guid id, Guid? userId);
    Task<ApiResponse<OrderDto>> ApproveAsync(Guid id, Guid? userId);
    Task<ApiResponse<OrderDto>> CancelAsync(Guid id, CancelOrderDto dto, Guid? userId);
    Task<ApiResponse<OrderDto>> ReorderAsync(Guid sourceOrderId, Guid? salesRepId);
}
