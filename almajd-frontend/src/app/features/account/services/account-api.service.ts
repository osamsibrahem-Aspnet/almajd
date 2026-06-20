import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/api/api-response';

export interface CustomerProfile {
  id: string;
  code: string;
  legalName: string;
  tradeName?: string;
  taxId?: string;
  phone?: string;
  email?: string;
  tier?: string;
  creditLimit?: number;
  currentAr?: number;
  paymentTerms?: number;
  salesRepName?: string;
  status?: string;
  addresses?: CustomerAddress[];
}

export interface CustomerAddress {
  id: string;
  kind: string;
  label?: string;
  line1?: string;
  line2?: string;
  city?: string;
  country?: string;
  isDefault?: boolean;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  issuedAt?: string;
  dueAt?: string;
  totalAmount: number;
  paidAmount?: number;
  outstandingAmount?: number;
  status: string;
}

export interface Notification {
  id: string;
  title: string;
  body?: string;
  category?: string;
  status: string;
  createdAt: string;
}

export interface NotificationPreference {
  category: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
}

@Injectable({ providedIn: 'root' })
export class AccountApiService {
  constructor(private api: ApiService) {}

  getProfile(customerId: string): Observable<ApiResponse<CustomerProfile>> {
    return this.api.get<CustomerProfile>(`/api/customers/${customerId}`);
  }

  updateProfile(customerId: string, dto: Partial<CustomerProfile>): Observable<ApiResponse<CustomerProfile>> {
    return this.api.put<CustomerProfile>(`/api/customers/${customerId}`, dto);
  }

  getAddresses(customerId: string): Observable<ApiResponse<CustomerAddress[]>> {
    return this.api.get<CustomerAddress[]>(`/api/customers/${customerId}/addresses`);
  }

  createAddress(customerId: string, dto: Partial<CustomerAddress>): Observable<ApiResponse<CustomerAddress>> {
    return this.api.post<CustomerAddress>(`/api/customers/${customerId}/addresses`, dto);
  }

  updateAddress(addressId: string, dto: Partial<CustomerAddress>): Observable<ApiResponse<CustomerAddress>> {
    return this.api.put<CustomerAddress>(`/api/customers/addresses/${addressId}`, dto);
  }

  deleteAddress(addressId: string): Observable<ApiResponse<void>> {
    return this.api.delete<void>(`/api/customers/addresses/${addressId}`);
  }

  getInvoices(params?: Record<string, unknown>): Observable<ApiResponse<{ items: Invoice[]; totalCount: number }>> {
    return this.api.get<{ items: Invoice[]; totalCount: number }>('/api/invoices', params);
  }

  downloadInvoicePdf(invoiceId: string): Observable<Blob> {
    return this.api.getBlob(`/api/invoices/${invoiceId}/pdf`);
  }

  getNotifications(params?: Record<string, unknown>): Observable<ApiResponse<{ items: Notification[]; totalCount: number }>> {
    return this.api.get<{ items: Notification[]; totalCount: number }>('/api/notifications/inbox', params);
  }

  getNotificationPreferences(): Observable<ApiResponse<NotificationPreference[]>> {
    return this.api.get<NotificationPreference[]>('/api/notifications/preferences');
  }

  updateNotificationPreferences(prefs: NotificationPreference[]): Observable<ApiResponse<void>> {
    return this.api.put<void>('/api/notifications/preferences', prefs);
  }
}
