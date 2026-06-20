import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiResponse } from './api-response';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  get<T>(path: string, params?: Record<string, unknown>): Observable<ApiResponse<T>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== '') {
          httpParams = httpParams.set(k, String(v));
        }
      });
    }
    return this.http
      .get<ApiResponse<T>>(`${this.base}${path}`, { params: httpParams })
      .pipe(catchError(this.handleError));
  }

  post<T>(path: string, body: unknown): Observable<ApiResponse<T>> {
    return this.http
      .post<ApiResponse<T>>(`${this.base}${path}`, body)
      .pipe(catchError(this.handleError));
  }

  put<T>(path: string, body: unknown): Observable<ApiResponse<T>> {
    return this.http
      .put<ApiResponse<T>>(`${this.base}${path}`, body)
      .pipe(catchError(this.handleError));
  }

  delete<T = void>(path: string): Observable<ApiResponse<T>> {
    return this.http
      .delete<ApiResponse<T>>(`${this.base}${path}`)
      .pipe(catchError(this.handleError));
  }

  postForm<T>(path: string, formData: FormData): Observable<ApiResponse<T>> {
    return this.http
      .post<ApiResponse<T>>(`${this.base}${path}`, formData)
      .pipe(catchError(this.handleError));
  }

  getBlob(path: string, params?: Record<string, unknown>): Observable<Blob> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== '') {
          httpParams = httpParams.set(k, String(v));
        }
      });
    }
    return this.http
      .get(`${this.base}${path}`, { params: httpParams, responseType: 'blob' })
      .pipe(catchError((err: any) => throwError(() => err)));
  }

  private handleError(error: any): Observable<never> {
    const apiError: ApiResponse = {
      isSuccess: false,
      statusCode: error.status ?? 500,
      message: error.error?.message ?? 'An unexpected error occurred.',
      data: null as any,
      errors: error.error?.errors ?? []
    };
    return throwError(() => apiError);
  }
}
