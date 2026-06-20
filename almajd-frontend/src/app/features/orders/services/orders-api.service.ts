import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/api/api-response';
import { PagedResult } from '../../../core/api/paged-result';

export interface OrderLineDto {
  id: string;
  skuId: string;
  skuCode: string;
  barcode: string;
  productName: string;
  qty: number;
  unitPrice: number;
  discountPct: number;
  taxPct: number;
  lineSubTotal: number;
  lineDiscountAmount: number;
  lineNet: number;
  lineTaxAmount: number;
  lineTotal: number;
  priceSource?: string;
}

export interface OrderListItemDto {
  id: string;
  number: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  channel: string;
  status: string;
  total: number;
  currency: string;
  submittedAt?: string;
  expectedShipAt?: string;
  isLate: boolean;
  lineCount: number;
}

export interface OrderDto extends OrderListItemDto {
  paymentTermsNetDays: number;
  shipToAddressId?: string;
  shipToAddressSnapshot?: string;
  salesRepId?: string;
  salesRepName?: string;
  couponCode?: string;
  couponDiscountAmount: number;
  subTotal: number;
  lineDiscountTotal: number;
  taxTotal: number;
  approvedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  closedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  notes?: string;
  lines: OrderLineDto[];
}

export interface OrderSearchParams {
  search?: string;
  customerId?: string;
  status?: string;
  channel?: string;
  salesRepId?: string;
  late?: boolean;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
}

export interface CancelOrderDto {
  reason?: string;
}

@Injectable({ providedIn: 'root' })
export class OrdersApiService {
  constructor(private api: ApiService) {}

  search(params: OrderSearchParams): Observable<ApiResponse<PagedResult<OrderListItemDto>>> {
    return this.api.get<PagedResult<OrderListItemDto>>('/api/orders', params as Record<string, unknown>);
  }

  get(id: string): Observable<ApiResponse<OrderDto>> {
    return this.api.get<OrderDto>(`/api/orders/${id}`);
  }

  approve(id: string): Observable<ApiResponse<void>> {
    return this.api.post<void>(`/api/orders/${id}/approve`, {});
  }

  cancel(id: string, dto: CancelOrderDto): Observable<ApiResponse<void>> {
    return this.api.post<void>(`/api/orders/${id}/cancel`, dto);
  }

  reorder(id: string): Observable<ApiResponse<OrderDto>> {
    return this.api.post<OrderDto>(`/api/orders/${id}/reorder`, {});
  }
}
