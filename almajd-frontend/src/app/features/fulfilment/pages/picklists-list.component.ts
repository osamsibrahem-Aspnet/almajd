import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { FulfilmentApiService, PickListDto } from '../services/fulfilment-api.service';
import { PagedResult } from '../../../core/api/paged-result';

const PICKLIST_STATUSES = ['Pending', 'InProgress', 'Completed', 'ShortPicked', 'Cancelled'];

@Component({
  selector: 'app-picklists-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="page-header">
      <h2>{{ 'fulfilment.picklists.title' | translate }}</h2>
    </div>

    <!-- Filters -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-body py-2">
        <form [formGroup]="filterForm" (ngSubmit)="applyFilters()" class="row g-2 align-items-end">
          <div class="col-sm-3">
            <select class="form-select form-select-sm" formControlName="status">
              <option value="">{{ 'fulfilment.picklists.allStatuses' | translate }}</option>
              <option *ngFor="let s of statuses" [value]="s">{{ s }}</option>
            </select>
          </div>
          <div class="col-sm-3">
            <input type="text" class="form-control form-control-sm" formControlName="orderId"
                   [placeholder]="'fulfilment.picklists.filterOrderId' | translate">
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

    <div *ngIf="error" class="alert alert-danger">{{ error }}</div>

    <div *ngIf="!loading" class="card border-0 shadow-sm">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th>{{ 'orders.number' | translate }}</th>
                <th>{{ 'orders.customer' | translate }}</th>
                <th>{{ 'common.status' | translate }}</th>
                <th class="text-center">{{ 'fulfilment.picklists.progress' | translate }}</th>
                <th>{{ 'fulfilment.picklists.picker' | translate }}</th>
                <th>{{ 'fulfilment.picklists.generatedAt' | translate }}</th>
                <th class="text-end">{{ 'common.actions' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="picklists.length === 0">
                <td colspan="7" class="text-center text-muted py-4">{{ 'common.noData' | translate }}</td>
              </tr>
              <tr *ngFor="let p of picklists">
                <td class="fw-medium font-monospace">{{ p.orderNumber }}</td>
                <td>{{ p.customerName }}</td>
                <td><span class="badge" [class]="pickStatusClass(p.status)">{{ p.status }}</span></td>
                <td class="text-center">
                  <span class="fw-medium">{{ p.completedLines }}/{{ p.totalLines }}</span>
                  <div class="progress mt-1" style="height:4px;">
                    <div class="progress-bar bg-primary"
                         [style.width]="p.totalLines > 0 ? (p.completedLines / p.totalLines * 100) + '%' : '0%'"></div>
                  </div>
                </td>
                <td class="small text-muted">{{ p.pickedByName || '—' }}</td>
                <td class="small text-muted">{{ p.generatedAt | date:'mediumDate' }}</td>
                <td class="text-end">
                  <a [routerLink]="['/admin/fulfilment/picklists', p.id]" class="btn btn-sm btn-outline-primary">
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
export class PicklistsListComponent implements OnInit {
  picklists: PickListDto[] = [];
  pagedResult: PagedResult<PickListDto> | null = null;
  loading = true;
  error = '';
  currentPage = 1;
  pageSize = 50;
  statuses = PICKLIST_STATUSES;

  filterForm = this.fb.group({
    status: [''],
    orderId: ['']
  });

  get totalPages(): number {
    return this.pagedResult ? Math.ceil(this.pagedResult.total / this.pageSize) : 1;
  }

  constructor(private fb: FormBuilder, private fulfilmentApi: FulfilmentApiService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.error = '';
    const v = this.filterForm.value;
    const params: any = { page: this.currentPage, pageSize: this.pageSize };
    if (v.status) params.status = v.status;
    if (v.orderId) params.orderId = v.orderId;

    this.fulfilmentApi.searchPickLists(params).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess && res.data) {
          this.pagedResult = res.data;
          this.picklists = res.data.items ?? [];
        } else {
          this.error = res.message;
        }
      },
      error: (err) => { this.loading = false; this.error = err?.message ?? 'Error'; }
    });
  }

  applyFilters(): void { this.currentPage = 1; this.load(); }
  resetFilters(): void {
    this.filterForm.reset({ status: '', orderId: '' });
    this.currentPage = 1; this.load();
  }
  changePage(p: number): void { this.currentPage = p; this.load(); }

  pickStatusClass(status: string): string {
    const map: Record<string, string> = {
      'Pending': 'badge-draft',
      'InProgress': 'badge-inpreparation',
      'Completed': 'badge-delivered',
      'ShortPicked': 'badge-underreview',
      'Cancelled': 'badge-cancelled'
    };
    return map[status] ?? 'badge-draft';
  }
}
