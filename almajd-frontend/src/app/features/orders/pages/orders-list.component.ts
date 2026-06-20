import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { OrdersApiService, OrderListItemDto } from '../services/orders-api.service';
import { PagedResult } from '../../../core/api/paged-result';

@Component({
  selector: 'app-orders-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="page-header">
      <h2>{{ 'orders.title' | translate }}</h2>
    </div>

    <!-- Filters -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-body py-2">
        <form [formGroup]="filterForm" (ngSubmit)="applyFilters()" class="row g-2 align-items-end">
          <div class="col-sm-3">
            <input type="text" class="form-control form-control-sm" formControlName="search"
                   placeholder="Order # / Customer">
          </div>
          <div class="col-sm-2">
            <select class="form-select form-select-sm" formControlName="status">
              <option value="">{{ 'orders.status' | translate }}</option>
              <option value="Draft">Draft</option>
              <option value="Submitted">Submitted</option>
              <option value="UnderReview">Under Review</option>
              <option value="Approved">Approved</option>
              <option value="InPreparation">In Preparation</option>
              <option value="ReadyToShip">Ready to Ship</option>
              <option value="Shipped">Shipped</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div class="col-sm-2">
            <select class="form-select form-select-sm" formControlName="channel">
              <option value="">{{ 'orders.channel' | translate }}</option>
              <option value="App">App</option>
              <option value="Phone">Phone</option>
              <option value="WalkIn">Walk-In</option>
            </select>
          </div>
          <div class="col-sm-2">
            <input type="date" class="form-control form-control-sm" formControlName="from">
          </div>
          <div class="col-sm-2">
            <input type="date" class="form-control form-control-sm" formControlName="to">
          </div>
          <div class="col-auto">
            <div class="form-check d-inline-flex align-items-center gap-1">
              <input type="checkbox" class="form-check-input" formControlName="late" id="lateChk">
              <label class="form-check-label small" for="lateChk">{{ 'orders.filterLate' | translate }}</label>
            </div>
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
                <th>{{ 'orders.number' | translate }}</th>
                <th>{{ 'orders.customer' | translate }}</th>
                <th>{{ 'orders.channel' | translate }}</th>
                <th>{{ 'orders.status' | translate }}</th>
                <th>{{ 'orders.total' | translate }}</th>
                <th>{{ 'orders.submittedAt' | translate }}</th>
                <th class="text-end">{{ 'common.actions' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="orders.length === 0">
                <td colspan="7" class="text-center text-muted py-4">{{ 'common.noData' | translate }}</td>
              </tr>
              <tr *ngFor="let o of orders" [class.table-warning]="o.isLate && o.status !== 'Delivered' && o.status !== 'Cancelled'">
                <td>
                  <span class="fw-medium font-monospace">{{ o.number }}</span>
                  <span *ngIf="o.isLate && o.status !== 'Delivered' && o.status !== 'Cancelled'"
                        class="badge badge-cancelled ms-1" style="font-size: 0.65rem;">LATE</span>
                </td>
                <td>
                  <div class="fw-medium small">{{ o.customerName }}</div>
                  <small class="text-muted">{{ o.customerCode }}</small>
                </td>
                <td><span class="badge bg-secondary">{{ o.channel }}</span></td>
                <td>
                  <span class="badge" [class]="statusBadgeClass(o.status)">
                    {{ o.status }}
                  </span>
                </td>
                <td class="fw-medium">{{ o.currency }} {{ o.total | number:'1.2-2' }}</td>
                <td class="small text-muted">{{ o.submittedAt ? (o.submittedAt | date:'mediumDate') : '—' }}</td>
                <td class="text-end">
                  <a [routerLink]="['/admin/orders', o.id]" class="btn btn-sm btn-outline-primary">
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
export class OrdersListComponent implements OnInit {
  orders: OrderListItemDto[] = [];
  pagedResult: PagedResult<OrderListItemDto> | null = null;
  loading = true;
  currentPage = 1;
  pageSize = 50;

  filterForm = this.fb.group({
    search:  [''],
    status:  [''],
    channel: [''],
    from:    [''],
    to:      [''],
    late:    [false]
  });

  get totalPages(): number {
    return this.pagedResult ? Math.ceil(this.pagedResult.total / this.pageSize) : 1;
  }

  constructor(private fb: FormBuilder, private ordersApi: OrdersApiService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    const v = this.filterForm.value;
    const params: any = { page: this.currentPage, pageSize: this.pageSize };
    if (v.search)  params.search  = v.search;
    if (v.status)  params.status  = v.status;
    if (v.channel) params.channel = v.channel;
    if (v.from)    params.from    = v.from;
    if (v.to)      params.to      = v.to;
    if (v.late)    params.late    = true;

    this.ordersApi.search(params).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess && res.data) {
          this.pagedResult = res.data;
          this.orders = res.data.items ?? [];
        }
      },
      error: () => { this.loading = false; }
    });
  }

  applyFilters(): void { this.currentPage = 1; this.load(); }
  resetFilters(): void {
    this.filterForm.reset({ search: '', status: '', channel: '', from: '', to: '', late: false });
    this.currentPage = 1;
    this.load();
  }
  changePage(p: number): void { this.currentPage = p; this.load(); }

  statusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      'Draft': 'badge-draft', 'Submitted': 'badge-submitted',
      'UnderReview': 'badge-underreview', 'Approved': 'badge-approved',
      'InPreparation': 'badge-inpreparation', 'ReadyToShip': 'badge-readytoship',
      'Shipped': 'badge-shipped', 'Delivered': 'badge-delivered',
      'Closed': 'badge-closed', 'Cancelled': 'badge-cancelled'
    };
    return map[status] ?? 'badge-draft';
  }
}
