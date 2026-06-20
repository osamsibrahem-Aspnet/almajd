using Almajd.Application.Common;
using Almajd.Application.DTOs.Catalog;

namespace Almajd.Application.Interfaces;

public interface ICategoryService
{
    Task<ApiResponse<IReadOnlyList<CategoryDto>>> ListAsync(bool includeInactive = false);
    Task<ApiResponse<IReadOnlyList<CategoryTreeNodeDto>>> ListTreeAsync(bool includeInactive = false);
    Task<ApiResponse<CategoryDto>> GetAsync(Guid id);
    Task<ApiResponse<CategoryDto>> CreateAsync(CategoryCreateDto dto);
    Task<ApiResponse<CategoryDto>> UpdateAsync(Guid id, CategoryUpdateDto dto);
    Task<ApiResponse> DeleteAsync(Guid id);
}
