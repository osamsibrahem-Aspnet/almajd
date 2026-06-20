import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SystemApiService, UserDto } from '../services/system-api.service';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="page-header d-flex align-items-center justify-content-between flex-wrap gap-2">
      <h2>{{ 'system.users.title' | translate }}</h2>
      <a routerLink="/admin/system/users/new" class="btn btn-primary btn-sm">
        <i class="fas fa-plus me-1"></i>{{ 'system.users.create' | translate }}
      </a>
    </div>

    <!-- Filters -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-body py-2">
        <form [formGroup]="filterForm" (ngSubmit)="load()">
          <div class="row g-2 align-items-end flex-wrap">
            <div class="col-sm-4">
              <input type="search" class="form-control form-control-sm"
                     formControlName="search"
                     [placeholder]="'system.users.searchPlaceholder' | translate">
            </div>
            <div class="col-sm-3">
              <select class="form-select form-select-sm" formControlName="role">
                <option value="">{{ 'system.users.allRoles' | translate }}</option>
                <option *ngFor="let r of availableRoles" [value]="r">{{ r }}</option>
              </select>
            </div>
            <div class="col-sm-auto">
              <div class="form-check mt-1">
                <input type="checkbox" class="form-check-input" id="lockedFilter" formControlName="isLockedOut">
                <label class="form-check-label small" for="lockedFilter">
                  {{ 'system.users.lockedOnly' | translate }}
                </label>
              </div>
            </div>
            <div class="col-sm-auto">
              <button type="submit" class="btn btn-primary btn-sm">
                <i class="fas fa-filter me-1"></i>{{ 'common.filter' | translate }}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <div *ngIf="loading" class="text-center py-5">
      <div class="spinner-border" style="color:var(--primary)"></div>
    </div>
    <div *ngIf="error" class="alert alert-danger">{{ error }}</div>

    <div *ngIf="!loading" class="card border-0 shadow-sm">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th>{{ 'system.users.email' | translate }}</th>
                <th>{{ 'system.users.fullName' | translate }}</th>
                <th>{{ 'system.users.phone' | translate }}</th>
                <th>{{ 'system.users.roles' | translate }}</th>
                <th>{{ 'common.status' | translate }}</th>
                <th class="text-end">{{ 'common.actions' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="users.length === 0">
                <td colspan="6" class="text-center text-muted py-4">{{ 'common.noData' | translate }}</td>
              </tr>
              <tr *ngFor="let u of users">
                <td class="small">{{ u.email }}</td>
                <td class="small fw-medium">{{ u.fullName }}</td>
                <td class="small text-muted">{{ u.phone }}</td>
                <td>
                  <span class="badge bg-primary me-1 mb-1" *ngFor="let r of u.roles">{{ r }}</span>
                </td>
                <td>
                  <span class="badge" [class]="u.isLockedOut ? 'bg-danger' : 'bg-success'">
                    {{ (u.isLockedOut ? 'system.users.locked' : 'system.users.active') | translate }}
                  </span>
                </td>
                <td class="text-end">
                  <div class="d-flex gap-1 justify-content-end">
                    <a [routerLink]="['/admin/system/users', u.id]" class="btn btn-sm btn-outline-primary">
                      <i class="fas fa-eye"></i>
                    </a>
                    <button *ngIf="!u.isLockedOut" class="btn btn-sm btn-outline-warning" (click)="deactivate(u)" [disabled]="actionId === u.id">
                      <i class="fas fa-ban"></i>
                    </button>
                    <button *ngIf="u.isLockedOut" class="btn btn-sm btn-outline-success" (click)="activate(u)" [disabled]="actionId === u.id">
                      <i class="fas fa-check"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <!-- Pagination -->
      <div class="card-footer bg-transparent d-flex justify-content-between align-items-center flex-wrap gap-2" *ngIf="total > pageSize">
        <span class="small text-muted">{{ 'common.total' | translate }}: {{ total }}</span>
        <nav>
          <ul class="pagination pagination-sm mb-0">
            <li class="page-item" [class.disabled]="page <= 1">
              <button class="page-link" (click)="changePage(page - 1)">{{ 'common.previous' | translate }}</button>
            </li>
            <li class="page-item disabled">
              <span class="page-link">{{ page }} / {{ totalPages }}</span>
            </li>
            <li class="page-item" [class.disabled]="page >= totalPages">
              <button class="page-link" (click)="changePage(page + 1)">{{ 'common.next' | translate }}</button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  `
})
export class UsersListComponent implements OnInit {
  loading = false;
  error = '';
  users: UserDto[] = [];
  availableRoles: string[] = [];
  total = 0;
  page = 1;
  pageSize = 20;
  actionId: string | null = null;

  filterForm = this.fb.group({
    search: [''],
    role: [''],
    isLockedOut: [false]
  });

  constructor(private fb: FormBuilder, private systemApi: SystemApiService) {}

  ngOnInit(): void {
    this.systemApi.listRoles().subscribe({
      next: res => { if (res.isSuccess && res.data) this.availableRoles = res.data; }
    });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    const v = this.filterForm.value;
    const q: Record<string, unknown> = { page: this.page, pageSize: this.pageSize };
    if (v.search) q['search'] = v.search;
    if (v.role) q['role'] = v.role;
    if (v.isLockedOut) q['isLockedOut'] = true;
    this.systemApi.searchUsers(q as any).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess && res.data) {
          this.users = res.data.items;
          this.total = res.data.total;
        } else {
          this.error = res.message;
        }
      },
      error: err => { this.loading = false; this.error = err?.message ?? 'Error'; }
    });
  }

  changePage(p: number): void {
    this.page = p;
    this.load();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  deactivate(u: UserDto): void {
    this.actionId = u.id;
    this.systemApi.deactivateUser(u.id).subscribe({
      next: res => {
        this.actionId = null;
        if (res.isSuccess) { u.isLockedOut = true; }
        else this.error = res.message;
      },
      error: err => { this.actionId = null; this.error = err?.message ?? 'Error'; }
    });
  }

  activate(u: UserDto): void {
    this.actionId = u.id;
    this.systemApi.activateUser(u.id).subscribe({
      next: res => {
        this.actionId = null;
        if (res.isSuccess) { u.isLockedOut = false; }
        else this.error = res.message;
      },
      error: err => { this.actionId = null; this.error = err?.message ?? 'Error'; }
    });
  }
}
