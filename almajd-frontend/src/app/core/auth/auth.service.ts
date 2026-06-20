import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiResponse } from '../api/api-response';
import { environment } from '../../../environments/environment';

export interface AuthUser {
  userId: string;
  email: string;
  fullName: string;
  roles: string[];
  customerId?: string;
}

export interface OtpRequestDto {
  phone: string;
}

export interface OtpVerifyDto {
  phone: string;
  code: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponseDto {
  userId: string;
  email: string;
  fullName: string;
  roles: string[];
  token: string;
  expiresAt: string;
}

const TOKEN_KEY = 'almajd_token';
const USER_KEY  = 'almajd_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly base = environment.apiUrl;
  private _currentUser$ = new BehaviorSubject<AuthUser | null>(this.loadUser());

  currentUser$ = this._currentUser$.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  get currentUser(): AuthUser | null {
    return this._currentUser$.value;
  }

  get roles(): string[] {
    return this._currentUser$.value?.roles ?? [];
  }

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  get isAuthenticated(): boolean {
    return !!this.token && !!this.currentUser;
  }

  login(dto: LoginDto): Observable<ApiResponse<AuthResponseDto>> {
    return this.http
      .post<ApiResponse<AuthResponseDto>>(`${this.base}/api/auth/login`, dto)
      .pipe(
        tap(res => {
          if (res.isSuccess && res.data) {
            localStorage.setItem(TOKEN_KEY, res.data.token);
            const user: AuthUser = {
              userId: res.data.userId,
              email: res.data.email,
              fullName: res.data.fullName ?? '',
              roles: res.data.roles ?? []
            };
            localStorage.setItem(USER_KEY, JSON.stringify(user));
            this._currentUser$.next(user);
          }
        })
      );
  }

  otpRequest(dto: OtpRequestDto): Observable<ApiResponse<void>> {
    return this.http
      .post<ApiResponse<void>>(`${this.base}/api/auth/otp/request`, dto)
      .pipe(catchError((err: any) => {
        const apiError: ApiResponse<void> = {
          isSuccess: false,
          statusCode: err.status ?? 500,
          message: err.error?.message ?? 'OTP request failed.',
          data: undefined as any,
          errors: err.error?.errors ?? []
        };
        return throwError(() => apiError);
      }));
  }

  otpVerify(dto: OtpVerifyDto): Observable<ApiResponse<AuthResponseDto>> {
    return this.http
      .post<ApiResponse<AuthResponseDto>>(`${this.base}/api/auth/otp/verify`, dto)
      .pipe(
        tap(res => {
          if (res.isSuccess && res.data) {
            localStorage.setItem(TOKEN_KEY, res.data.token);
            const user: AuthUser = {
              userId: res.data.userId,
              email: res.data.email,
              fullName: res.data.fullName ?? '',
              roles: res.data.roles ?? []
            };
            localStorage.setItem(USER_KEY, JSON.stringify(user));
            this._currentUser$.next(user);
          }
        }),
        catchError((err: any) => {
          const apiError: ApiResponse<AuthResponseDto> = {
            isSuccess: false,
            statusCode: err.status ?? 500,
            message: err.error?.message ?? 'OTP verification failed.',
            data: null as any,
            errors: err.error?.errors ?? []
          };
          return throwError(() => apiError);
        })
      );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._currentUser$.next(null);
    this.router.navigate(['/login']);
  }

  hasRole(...roles: string[]): boolean {
    return roles.some(r => this.roles.includes(r));
  }

  private loadUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
