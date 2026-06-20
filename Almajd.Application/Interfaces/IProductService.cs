using Almajd.Application.Common;
using Almajd.Application.DTOs.Catalog;
using Almajd.Domain.Enums;
using Microsoft.AspNetCore.Http;

namespace Almajd.Application.Interfaces;

public interface IProductService
{
    Task<ApiResponse<PagedResult<ProductListItemDto>>> SearchAsync(ProductSearchQuery query);
    Task<ApiResponse<ProductDto>> GetAsync(Guid id);
    Task<ApiResponse<ProductDto>> GetBySlugAsync(string slug);
    Task<ApiResponse<ProductDto>> CreateAsync(ProductCreateDto dto);
    Task<ApiResponse<ProductDto>> UpdateAsync(Guid id, ProductUpdateDto dto);
    Task<ApiResponse> DeleteAsync(Guid id);
    Task<ApiResponse<ProductDto>> ChangeStatusAsync(Guid id, ProductStatus status);
    Task<ApiResponse<ProductDto>> SetFeaturedAsync(Guid id, bool isFeatured);

    Task<ApiResponse<SkuDto>> AddSkuAsync(SkuCreateDto dto);
    Task<ApiResponse<SkuDto>> UpdateSkuAsync(Guid skuId, SkuUpdateDto dto);
    Task<ApiResponse> RemoveSkuAsync(Guid skuId);

    Task<ApiResponse<ProductMediaDto>> AddMediaAsync(Guid productId, IFormFile file);
    Task<ApiResponse> RemoveMediaAsync(Guid mediaId);

    Task<ApiResponse<BulkImportResultDto>> BulkImportAsync(IFormFile csvFile);
}
