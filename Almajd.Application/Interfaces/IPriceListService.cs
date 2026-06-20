using Almajd.Application.Common;
using Almajd.Application.DTOs.Sales;

namespace Almajd.Application.Interfaces;

public interface IPriceListService
{
    Task<ApiResponse<IReadOnlyList<PriceListDto>>> ListAsync(bool includeInactive = false);
    Task<ApiResponse<PriceListDetailDto>> GetAsync(Guid id);
    Task<ApiResponse<PriceListDto>> CreateAsync(PriceListCreateDto dto);
    Task<ApiResponse<PriceListDto>> UpdateAsync(Guid id, PriceListUpdateDto dto);
    Task<ApiResponse> DeleteAsync(Guid id);

    Task<ApiResponse<PriceListLineDto>> UpsertLineAsync(Guid priceListId, PriceListLineUpsertDto dto);
    Task<ApiResponse> RemoveLineAsync(Guid priceListId, Guid skuId);

    Task<ApiResponse> AssignToCustomerAsync(Guid customerId, CustomerPriceListAssignDto dto);
    Task<ApiResponse> UnassignFromCustomerAsync(Guid customerId, Guid priceListId);
}
