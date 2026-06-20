using Almajd.Application.Common;
using Almajd.Application.DTOs.Purchasing;

namespace Almajd.Application.Interfaces;

public interface IPurchaseOrderService
{
    Task<ApiResponse<PagedResult<PurchaseOrderListItemDto>>> SearchAsync(PurchaseOrderSearchQuery query);
    Task<ApiResponse<PurchaseOrderDto>> GetAsync(Guid id);
    Task<ApiResponse<PurchaseOrderDto>> GetByNumberAsync(string number);

    Task<ApiResponse<PurchaseOrderDto>> CreateDraftAsync(PurchaseOrderCreateDto dto);
    Task<ApiResponse<PurchaseOrderDto>> UpdateDraftAsync(Guid id, PurchaseOrderUpdateDraftDto dto);
    Task<ApiResponse<PurchaseOrderDto>> SubmitAsync(Guid id);
    Task<ApiResponse<PurchaseOrderDto>> ApproveAsync(Guid id, Guid? userId);
    Task<ApiResponse<PurchaseOrderDto>> CancelAsync(Guid id, CancelPurchaseOrderDto dto);
}
