import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BillingApiService, PaymentListItemDto } from '../services/billing-api.service';
import { PagedResult } from '../../../core/api/paged-result';

@Component({
  selector: 'app-payments-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="page-header d-flex justify-content-between align-items-center">
      <h2>{{ 'billing.payments.title' | translate }}</h2>
      <a routerLink="/admin/billing/payments/new" class="btn btn-primary btn-sm">
        <i class="fas fa-plus me-1"></i>{{ 'billing.payments.record' | translate }}
      </a>
    </div>

    <!-- Filters -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-body py-2">
        <form [formGroup]="filterForm" (ngSubmit)="applyFilters()" class="row g-2 align-items-end">
          <div class="col-sm-2">
            <select class="form-select form-select-sm" formControlName="method">
              <option value="">{{ 'billing.payments.allMethods' | translate }}</option>
              <option value="Cash">Cash</option>
              <option value="BankTransfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
              <option value="Card">Card</option>
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
            <button type="button" class="btn btn-outline-secondary btn-sm ms-1" (click)="resetFilters()">{{ 'common.cancel' | translate }}</button>
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
                <th>{{ 'billing.payments.number' | translate }}</th>
                <th>{{ 'customers.legalName' | translate }}</th>
                <th>{{ 'billing.payments.method' | translate }}</th>
                <th class="text-end">{{ 'billing.payments.amount' | translate }}</th>
                <th class="text-end">{{ 'billing.payments.allocated' | translate }}</th>
                <th class="text-end">{{ 'billing.payments.unallocated' | translate }}</th>
                <th>{{ 'billing.payments.paidAt' | translate }}</th>
                <th>{{ 'billing.payments.reference' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="payments.length === 0">
                <td colspan="8" class="text-center text-muted py-4">{{ 'common.noData' | translate }}</td>
              </tr>
              <tr *ngFor="let p of payments">
                <td class="font-monospace fw-medium small">{{ p.number }}</td>
                <td class="small">{{ p.customerName }}</td>
                <td><span class="badge bg-secondary">{{ p.paymentMethod }}</span></td>
                <td class="text-end fw-medium">{{ p.totalAmount | number:'1.2-2' }}</td>
                <td class="text-end small text-success">{{ p.allocatedAmount | number:'1.2-2' }}</td>
                <td class="text-end small" [class.text-warning]="p.unallocatedAmount > 0">
                  {{ p.unallocatedAmount | number:'1.2-2' }}
                </td>
                <td class="small text-muted">{{ p.paidAt | date:'mediumDate' }}</td>
                <td class="small text-muted">{{ p.referenceNumber ?? '—' }}</td>
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
export class PaymentsListComponent implements OnInit {
  payments: PaymentListItemDto[] = [];
  pagedResult: PagedResult<PaymentListItemDto> | null = null;
  loading = true;
  currentPage = 1;
  pageSize = 50;

  filterForm = this.fb.group({ method: [''], from: [''], to: [''] });

  get totalPages(): number {
    return this.pagedResult ? Math.ceil(this.pagedResult.total / this.pageSize) : 1;
  }

  constructor(private fb: FormBuilder, private billingApi: BillingApiService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    const v = this.filterForm.value;
    const params: any = { page: this.currentPage, pageSize: this.pageSize };
    if (v.method) params.method = v.method;
    if (v.from) params.from = v.from;
    if (v.to) params.to = v.to;
    this.billingApi.searchPayments(params).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess && res.data) { this.pagedResult = res.data; this.payments = res.data.items ?? []; }
      },
      error: () => { this.loading = false; }
    });
  }

  applyFilters(): void { this.currentPage = 1; this.load(); }
  resetFilters(): void { this.filterForm.reset(); this.currentPage = 1; this.load(); }
  changePage(p: number): void { this.currentPage = p; this.load(); }
}
