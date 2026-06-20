import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CustomersApiService, CustomerListItemDto } from '../services/customers-api.service';
import { PagedResult } from '../../../core/api/paged-result';

@Component({
  selector: 'app-customers-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="page-header d-flex justify-content-between align-items-center">
      <h2>{{ 'customers.title' | translate }}</h2>
      <a routerLink="/admin/customers/new" class="btn btn-primary btn-sm">
        <i class="fas fa-plus me-1"></i>{{ 'common.create' | translate }}
      </a>
    </div>

    <!-- Filters -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-body py-2">
        <form [formGroup]="filterForm" (ngSubmit)="applyFilters()" class="row g-2 align-items-end">
          <div class="col-sm-4">
            <input type="text" class="form-control form-control-sm" formControlName="search"
                   [placeholder]="'common.search' | translate">
          </div>
          <div class="col-sm-3 col-md-2">
            <select class="form-select form-select-sm" formControlName="tier">
              <option value="">{{ 'customers.tier' | translate }}</option>
              <option value="VIP">VIP</option>
              <option value="Mid">Mid</option>
              <option value="Small">Small</option>
            </select>
          </div>
          <div class="col-sm-3 col-md-2">
            <select class="form-select form-select-sm" formControlName="status">
              <option value="">{{ 'customers.status' | translate }}</option>
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
              <option value="FollowUp">Follow-Up</option>
            </select>
          </div>
          <div class="col-auto">
            <button type="submit" class="btn btn-primary btn-sm">
              <i class="fas fa-search me-1"></i>{{ 'common.filter' | translate }}
            </button>
            <button type="button" class="btn btn-outline-secondary btn-sm ms-1" (click)="resetFilters()">
              {{ 'common.cancel' | translate }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div *ngIf="loading" class="text-center py-4">
      <div class="spinner-border" style="color: var(--primary);"></div>
    </div>

    <div *ngIf="!loading" class="card border-0 shadow-sm">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th>{{ 'customers.code' | translate }}</th>
                <th>{{ 'customers.legalName' | translate }}</th>
                <th>{{ 'customers.tier' | translate }}</th>
                <th>{{ 'customers.status' | translate }}</th>
                <th>{{ 'customers.creditLimit' | translate }}</th>
                <th>{{ 'customers.currentAr' | translate }}</th>
                <th>{{ 'customers.salesRep' | translate }}</th>
                <th class="text-end">{{ 'common.actions' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="customers.length === 0">
                <td colspan="8" class="text-center text-muted py-4">{{ 'common.noData' | translate }}</td>
              </tr>
              <tr *ngFor="let c of customers">
                <td class="fw-medium font-monospace small">{{ c.code }}</td>
                <td>
                  <div class="fw-medium">{{ c.legalName }}</div>
                  <small class="text-muted" *ngIf="c.tradeName">{{ c.tradeName }}</small>
                </td>
                <td>
                  <span class="badge"
                    [class.badge-vip]="c.tier === 'VIP'"
                    [class.badge-mid]="c.tier === 'Mid'"
                    [class.badge-small]="c.tier === 'Small'">
                    {{ c.tier }}
                  </span>
                </td>
                <td>
                  <span class="badge"
                    [class.badge-active]="c.status === 'Active'"
                    [class.badge-suspended]="c.status === 'Suspended'"
                    [class.badge-followup]="c.status === 'FollowUp'">
                    {{ c.status }}
                  </span>
                </td>
                <td class="small">{{ c.creditLimit | number:'1.0-0' }}</td>
                <td class="small" [class.text-danger]="c.currentAr > c.creditLimit * 0.9">
                  {{ c.currentAr | number:'1.0-0' }}
                </td>
                <td class="small text-muted">{{ c.salesRepName ?? '—' }}</td>
                <td class="text-end">
                  <a [routerLink]="['/admin/customers', c.id]" class="btn btn-sm btn-outline-primary">
                    <i class="fas fa-eye"></i>
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div *ngIf="pagedResult" class="card-footer d-flex align-items-center justify-content-between bg-transparent">
        <small class="text-muted">{{ 'common.total' | translate }}: {{ pagedResult.total }}</small>
        <div class="d-flex gap-2 align-items-center">
          <button class="btn btn-sm btn-outline-secondary" [disabled]="currentPage <= 1" (click)="changePage(currentPage - 1)">
            <i class="fas fa-chevron-left"></i>
          </button>
          <small>{{ 'common.page' | translate }} {{ currentPage }} {{ 'common.of' | translate }} {{ totalPages }}</small>
          <button class="btn btn-sm btn-outline-secondary" [disabled]="currentPage >= totalPages" (click)="changePage(currentPage + 1)">
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>
  `
})
export class CustomersListComponent implements OnInit {
  customers: CustomerListItemDto[] = [];
  pagedResult: PagedResult<CustomerListItemDto> | null = null;
  loading = true;
  currentPage = 1;
  pageSize = 50;

  filterForm = this.fb.group({ search: [''], tier: [''], status: [''] });

  get totalPages(): number {
    return this.pagedResult ? Math.ceil(this.pagedResult.total / this.pageSize) : 1;
  }

  constructor(private fb: FormBuilder, private customersApi: CustomersApiService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    const v = this.filterForm.value;
    const params: any = { page: this.currentPage, pageSize: this.pageSize };
    if (v.search) params.search = v.search;
    if (v.tier)   params.tier   = v.tier;
    if (v.status) params.status = v.status;

    this.customersApi.search(params).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess && res.data) {
          this.pagedResult = res.data;
          this.customers = res.data.items ?? [];
        }
      },
      error: () => { this.loading = false; }
    });
  }

  applyFilters(): void { this.currentPage = 1; this.load(); }
  resetFilters(): void {
    this.filterForm.reset({ search: '', tier: '', status: '' });
    this.currentPage = 1;
    this.load();
  }
  changePage(p: number): void { this.currentPage = p; this.load(); }
}
