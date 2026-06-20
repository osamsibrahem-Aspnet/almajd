using Almajd.Application.Common;
using Almajd.Application.DTOs.Purchasing;

namespace Almajd.Application.Interfaces;

public interface IGoodsReceiptService
{
    Task<ApiResponse<PagedResult<GoodsReceiptDto>>> SearchAsync(GoodsReceiptSearchQuery query);
    Task<ApiResponse<GoodsReceiptDto>> GetAsync(Guid id);
    Task<ApiResponse<GoodsReceiptDto>> CreateAsync(GoodsReceiptCreateDto dto, Guid? userId);
}
