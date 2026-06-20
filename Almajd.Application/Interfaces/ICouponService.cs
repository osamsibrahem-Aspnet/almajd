using Almajd.Application.Common;
using Almajd.Application.DTOs.Sales;

namespace Almajd.Application.Interfaces;

public interface ICouponService
{
    Task<ApiResponse<IReadOnlyList<CouponDto>>> ListAsync(bool includeInactive = false);
    Task<ApiResponse<CouponDto>> GetByCodeAsync(string code);
    Task<ApiResponse<CouponDto>> CreateAsync(CouponCreateDto dto);
    Task<ApiResponse<CouponDto>> UpdateAsync(Guid id, CouponUpdateDto dto);
    Task<ApiResponse> DeleteAsync(Guid id);
}
