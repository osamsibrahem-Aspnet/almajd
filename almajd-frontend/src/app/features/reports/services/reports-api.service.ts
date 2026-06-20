import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/api/api-response';

export interface SalesReportPointDto {
  bucket: string;
  orderCount: number;
  unitsSold: number;
  revenue: number;
  cost: number;
  profit: number;
}

export interface SalesReportQuery {
  from?: string;
  to?: string;
  customerId?: string;
  categoryId?: string;
  brandId?: string;
  groupBy?: 'day' | 'week' | 'month' | 'year';
}

export interface ProfitByProductDto {
  skuId: string;
  skuCode: string;
  productName: string;
  unitsSold: number;
  revenue: number;
  cost: number;
  profit: number;
  marginPct: number;
}

export interface TopCustomerDto {
  rank: number;
  customerId: string;
  customerCode: string;
  customerName: string;
  orderCount: number;
  revenue: number;
  lastOrderDate: string;
}

export interface SupplierSpendDto {
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  poCount: number;
  totalSpend: number;
}

export interface OperationalKpisDto {
  openOrders: number;
  ordersInPreparation: number;
  ordersReadyToShip: number;
  ordersShipped: number;
  lateOrders: number;
  lateOrderPct: number;
  avgPrepHours: number;
  fillRatePct: number;
}

@Injectable({ providedIn: 'root' })
export class ReportsApiService {
  constructor(private api: ApiService) {}

  getSales(query: SalesReportQuery): Observable<ApiResponse<SalesReportPointDto[]>> {
    return this.api.get<SalesReportPointDto[]>('/api/reports/sales', query as Record<string, unknown>);
  }

  getProfitByProduct(from?: string, to?: string): Observable<ApiResponse<ProfitByProductDto[]>> {
    const p: Record<string, unknown> = {};
    if (from) p['from'] = from;
    if (to) p['to'] = to;
    return this.api.get<ProfitByProductDto[]>('/api/reports/profit-by-product', p);
  }

  getTopCustomers(from?: string, to?: string, top = 20): Observable<ApiResponse<TopCustomerDto[]>> {
    const p: Record<string, unknown> = { top };
    if (from) p['from'] = from;
    if (to) p['to'] = to;
    return this.api.get<TopCustomerDto[]>('/api/reports/top-customers', p);
  }

  getSupplierSpend(from?: string, to?: string): Observable<ApiResponse<SupplierSpendDto[]>> {
    const p: Record<string, unknown> = {};
    if (from) p['from'] = from;
    if (to) p['to'] = to;
    return this.api.get<SupplierSpendDto[]>('/api/reports/supplier-spend', p);
  }

  getKpis(): Observable<ApiResponse<OperationalKpisDto>> {
    return this.api.get<OperationalKpisDto>('/api/reports/kpis');
  }
}
