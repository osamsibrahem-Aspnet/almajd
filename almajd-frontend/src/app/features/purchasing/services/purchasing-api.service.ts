import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/api/api-response';
import { PagedResult } from '../../../core/api/paged-result';

// ─── Suppliers ───────────────────────────────────────────────────────────────

export interface SupplierListItemDto {
  id: string;
  code: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  currency: string;
  paymentTermsNetDays: number;
  isActive: boolean;
  skuCount: number;
}

export interface SupplierDto extends SupplierListItemDto {
  address?: string;
  taxId?: string;
  notes?: string;
}

export interface SupplierCreateDto {
  code: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxId?: string;
  currency: string;
  paymentTermsNetDays: number;
  notes?: string;
}

export interface SupplierUpdateDto extends SupplierCreateDto {
  isActive: boolean;
}

export interface SupplierSkuDto {
  id: string;
  supplierId: string;
  skuId: string;
  skuCode: string;
  productName: string;
  barcode?: string;
  leadTimeDays: number;
  costPrice: number;
  currency: string;
  isPreferred: boolean;
}

export interface SupplierSkuUpsertDto {
  skuId: string;
  leadTimeDays: number;
  costPrice: number;
  currency: string;
  isPreferred: boolean;
}

export interface SupplierCompareDto {
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  costPrice: number;
  currency: string;
  leadTimeDays: number;
  isPreferred: boolean;
}

// ─── Purchase Orders ──────────────────────────────────────────────────────────

export interface PoLineDto {
  id: string;
  skuId: string;
  skuCode: string;
  productName: string;
  qty: number;
  receivedQty: number;
  outstandingQty: number;
  costPrice: number;
  lineTotal: number;
}

export interface PoLineInputDto {
  skuId: string;
  qty: number;
  costPrice: number;
}

export interface PurchaseOrderListItemDto {
  id: string;
  number: string;
  supplierId: string;
  supplierName: string;
  status: string;
  currency: string;
  total: number;
  expectedAt?: string;
  submittedAt?: string;
  createdAt: string;
  lineCount: number;
}

export interface PurchaseOrderDto extends PurchaseOrderListItemDto {
  notes?: string;
  approvedAt?: string;
  approvedByName?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  lines: PoLineDto[];
}

export interface PurchaseOrderCreateDto {
  supplierId: string;
  expectedAt?: string;
  notes?: string;
  lines: PoLineInputDto[];
}

export interface PurchaseOrderUpdateDto {
  expectedAt?: string;
  notes?: string;
  lines: PoLineInputDto[];
}

export interface CancelPoDto {
  reason?: string;
}

export interface PoSearchParams {
  search?: string;
  supplierId?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

// ─── Goods Receipts ───────────────────────────────────────────────────────────

export interface GrLineDto {
  id: string;
  purchaseOrderLineId: string;
  skuId: string;
  skuCode: string;
  productName: string;
  qty: number;
  locationId: string;
  locationAddress: string;
}

export interface GrLineInputDto {
  purchaseOrderLineId: string;
  qty: number;
  locationId: string;
}

export interface GoodsReceiptListItemDto {
  id: string;
  number: string;
  purchaseOrderId: string;
  purchaseOrderNumber: string;
  supplierName: string;
  receivedAt: string;
  receivedByName: string;
  lineCount: number;
}

export interface GoodsReceiptDto extends GoodsReceiptListItemDto {
  notes?: string;
  lines: GrLineDto[];
}

export interface GoodsReceiptCreateDto {
  purchaseOrderId: string;
  notes?: string;
  lines: GrLineInputDto[];
}

export interface GrSearchParams {
  purchaseOrderId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

// ─── Replenishment ────────────────────────────────────────────────────────────

export interface ReplenishmentSuggestionDto {
  skuId: string;
  skuCode: string;
  productName: string;
  qtyAvailable: number;
  reorderPoint: number;
  suggestedQty: number;
  preferredSupplierId?: string;
  preferredSupplierName?: string;
  lastCostPrice?: number;
  currency?: string;
  leadTimeDays?: number;
}

@Injectable({ providedIn: 'root' })
export class PurchasingApiService {
  constructor(private api: ApiService) {}

  // ─── Suppliers ───────────────────────────────────────────────────────────

  searchSuppliers(params: { search?: string; isActive?: boolean; page?: number; pageSize?: number }): Observable<ApiResponse<PagedResult<SupplierListItemDto>>> {
    return this.api.get<PagedResult<SupplierListItemDto>>('/api/suppliers', params as Record<string, unknown>);
  }

  getSupplier(id: string): Observable<ApiResponse<SupplierDto>> {
    return this.api.get<SupplierDto>(`/api/suppliers/${id}`);
  }

  createSupplier(dto: SupplierCreateDto): Observable<ApiResponse<SupplierDto>> {
    return this.api.post<SupplierDto>('/api/suppliers', dto);
  }

  updateSupplier(id: string, dto: SupplierUpdateDto): Observable<ApiResponse<SupplierDto>> {
    return this.api.put<SupplierDto>(`/api/suppliers/${id}`, dto);
  }

  deleteSupplier(id: string): Observable<ApiResponse<void>> {
    return this.api.delete<void>(`/api/suppliers/${id}`);
  }

  getSupplierSkus(supplierId: string): Observable<ApiResponse<SupplierSkuDto[]>> {
    return this.api.get<SupplierSkuDto[]>(`/api/suppliers/${supplierId}/skus`);
  }

  upsertSupplierSku(supplierId: string, dto: SupplierSkuUpsertDto): Observable<ApiResponse<SupplierSkuDto>> {
    return this.api.post<SupplierSkuDto>(`/api/suppliers/${supplierId}/skus`, dto);
  }

  deleteSupplierSku(supplierId: string, skuId: string): Observable<ApiResponse<void>> {
    return this.api.delete<void>(`/api/suppliers/${supplierId}/skus/${skuId}`);
  }

  compareSuppliers(skuId: string): Observable<ApiResponse<SupplierCompareDto[]>> {
    return this.api.get<SupplierCompareDto[]>(`/api/suppliers/compare/${skuId}`);
  }

  // ─── Purchase Orders ─────────────────────────────────────────────────────

  searchPOs(params: PoSearchParams): Observable<ApiResponse<PagedResult<PurchaseOrderListItemDto>>> {
    return this.api.get<PagedResult<PurchaseOrderListItemDto>>('/api/purchaseorders', params as Record<string, unknown>);
  }

  getPO(id: string): Observable<ApiResponse<PurchaseOrderDto>> {
    return this.api.get<PurchaseOrderDto>(`/api/purchaseorders/${id}`);
  }

  createPO(dto: PurchaseOrderCreateDto): Observable<ApiResponse<PurchaseOrderDto>> {
    return this.api.post<PurchaseOrderDto>('/api/purchaseorders', dto);
  }

  updatePO(id: string, dto: PurchaseOrderUpdateDto): Observable<ApiResponse<PurchaseOrderDto>> {
    return this.api.put<PurchaseOrderDto>(`/api/purchaseorders/${id}`, dto);
  }

  submitPO(id: string): Observable<ApiResponse<void>> {
    return this.api.post<void>(`/api/purchaseorders/${id}/submit`, {});
  }

  approvePO(id: string): Observable<ApiResponse<void>> {
    return this.api.post<void>(`/api/purchaseorders/${id}/approve`, {});
  }

  cancelPO(id: string, dto: CancelPoDto): Observable<ApiResponse<void>> {
    return this.api.post<void>(`/api/purchaseorders/${id}/cancel`, dto);
  }

  // ─── Goods Receipts ──────────────────────────────────────────────────────

  searchGRs(params: GrSearchParams): Observable<ApiResponse<PagedResult<GoodsReceiptListItemDto>>> {
    return this.api.get<PagedResult<GoodsReceiptListItemDto>>('/api/goodsreceipts', params as Record<string, unknown>);
  }

  getGR(id: string): Observable<ApiResponse<GoodsReceiptDto>> {
    return this.api.get<GoodsReceiptDto>(`/api/goodsreceipts/${id}`);
  }

  createGR(dto: GoodsReceiptCreateDto): Observable<ApiResponse<GoodsReceiptDto>> {
    return this.api.post<GoodsReceiptDto>('/api/goodsreceipts', dto);
  }

  // ─── Replenishment ───────────────────────────────────────────────────────

  getReplenishmentSuggestions(supplierId?: string): Observable<ApiResponse<ReplenishmentSuggestionDto[]>> {
    const params: Record<string, unknown> = {};
    if (supplierId) params['supplierId'] = supplierId;
    return this.api.get<ReplenishmentSuggestionDto[]>('/api/replenishment/suggestions', params);
  }
}
