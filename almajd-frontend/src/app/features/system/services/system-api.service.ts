import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/api/api-response';
import { PagedResult } from '../../../core/api/paged-result';

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  roles: string[];
  customerId: string | null;
  customerName: string | null;
  isLockedOut: boolean;
}

export interface UserSearchQuery {
  search?: string;
  role?: string;
  isLockedOut?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CreateStaffUserDto {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  roles: string[];
}

export interface SetUserRolesDto {
  roles: string[];
}

export interface NotificationTemplateDto {
  id: string;
  code: string;
  category: string;
  title: string;
  body: string;
  isActive: boolean;
}

export interface NotificationTemplateUpsertDto {
  code: string;
  category: string;
  title: string;
  body: string;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class SystemApiService {
  constructor(private api: ApiService) {}

  searchUsers(query: UserSearchQuery): Observable<ApiResponse<PagedResult<UserDto>>> {
    return this.api.get<PagedResult<UserDto>>('/api/users', query as Record<string, unknown>);
  }

  getUser(id: string): Observable<ApiResponse<UserDto>> {
    return this.api.get<UserDto>(`/api/users/${id}`);
  }

  createUser(dto: CreateStaffUserDto): Observable<ApiResponse<UserDto>> {
    return this.api.post<UserDto>('/api/users', dto);
  }

  setRoles(id: string, dto: SetUserRolesDto): Observable<ApiResponse<void>> {
    return this.api.put<void>(`/api/users/${id}/roles`, dto);
  }

  deactivateUser(id: string): Observable<ApiResponse<void>> {
    return this.api.post<void>(`/api/users/${id}/deactivate`, {});
  }

  activateUser(id: string): Observable<ApiResponse<void>> {
    return this.api.post<void>(`/api/users/${id}/activate`, {});
  }

  listRoles(): Observable<ApiResponse<string[]>> {
    return this.api.get<string[]>('/api/users/roles');
  }

  listTemplates(): Observable<ApiResponse<NotificationTemplateDto[]>> {
    return this.api.get<NotificationTemplateDto[]>('/api/notifications/templates');
  }

  upsertTemplate(dto: NotificationTemplateUpsertDto): Observable<ApiResponse<void>> {
    return this.api.put<void>('/api/notifications/templates', dto);
  }
}
