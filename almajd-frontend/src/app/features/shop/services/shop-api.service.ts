import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/api/api-response';

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  children?: CategoryNode[];
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
}

export interface ProductSku {
  id: string;
  code: string;
  barcode?: string;
  isActive: boolean;
  attributes?: Record<string, string>;
  unitPrice?: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  brandId?: string;
  brandName?: string;
  categoryId?: string;
  categoryName?: string;
  status: string;
  isFeatured: boolean;
  mediaUrls?: string[];
  skus?: ProductSku[];
}

export interface ProductListResponse {
  items: Product[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface OrderLine {
  skuId: string;
  qty: number;
  unitPrice?: number;
}

export interface CreateOrderDto {
  customerId?: string;
  lines: OrderLine[];
  couponCode?: string;
  shipToAddressId?: string;
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  submittedAt?: string;
  expectedShipAt?: string;
  cancelledAt?: string;
  deliveredAt?: string;
  shippedAt?: string;
  approvedAt?: string;
  lines?: OrderLineFull[];
  shipmentWaybill?: string;
  driverName?: string;
  couponCode?: string;
  notes?: string;
  shipToAddressId?: string;
}

export interface OrderLineFull {
  id: string;
  skuId: string;
  skuCode: string;
  productName: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

@Injectable({ providedIn: 'root' })
export class ShopApiService {
  constructor(private api: ApiService) {}

  getCategoryTree(): Observable<ApiResponse<CategoryNode[]>> {
    return this.api.get<CategoryNode[]>('/api/categories/tree');
  }

  getBrands(): Observable<ApiResponse<Brand[]>> {
    return this.api.get<Brand[]>('/api/brands');
  }

  getProducts(params: Record<string, unknown>): Observable<ApiResponse<ProductListResponse>> {
    return this.api.get<ProductListResponse>('/api/products', params);
  }

  getProduct(id: string): Observable<ApiResponse<Product>> {
    return this.api.get<Product>(`/api/products/${id}`);
  }

  createOrder(dto: CreateOrderDto): Observable<ApiResponse<Order>> {
    return this.api.post<Order>('/api/orders', dto);
  }

  submitOrder(id: string): Observable<ApiResponse<Order>> {
    return this.api.post<Order>(`/api/orders/${id}/submit`, {});
  }

  getOrder(id: string): Observable<ApiResponse<Order>> {
    return this.api.get<Order>(`/api/orders/${id}`);
  }

  getOrders(params?: Record<string, unknown>): Observable<ApiResponse<{ items: Order[]; totalCount: number }>> {
    return this.api.get<{ items: Order[]; totalCount: number }>('/api/orders', params);
  }

  cancelOrder(id: string, reason: string): Observable<ApiResponse<Order>> {
    return this.api.post<Order>(`/api/orders/${id}/cancel`, { reason });
  }

  reorder(id: string): Observable<ApiResponse<Order>> {
    return this.api.post<Order>(`/api/orders/${id}/reorder`, {});
  }
}
