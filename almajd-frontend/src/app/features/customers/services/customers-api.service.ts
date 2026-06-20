import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/api/api-response';
import { PagedResult } from '../../../core/api/paged-result';

export interface CustomerListItemDto {
  id: string;
  code: string;
  legalName: string;
  tradeName?: string;
  tier: string;
  status: string;
  paymentTermsNetDays: number;
  creditLimit: number;
  currentAr: number;
  salesRepName?: string;
}

export interface CustomerContactDto {
  id: string;
  name: string;
  role?: string;
  phone?: string;
  email?: string;
}

export interface CustomerAddressDto {
  id: string;
  kind: string;
  line1: string;
  line2?: string;
  city?: string;
  region?: string;
  country?: string;
}

export interface CustomerNoteDto {
  id: string;
  body: string;
  createdAt: string;
  authorName?: string;
}

export interface CustomerDto extends CustomerListItemDto {
  taxId?: string;
  phone?: string;
  email?: string;
  kycDocumentPath?: string;
  salesRepId?: string;
  contacts: CustomerContactDto[];
  addresses: CustomerAddressDto[];
  notes: CustomerNoteDto[];
}

export interface CustomerCreateDto {
  legalName: string;
  tradeName?: string;
  taxId?: string;
  phone?: string;
  email?: string;
  tier: string;
  paymentTermsNetDays: number;
  creditLimit: number;
  salesRepId?: string;
}

export interface CustomerUpdateDto extends CustomerCreateDto {
  status: string;
}

export interface CustomerContactCreateDto {
  name: string;
  role?: string;
  phone?: string;
  email?: string;
}

export interface CustomerAddressCreateDto {
  kind: string;
  line1: string;
  line2?: string;
  city?: string;
  region?: string;
  country?: string;
}

export interface CustomerNoteCreateDto {
  body: string;
}

export interface CustomerSearchParams {
  search?: string;
  tier?: string;
  status?: string;
  salesRepId?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
}

@Injectable({ providedIn: 'root' })
export class CustomersApiService {
  constructor(private api: ApiService) {}

  search(params: CustomerSearchParams): Observable<ApiResponse<PagedResult<CustomerListItemDto>>> {
    return this.api.get<PagedResult<CustomerListItemDto>>('/api/customers', params as Record<string, unknown>);
  }

  get(id: string): Observable<ApiResponse<CustomerDto>> {
    return this.api.get<CustomerDto>(`/api/customers/${id}`);
  }

  create(dto: CustomerCreateDto): Observable<ApiResponse<CustomerDto>> {
    return this.api.post<CustomerDto>('/api/customers', dto);
  }

  update(id: string, dto: CustomerUpdateDto): Observable<ApiResponse<CustomerDto>> {
    return this.api.put<CustomerDto>(`/api/customers/${id}`, dto);
  }

  setStatus(id: string, status: string): Observable<ApiResponse<void>> {
    return this.api.post<void>(`/api/customers/${id}/status?status=${status}`, {});
  }

  setTier(id: string, tier: string): Observable<ApiResponse<void>> {
    return this.api.post<void>(`/api/customers/${id}/tier?tier=${tier}`, {});
  }

  addContact(id: string, dto: CustomerContactCreateDto): Observable<ApiResponse<CustomerContactDto>> {
    return this.api.post<CustomerContactDto>(`/api/customers/${id}/contacts`, dto);
  }

  removeContact(contactId: string): Observable<ApiResponse<void>> {
    return this.api.delete(`/api/customers/contacts/${contactId}`);
  }

  addAddress(id: string, dto: CustomerAddressCreateDto): Observable<ApiResponse<CustomerAddressDto>> {
    return this.api.post<CustomerAddressDto>(`/api/customers/${id}/addresses`, dto);
  }

  removeAddress(addressId: string): Observable<ApiResponse<void>> {
    return this.api.delete(`/api/customers/addresses/${addressId}`);
  }

  addNote(id: string, dto: CustomerNoteCreateDto): Observable<ApiResponse<CustomerNoteDto>> {
    return this.api.post<CustomerNoteDto>(`/api/customers/${id}/notes`, dto);
  }
}
