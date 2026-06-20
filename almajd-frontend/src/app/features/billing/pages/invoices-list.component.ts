import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BillingApiService, InvoiceListItemDto } from '../services/billing-api.service';
import { PagedResult } from '../../../core/api/paged-result';

@Component({
  selector: 'app-invoices-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="page-header d-flex justify-content-between align-items-center">
      <h2>{{ 'billing.invoices.title' | translate }}</h2>
      <a routerLink="/admin/billing/invoices/issue" class="btn btn-primary btn-sm">
        <i class="fas fa-plus me-1"></i>{{ 'billing.invoices.issue' | translate }}
      </a>
    </div>

    <!-- Filters -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-body py-2">
        <form [formGroup]="filterForm" (ngSubmit)="applyFilters()" class="row g-2 align-items-end">
          <div class="col-sm-3">
            <input type="text" class="form-control form-control-sm" formControlName="search"
                   [placeholder]="'billing.invoices.searchPlaceholder' | translate">
          </div>
          <div class="col-sm-2">
            <select class="form-select form-select-sm" formControlName="status">
              <option value="">{{ 'common.status' | translate }}</option>
              <option value="Draft">Draft</option>
              <option value="Issued">Issued</option>
              <option value="PartiallyPaid">Partially Paid</option>
              <option value="Paid">Paid</option>
              <option value="Voided">Voided</option>
              <option value="Overdue">Overdue</option>
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
              <input type="checkbox" class="form-check-input" formControlName="overdue" id="overdueChk">
              <label class="form-check-label small" for="overdueChk">{{ 'billing.invoices.overdueOnly' | translate }}</label>
            </div>
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
                <th>{{ 'billing.invoices.number' | translate }}</th>
                <th>{{ 'customers.legalName' | translate }}</th>
                <th>{{ 'common.status' | translate }}</th>
                <th>{{ 'billing.invoices.dueAt' | translate }}</th>
                <th class="text-end">{{ 'billing.invoices.total' | translate }}</th>
                <th class="text-end">{{ 'billing.invoices.paid' | translate }}</th>
                <th class="text-end">{{ 'billing.invoices.outstanding' | translate }}</th>
                <th>{{ 'billing.invoices.daysOverdue' | translate }}</th>
                <th class="text-end">{{ 'common.actions' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="invoices.length === 0">
                <td colspan="9" class="text-center text-muted py-4">{{ 'common.noData' | translate }}</td>
              </tr>
              <tr *ngFor="let inv of invoices" [class.table-danger]="inv.daysOverdue > 0 && inv.status !== 'Paid' && inv.status !== 'Voided'">
                <td class="font-monospace fw-medium small">{{ inv.number }}</td>
                <td class="small">{{ inv.customerName }}</td>
                <td>
                  <span class="badge" [class]="invoiceStatusBadge(inv.status)">{{ inv.status }}</span>
                </td>
                <td class="small">{{ inv.dueAt | date:'mediumDate' }}</td>
                <td class="text-end fw-medium">{{ inv.currency }} {{ inv.totalAmount | number:'1.2-2' }}</td>
                <td class="text-end small text-success">{{ inv.currency }} {{ inv.amountPaid | number:'1.2-2' }}</td>
                <td class="text-end fw-medium" [class.text-danger]="inv.outstandingAmount > 0">
                  {{ inv.currency }} {{ inv.outstandingAmount | number:'1.2-2' }}
                </td>
                <td>
                  <span *ngIf="inv.daysOverdue > 0" class="badge badge-cancelled">{{ inv.daysOverdue }}d</span>
                  <span *ngIf="inv.daysOverdue <= 0" class="text-muted small">—</span>
                </td>
                <td class="text-end">
                  <button class="btn btn-sm btn-outline-secondary me-1" (click)="downloadPdf(inv)" title="Download PDF">
                    <i class="fas fa-file-pdf"></i>
                  </button>
                  <a [routerLink]="['/admin/billing/invoices', inv.id]" class="btn btn-sm btn-outline-primary">
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
export class InvoicesListComponent implements OnInit {
  invoices: InvoiceListItemDto[] = [];
  pagedResult: PagedResult<InvoiceListItemDto> | null = null;
  loading = true;
  currentPage = 1;
  pageSize = 50;

  filterForm = this.fb.group({
    search: [''], status: [''], overdue: [false], from: [''], to: ['']
  });

  get totalPages(): number {
    return this.pagedResult ? Math.ceil(this.pagedResult.total / this.pageSize) : 1;
  }

  constructor(private fb: FormBuilder, private billingApi: BillingApiService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    const v = this.filterForm.value;
    const params: any = { page: this.currentPage, pageSize: this.pageSize };
    if (v.search) params.search = v.search;
    if (v.status) params.status = v.status;
    if (v.overdue) params.overdue = true;
    if (v.from) params.from = v.from;
    if (v.to) params.to = v.to;

    this.billingApi.searchInvoices(params).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess && res.data) { this.pagedResult = res.data; this.invoices = res.data.items ?? []; }
      },
      error: () => { this.loading = false; }
    });
  }

  applyFilters(): void { this.currentPage = 1; this.load(); }
  resetFilters(): void { this.filterForm.reset({ overdue: false }); this.currentPage = 1; this.load(); }
  changePage(p: number): void { this.currentPage = p; this.load(); }

  downloadPdf(inv: InvoiceListItemDto): void {
    this.billingApi.downloadInvoicePdf(inv.id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${inv.number}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  }

  invoiceStatusBadge(status: string): string {
    const map: Record<string, string> = {
      'Draft': 'badge-draft', 'Issued': 'badge-submitted', 'PartiallyPaid': 'badge-inpreparation',
      'Paid': 'badge-delivered', 'Voided': 'badge-cancelled', 'Overdue': 'badge-cancelled'
    };
    return map[status] ?? 'badge-draft';
  }
}
