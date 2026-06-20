using Almajd.Application.Common;
using Almajd.Application.DTOs.Catalog;

namespace Almajd.Application.Interfaces;

public interface IBrandService
{
    Task<ApiResponse<IReadOnlyList<BrandDto>>> ListAsync(bool includeInactive = false);
    Task<ApiResponse<BrandDto>> GetAsync(Guid id);
    Task<ApiResponse<BrandDto>> CreateAsync(BrandCreateDto dto);
    Task<ApiResponse<BrandDto>> UpdateAsync(Guid id, BrandUpdateDto dto);
    Task<ApiResponse> DeleteAsync(Guid id);
}
