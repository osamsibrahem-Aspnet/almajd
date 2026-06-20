import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { PurchasingApiService, PurchaseOrderListItemDto } from '../services/purchasing-api.service';
import { PagedResult } from '../../../core/api/paged-result';

@Component({
  selector: 'app-po-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="page-header d-flex justify-content-between align-items-center">
      <h2>{{ 'purchasing.po.title' | translate }}</h2>
      <a routerLink="/admin/purchasing/purchase-orders/new" class="btn btn-primary btn-sm">
        <i class="fas fa-plus me-1"></i>{{ 'purchasing.po.create' | translate }}
      </a>
    </div>

    <!-- Filters -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-body py-2">
        <form [formGroup]="filterForm" (ngSubmit)="applyFilters()" class="row g-2 align-items-end">
          <div class="col-sm-3">
            <input type="text" class="form-control form-control-sm" formControlName="search"
                   [placeholder]="'purchasing.po.searchPlaceholder' | translate">
          </div>
          <div class="col-sm-2">
            <select class="form-select form-select-sm" formControlName="status">
              <option value="">{{ 'common.status' | translate }}</option>
              <option value="Draft">Draft</option>
              <option value="Submitted">Submitted</option>
              <option value="Approved">Approved</option>
              <option value="PartiallyReceived">Partially Received</option>
              <option value="FullyReceived">Fully Received</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div class="col-sm-2">
            <input type="date" class="form-control form-control-sm" formControlName="from">
          </div>
          <div class="col-sm-2">
            <input type="date" class="form-control form-control-sm" formControlName="to">
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
                <th>{{ 'purchasing.po.number' | translate }}</th>
                <th>{{ 'purchasing.suppliers.name' | translate }}</th>
                <th>{{ 'common.status' | translate }}</th>
                <th>{{ 'purchasing.po.currency' | translate }}</th>
                <th class="text-end">{{ 'purchasing.po.total' | translate }}</th>
                <th>{{ 'purchasing.po.expectedAt' | translate }}</th>
                <th>{{ 'purchasing.po.lines' | translate }}</th>
                <th class="text-end">{{ 'common.actions' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="pos.length === 0">
                <td colspan="8" class="text-center text-muted py-4">{{ 'common.noData' | translate }}</td>
              </tr>
              <tr *ngFor="let po of pos">
                <td class="font-monospace fw-medium small">{{ po.number }}</td>
                <td class="small">{{ po.supplierName }}</td>
                <td>
                  <span class="badge" [class]="poStatusBadge(po.status)">{{ po.status }}</span>
                </td>
                <td>{{ po.currency }}</td>
                <td class="text-end fw-medium">{{ po.total | number:'1.2-2' }}</td>
                <td class="small text-muted">{{ po.expectedAt ? (po.expectedAt | date:'mediumDate') : '—' }}</td>
                <td><span class="badge bg-secondary">{{ po.lineCount }}</span></td>
                <td class="text-end">
                  <a [routerLink]="['/admin/purchasing/purchase-orders', po.id]" class="btn btn-sm btn-outline-primary">
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
export class PoListComponent implements OnInit {
  pos: PurchaseOrderListItemDto[] = [];
  pagedResult: PagedResult<PurchaseOrderListItemDto> | null = null;
  loading = true;
  currentPage = 1;
  pageSize = 50;

  filterForm = this.fb.group({
    search: [''], status: [''], supplierId: [''], from: [''], to: ['']
  });

  get totalPages(): number {
    return this.pagedResult ? Math.ceil(this.pagedResult.total / this.pageSize) : 1;
  }

  constructor(private fb: FormBuilder, private purchasingApi: PurchasingApiService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    const v = this.filterForm.value;
    const params: any = { page: this.currentPage, pageSize: this.pageSize };
    if (v.search) params.search = v.search;
    if (v.status) params.status = v.status;
    if (v.supplierId) params.supplierId = v.supplierId;
    if (v.from) params.from = v.from;
    if (v.to) params.to = v.to;

    this.purchasingApi.searchPOs(params).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess && res.data) {
          this.pagedResult = res.data;
          this.pos = res.data.items ?? [];
        }
      },
      error: () => { this.loading = false; }
    });
  }

  applyFilters(): void { this.currentPage = 1; this.load(); }
  resetFilters(): void {
    this.filterForm.reset();
    this.currentPage = 1;
    this.load();
  }
  changePage(p: number): void { this.currentPage = p; this.load(); }

  poStatusBadge(status: string): string {
    const map: Record<string, string> = {
      'Draft': 'badge-draft',
      'Submitted': 'badge-submitted',
      'Approved': 'badge-approved',
      'PartiallyReceived': 'badge-inpreparation',
      'FullyReceived': 'badge-delivered',
      'Cancelled': 'badge-cancelled'
    };
    return map[status] ?? 'badge-draft';
  }
}
