using Almajd.Application.Common;
using Almajd.Application.DTOs.Fulfilment;

namespace Almajd.Application.Interfaces;

public interface IPickListService
{
    Task<ApiResponse<PagedResult<PickListDto>>> SearchAsync(PickListSearchQuery query);
    Task<ApiResponse<PickListDetailDto>> GetAsync(Guid id);
    Task<ApiResponse<PickListDetailDto>> GetByOrderAsync(Guid orderId);

    Task<ApiResponse<PickListLineDto>> PickLineAsync(Guid lineId, PickLineInputDto dto, Guid? userId);
    Task<ApiResponse<PickListLineDto>> MarkShortAsync(Guid lineId, MarkShortInputDto dto, Guid? userId);
    Task<ApiResponse<PickListDetailDto>> CompleteAsync(Guid id, Guid? userId);
    Task<ApiResponse> CancelAsync(Guid id);
}
