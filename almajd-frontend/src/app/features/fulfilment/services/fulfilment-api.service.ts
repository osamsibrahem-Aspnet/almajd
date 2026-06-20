import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/api/api-response';
import { PagedResult } from '../../../core/api/paged-result';

// ─── Pick Lists ───────────────────────────────────────────────────────────────

export interface PickListLineDto {
  id: string;
  orderLineId: string;
  skuId: string;
  skuCode: string;
  barcode: string;
  productName: string;
  locationId: string;
  locationAddress: string;
  requestedQty: number;
  pickedQty: number;
  isShort: boolean;
  shortReason?: string;
  isComplete: boolean;
}

export interface PickListDto {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  status: string;
  generatedAt: string;
  completedAt?: string;
  pickedByUserId?: string;
  pickedByName?: string;
  totalLines: number;
  completedLines: number;
}

export interface PickListDetailDto extends PickListDto {
  lines: PickListLineDto[];
}

export interface PickLineInputDto {
  qty: number;
  scannedSku: string;
  scannedLocation: string;
}

export interface MarkShortInputDto {
  reason?: string;
}

export interface PickListSearchParams {
  status?: string;
  orderId?: string;
  page?: number;
  pageSize?: number;
}

// ─── Shipments ────────────────────────────────────────────────────────────────

export interface ShipmentDto {
  id: string;
  number: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  status: string;
  carrier?: string;
  waybill?: string;
  driverName?: string;
  driverPhone?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  podUrl?: string;
  podSignerName?: string;
  notes?: string;
}

export interface ShipmentCreateDto {
  orderId: string;
  carrier?: string;
  waybill?: string;
  driverName?: string;
  driverPhone?: string;
  notes?: string;
}

export interface AssignDriverDto {
  driverName: string;
  driverPhone?: string;
  carrier?: string;
  waybill?: string;
}

export interface DeliverDto {
  podSignerName: string;
  podUrl?: string;
}

export interface CancelShipmentDto {
  reason?: string;
}

export interface ShipmentSearchParams {
  status?: string;
  orderId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class FulfilmentApiService {
  constructor(private api: ApiService) {}

  // Pick Lists
  searchPickLists(params: PickListSearchParams): Observable<ApiResponse<PagedResult<PickListDto>>> {
    return this.api.get<PagedResult<PickListDto>>('/api/picklists', params as Record<string, unknown>);
  }

  getPickList(id: string): Observable<ApiResponse<PickListDetailDto>> {
    return this.api.get<PickListDetailDto>(`/api/picklists/${id}`);
  }

  pickLine(lineId: string, dto: PickLineInputDto): Observable<ApiResponse<void>> {
    return this.api.post<void>(`/api/picklists/lines/${lineId}/pick`, dto);
  }

  markShort(lineId: string, dto: MarkShortInputDto): Observable<ApiResponse<void>> {
    return this.api.post<void>(`/api/picklists/lines/${lineId}/mark-short`, dto);
  }

  completePickList(id: string): Observable<ApiResponse<void>> {
    return this.api.post<void>(`/api/picklists/${id}/complete`, {});
  }

  cancelPickList(id: string): Observable<ApiResponse<void>> {
    return this.api.post<void>(`/api/picklists/${id}/cancel`, {});
  }

  // Shipments
  searchShipments(params: ShipmentSearchParams): Observable<ApiResponse<PagedResult<ShipmentDto>>> {
    return this.api.get<PagedResult<ShipmentDto>>('/api/shipments', params as Record<string, unknown>);
  }

  getShipment(id: string): Observable<ApiResponse<ShipmentDto>> {
    return this.api.get<ShipmentDto>(`/api/shipments/${id}`);
  }

  createShipment(dto: ShipmentCreateDto): Observable<ApiResponse<ShipmentDto>> {
    return this.api.post<ShipmentDto>('/api/shipments', dto);
  }

  assignDriver(id: string, dto: AssignDriverDto): Observable<ApiResponse<void>> {
    return this.api.post<void>(`/api/shipments/${id}/assign-driver`, dto);
  }

  dispatch(id: string): Observable<ApiResponse<void>> {
    return this.api.post<void>(`/api/shipments/${id}/dispatch`, {});
  }

  deliver(id: string, dto: DeliverDto): Observable<ApiResponse<void>> {
    return this.api.post<void>(`/api/shipments/${id}/deliver`, dto);
  }

  cancelShipment(id: string, dto: CancelShipmentDto): Observable<ApiResponse<void>> {
    return this.api.post<void>(`/api/shipments/${id}/cancel`, dto);
  }
}
