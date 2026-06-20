import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/api/api-response';
import { PagedResult } from '../../../core/api/paged-result';

// --- Brands ---
export interface BrandDto { id: string; name: string; slug: string; logoPath?: string; isActive: boolean; }
export interface BrandCreateDto { name: string; logoPath?: string; }
export interface BrandUpdateDto { name: string; logoPath?: string; isActive: boolean; }

// --- Categories ---
export interface CategoryDto { id: string; parentId?: string; name: string; slug: string; description?: string; sortOrder: number; isActive: boolean; attributeSchemaJson?: string; }
export interface CategoryTreeNodeDto extends CategoryDto { children: CategoryTreeNodeDto[]; }
export interface CategoryCreateDto { name: string; parentId?: string; description?: string; sortOrder: number; attributeSchemaJson?: string; }
export interface CategoryUpdateDto extends CategoryCreateDto { isActive: boolean; }

// --- Products ---
export interface ProductListItemDto { id: string; name: string; slug: string; brandName: string; categoryName?: string; status: string; isFeatured: boolean; primaryImageUrl?: string; skuCount: number; }
export interface SkuDto { id: string; productId: string; code: string; barcode: string; attributesJson?: string; weightG?: number; isActive: boolean; }
export interface ProductMediaDto { id: string; productId: string; url: string; kind: string; sortOrder: number; }
export interface ProductDto { id: string; brandId: string; brandName: string; categoryId?: string; categoryName?: string; name: string; slug: string; description?: string; status: string; isFeatured: boolean; skus: SkuDto[]; media: ProductMediaDto[]; }
export interface ProductCreateDto { brandId: string; categoryId?: string; name: string; description?: string; status: string; isFeatured: boolean; }
export interface ProductUpdateDto extends ProductCreateDto {}
export interface SkuCreateDto { productId: string; code: string; barcode: string; attributesJson?: string; weightG?: number; }
export interface SkuUpdateDto { code: string; barcode: string; attributesJson?: string; weightG?: number; isActive: boolean; }

export interface ProductSearchParams {
  search?: string;
  brandId?: string;
  categoryId?: string;
  status?: string;
  isFeatured?: boolean;
  page?: number;
  pageSize?: number;
  sort?: string;
}

@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  constructor(private api: ApiService) {}

  // Brands
  listBrands(includeInactive = false): Observable<ApiResponse<BrandDto[]>> {
    return this.api.get<BrandDto[]>('/api/brands', { includeInactive });
  }

  getBrand(id: string): Observable<ApiResponse<BrandDto>> {
    return this.api.get<BrandDto>(`/api/brands/${id}`);
  }

  createBrand(dto: BrandCreateDto): Observable<ApiResponse<BrandDto>> {
    return this.api.post<BrandDto>('/api/brands', dto);
  }

  updateBrand(id: string, dto: BrandUpdateDto): Observable<ApiResponse<BrandDto>> {
    return this.api.put<BrandDto>(`/api/brands/${id}`, dto);
  }

  deleteBrand(id: string): Observable<ApiResponse<void>> {
    return this.api.delete(`/api/brands/${id}`);
  }

  // Categories
  listCategories(includeInactive = false): Observable<ApiResponse<CategoryDto[]>> {
    return this.api.get<CategoryDto[]>('/api/categories', { includeInactive });
  }

  getCategoryTree(includeInactive = false): Observable<ApiResponse<CategoryTreeNodeDto[]>> {
    return this.api.get<CategoryTreeNodeDto[]>('/api/categories/tree', { includeInactive });
  }

  createCategory(dto: CategoryCreateDto): Observable<ApiResponse<CategoryDto>> {
    return this.api.post<CategoryDto>('/api/categories', dto);
  }

  updateCategory(id: string, dto: CategoryUpdateDto): Observable<ApiResponse<CategoryDto>> {
    return this.api.put<CategoryDto>(`/api/categories/${id}`, dto);
  }

  deleteCategory(id: string): Observable<ApiResponse<void>> {
    return this.api.delete(`/api/categories/${id}`);
  }

  // Products
  searchProducts(params: ProductSearchParams): Observable<ApiResponse<PagedResult<ProductListItemDto>>> {
    return this.api.get<PagedResult<ProductListItemDto>>('/api/products', params as Record<string, unknown>);
  }

  getProduct(id: string): Observable<ApiResponse<ProductDto>> {
    return this.api.get<ProductDto>(`/api/products/${id}`);
  }

  createProduct(dto: ProductCreateDto): Observable<ApiResponse<ProductDto>> {
    return this.api.post<ProductDto>('/api/products', dto);
  }

  updateProduct(id: string, dto: ProductUpdateDto): Observable<ApiResponse<ProductDto>> {
    return this.api.put<ProductDto>(`/api/products/${id}`, dto);
  }

  deleteProduct(id: string): Observable<ApiResponse<void>> {
    return this.api.delete(`/api/products/${id}`);
  }

  changeProductStatus(id: string, status: string): Observable<ApiResponse<void>> {
    return this.api.post<void>(`/api/products/${id}/status?status=${status}`, {});
  }

  setProductFeatured(id: string, isFeatured: boolean): Observable<ApiResponse<void>> {
    return this.api.post<void>(`/api/products/${id}/featured?isFeatured=${isFeatured}`, {});
  }

  addSku(dto: SkuCreateDto): Observable<ApiResponse<SkuDto>> {
    return this.api.post<SkuDto>('/api/products/skus', dto);
  }

  updateSku(skuId: string, dto: SkuUpdateDto): Observable<ApiResponse<SkuDto>> {
    return this.api.put<SkuDto>(`/api/products/skus/${skuId}`, dto);
  }

  removeSku(skuId: string): Observable<ApiResponse<void>> {
    return this.api.delete(`/api/products/skus/${skuId}`);
  }

  addMedia(productId: string, file: File): Observable<ApiResponse<ProductMediaDto>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.postForm<ProductMediaDto>(`/api/products/${productId}/media`, formData);
  }

  removeMedia(mediaId: string): Observable<ApiResponse<void>> {
    return this.api.delete(`/api/products/media/${mediaId}`);
  }
}
