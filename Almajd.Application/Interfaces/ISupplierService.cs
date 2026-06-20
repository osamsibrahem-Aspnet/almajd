using Almajd.Application.Common;
using Almajd.Application.DTOs.Purchasing;

namespace Almajd.Application.Interfaces;

public interface ISupplierService
{
    Task<ApiResponse<PagedResult<SupplierDto>>> SearchAsync(SupplierSearchQuery query);
    Task<ApiResponse<SupplierDto>> GetAsync(Guid id);
    Task<ApiResponse<SupplierDto>> CreateAsync(SupplierCreateDto dto);
    Task<ApiResponse<SupplierDto>> UpdateAsync(Guid id, SupplierUpdateDto dto);
    Task<ApiResponse> DeleteAsync(Guid id);

    Task<ApiResponse<IReadOnlyList<SupplierSkuDto>>> ListSkusAsync(Guid supplierId);
    Task<ApiResponse<SupplierSkuDto>> UpsertSkuAsync(Guid supplierId, SupplierSkuUpsertDto dto);
    Task<ApiResponse> RemoveSkuAsync(Guid supplierId, Guid skuId);

    /// <summary>Compare supplier prices for a single SKU.</summary>
    Task<ApiResponse<IReadOnlyList<SupplierPriceCompareItemDto>>> CompareSuppliersForSkuAsync(Guid skuId);
}
