import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/api/api-response';
import { PagedResult } from '../../../core/api/paged-result';

// ─── Stock ───────────────────────────────────────────────────────────────────

export interface StockItemDto {
  id: string;
  skuId: string;
  skuCode: string;
  barcode: string;
  productName: string;
  locationId: string;
  locationAddress: string;
  warehouseId: string;
  warehouseCode: string;
  qtyOnHand: number;
  qtyReserved: number;
  qtyAvailable: number;
}

export interface StockMovementDto {
  id: string;
  skuId: string;
  skuCode: string;
  productName: string;
  fromLocationAddress?: string;
  toLocationAddress?: string;
  quantity: number;
  type: string;
  referenceType?: string;
  referenceId?: string;
  userId?: string;
  notes?: string;
  occurredAt: string;
}

export interface StockSearchParams {
  skuId?: string;
  skuCode?: string;
  barcode?: string;
  warehouseId?: string;
  locationId?: string;
  onlyAvailable?: boolean;
  page?: number;
  pageSize?: number;
}

export interface MovementSearchParams {
  skuId?: string;
  locationId?: string;
  type?: string;
  referenceType?: string;
  referenceId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

// ─── Operations ──────────────────────────────────────────────────────────────

export interface ReceiveStockDto {
  skuId: string;
  toLocationId: string;
  quantity: number;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
}

export interface AdjustStockDto {
  skuId: string;
  locationId: string;
  delta: number;
  reason: string;
}

export interface TransferStockDto {
  skuId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  notes?: string;
}

// ─── Warehouse ───────────────────────────────────────────────────────────────

export interface WarehouseDto {
  id: string;
  code: string;
  name: string;
  address?: string;
  isActive: boolean;
  locationCount: number;
}

export interface WarehouseCreateDto {
  code: string;
  name: string;
  address?: string;
}

export interface WarehouseUpdateDto extends WarehouseCreateDto {
  isActive: boolean;
}

// ─── Location ────────────────────────────────────────────────────────────────

export interface LocationDto {
  id: string;
  warehouseId: string;
  warehouseCode: string;
  zone: string;
  aisle: string;
  shelf: string;
  bin: string;
  address: string;
  isPickable: boolean;
}

export interface LocationCreateDto {
  warehouseId: string;
  zone: string;
  aisle: string;
  shelf: string;
  bin: string;
  isPickable: boolean;
}

// ─── Inventory Count ─────────────────────────────────────────────────────────

export interface InventoryCountDto {
  id: string;
  warehouseId: string;
  warehouseCode: string;
  status: string;
  startedAt?: string;
  postedAt?: string;
  notes?: string;
  lineCount: number;
  totalVariance: number;
}

export interface InventoryCountLineDto {
  id: string;
  skuId: string;
  skuCode: string;
  productName: string;
  locationId: string;
  locationAddress: string;
  systemQty: number;
  countedQty: number;
  variance: number;
}

export interface InventoryCountDetailDto extends InventoryCountDto {
  lines: InventoryCountLineDto[];
}

export interface CountLineInputDto {
  skuId: string;
  locationId: string;
  countedQty: number;
}

@Injectable({ providedIn: 'root' })
export class InventoryApiService {
  constructor(private api: ApiService) {}

  // Stock
  searchStock(params: StockSearchParams): Observable<ApiResponse<PagedResult<StockItemDto>>> {
    return this.api.get<PagedResult<StockItemDto>>('/api/inventory/stock', params as Record<string, unknown>);
  }

  searchMovements(params: MovementSearchParams): Observable<ApiResponse<PagedResult<StockMovementDto>>> {
    return this.api.get<PagedResult<StockMovementDto>>('/api/inventory/movements', params as Record<string, unknown>);
  }

  receive(dto: ReceiveStockDto): Observable<ApiResponse<void>> {
    return this.api.post<void>('/api/inventory/receive', dto);
  }

  adjust(dto: AdjustStockDto): Observable<ApiResponse<void>> {
    return this.api.post<void>('/api/inventory/adjust', dto);
  }

  transfer(dto: TransferStockDto): Observable<ApiResponse<void>> {
    return this.api.post<void>('/api/inventory/transfer', dto);
  }

  // Warehouses
  listWarehouses(includeInactive = false): Observable<ApiResponse<WarehouseDto[]>> {
    return this.api.get<WarehouseDto[]>('/api/warehouses', { includeInactive });
  }

  getWarehouse(id: string): Observable<ApiResponse<WarehouseDto>> {
    return this.api.get<WarehouseDto>(`/api/warehouses/${id}`);
  }

  createWarehouse(dto: WarehouseCreateDto): Observable<ApiResponse<WarehouseDto>> {
    return this.api.post<WarehouseDto>('/api/warehouses', dto);
  }

  updateWarehouse(id: string, dto: WarehouseUpdateDto): Observable<ApiResponse<WarehouseDto>> {
    return this.api.put<WarehouseDto>(`/api/warehouses/${id}`, dto);
  }

  deleteWarehouse(id: string): Observable<ApiResponse<void>> {
    return this.api.delete<void>(`/api/warehouses/${id}`);
  }

  listLocations(warehouseId: string): Observable<ApiResponse<LocationDto[]>> {
    return this.api.get<LocationDto[]>(`/api/warehouses/${warehouseId}/locations`);
  }

  // Locations
  createLocation(dto: LocationCreateDto): Observable<ApiResponse<LocationDto>> {
    return this.api.post<LocationDto>('/api/locations', dto);
  }

  updateLocation(id: string, dto: LocationCreateDto): Observable<ApiResponse<LocationDto>> {
    return this.api.put<LocationDto>(`/api/locations/${id}`, dto);
  }

  deleteLocation(id: string): Observable<ApiResponse<void>> {
    return this.api.delete<void>(`/api/locations/${id}`);
  }

  // Inventory Counts
  listCounts(warehouseId?: string): Observable<ApiResponse<InventoryCountDto[]>> {
    const params: Record<string, unknown> = {};
    if (warehouseId) params['warehouseId'] = warehouseId;
    return this.api.get<InventoryCountDto[]>('/api/inventory/counts', params);
  }

  getCount(id: string): Observable<ApiResponse<InventoryCountDetailDto>> {
    return this.api.get<InventoryCountDetailDto>(`/api/inventory/counts/${id}`);
  }

  createCount(dto: { warehouseId: string; notes?: string }): Observable<ApiResponse<InventoryCountDto>> {
    return this.api.post<InventoryCountDto>('/api/inventory/counts', dto);
  }

  startCount(id: string): Observable<ApiResponse<void>> {
    return this.api.post<void>(`/api/inventory/counts/${id}/start`, {});
  }

  setCountLines(id: string, lines: CountLineInputDto[]): Observable<ApiResponse<void>> {
    return this.api.put<void>(`/api/inventory/counts/${id}/lines`, lines);
  }

  postCount(id: string): Observable<ApiResponse<void>> {
    return this.api.post<void>(`/api/inventory/counts/${id}/post`, {});
  }

  cancelCount(id: string): Observable<ApiResponse<void>> {
    return this.api.post<void>(`/api/inventory/counts/${id}/cancel`, {});
  }
}
