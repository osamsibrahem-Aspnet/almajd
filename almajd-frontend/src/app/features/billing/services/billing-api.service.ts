import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/api/api-response';
import { PagedResult } from '../../../core/api/paged-result';

// ─── Invoices ─────────────────────────────────────────────────────────────────

export interface InvoiceLineDto {
  id: string;
  skuId: string;
  skuCode: string;
  productName: string;
  qty: number;
  unitPrice: number;
  discountAmt: number;
  taxAmt: number;
  lineTotal: number;
}

export interface InvoiceListItemDto {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  status: string;
  issuedAt: string;
  dueAt: string;
  totalAmount: number;
  amountPaid: number;
  outstandingAmount: number;
  daysOverdue: number;
  currency: string;
}

export interface InvoiceDto extends InvoiceListItemDto {
  orderId?: string;
  orderNumber?: string;
  shipToAddressSnapshot?: string;
  subTotal: number;
  discountTotal: number;
  taxTotal: number;
  voidedAt?: string;
  voidReason?: string;
  lines: InvoiceLineDto[];
}

export interface InvoiceSearchParams {
  search?: string;
  customerId?: string;
  status?: string;
  overdue?: boolean;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface IssueInvoiceDto {
  orderId: string;
  netDays?: number;
  notes?: string;
}

export interface VoidInvoiceDto {
  reason: string;
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export interface PaymentAllocationDto {
  invoiceId: string;
  invoiceNumber?: string;
  outstandingAmount?: number;
  allocatedAmount: number;
}

export interface PaymentListItemDto {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  paymentMethod: string;
  totalAmount: number;
  allocatedAmount: number;
  unallocatedAmount: number;
  paidAt: string;
  referenceNumber?: string;
}

export interface PaymentDto extends PaymentListItemDto {
  notes?: string;
  allocations: PaymentAllocationDto[];
}

export interface PaymentCreateDto {
  customerId: string;
  paymentMethod: string;
  totalAmount: number;
  referenceNumber?: string;
  paidAt: string;
  notes?: string;
  allocations: { invoiceId: string; allocatedAmount: number }[];
}

export interface PaymentSearchParams {
  customerId?: string;
  method?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

// ─── Credit Notes ─────────────────────────────────────────────────────────────

export interface CreditNoteDto {
  id: string;
  number: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  amount: number;
  currency: string;
  reason: string;
  issuedAt: string;
}

export interface CreditNoteCreateDto {
  invoiceId: string;
  amount: number;
  reason: string;
}

// ─── AR Aging ─────────────────────────────────────────────────────────────────

export interface ArAgingBucketDto {
  current: number;
  days0to30: number;
  days31to60: number;
  days61to90: number;
  over90: number;
  total: number;
}

export interface ArAgingRowDto {
  customerId: string;
  customerName: string;
  current: number;
  days0to30: number;
  days31to60: number;
  days61to90: number;
  over90: number;
  total: number;
}

export interface ArAgingDto {
  asOf: string;
  totals: ArAgingBucketDto;
  rows: ArAgingRowDto[];
}

export interface CustomerArDto {
  customerId: string;
  customerName: string;
  asOf: string;
  buckets: ArAgingBucketDto;
  openInvoices: InvoiceListItemDto[];
}

@Injectable({ providedIn: 'root' })
export class BillingApiService {
  constructor(private api: ApiService) {}

  // ─── Invoices ──────────────────────────────────────────────────────────────

  searchInvoices(params: InvoiceSearchParams): Observable<ApiResponse<PagedResult<InvoiceListItemDto>>> {
    return this.api.get<PagedResult<InvoiceListItemDto>>('/api/invoices', params as Record<string, unknown>);
  }

  getInvoice(id: string): Observable<ApiResponse<InvoiceDto>> {
    return this.api.get<InvoiceDto>(`/api/invoices/${id}`);
  }

  issueInvoice(dto: IssueInvoiceDto): Observable<ApiResponse<InvoiceDto>> {
    return this.api.post<InvoiceDto>('/api/invoices/issue', dto);
  }

  voidInvoice(id: string, dto: VoidInvoiceDto): Observable<ApiResponse<void>> {
    return this.api.post<void>(`/api/invoices/${id}/void`, dto);
  }

  downloadInvoicePdf(id: string): Observable<Blob> {
    return this.api.getBlob(`/api/invoices/${id}/pdf`);
  }

  // ─── Payments ──────────────────────────────────────────────────────────────

  searchPayments(params: PaymentSearchParams): Observable<ApiResponse<PagedResult<PaymentListItemDto>>> {
    return this.api.get<PagedResult<PaymentListItemDto>>('/api/payments', params as Record<string, unknown>);
  }

  getPayment(id: string): Observable<ApiResponse<PaymentDto>> {
    return this.api.get<PaymentDto>(`/api/payments/${id}`);
  }

  createPayment(dto: PaymentCreateDto): Observable<ApiResponse<PaymentDto>> {
    return this.api.post<PaymentDto>('/api/payments', dto);
  }

  // ─── Credit Notes ──────────────────────────────────────────────────────────

  getCreditNotesByInvoice(invoiceId: string): Observable<ApiResponse<CreditNoteDto[]>> {
    return this.api.get<CreditNoteDto[]>(`/api/creditnotes/by-invoice/${invoiceId}`);
  }

  createCreditNote(dto: CreditNoteCreateDto): Observable<ApiResponse<CreditNoteDto>> {
    return this.api.post<CreditNoteDto>('/api/creditnotes', dto);
  }

  // ─── AR Aging ──────────────────────────────────────────────────────────────

  getArAging(asOf?: string): Observable<ApiResponse<ArAgingDto>> {
    const params: Record<string, unknown> = {};
    if (asOf) params['asOf'] = asOf;
    return this.api.get<ArAgingDto>('/api/ar/aging', params);
  }

  getCustomerAr(customerId: string): Observable<ApiResponse<CustomerArDto>> {
    return this.api.get<CustomerArDto>(`/api/ar/aging/customer/${customerId}`);
  }
}
