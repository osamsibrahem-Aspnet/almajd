import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BillingApiService, CustomerArDto } from '../services/billing-api.service';

@Component({
  selector: 'app-customer-ar',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <div class="page-header">
      <a routerLink="/admin/billing/ar" class="text-muted text-decoration-none small">
        <i class="fas fa-arrow-left me-1"></i>{{ 'billing.ar.title' | translate }}
      </a>
      <h2 class="mt-1">{{ customerAr?.customerName ?? ('common.loading' | translate) }}</h2>
    </div>

    <div *ngIf="loading" class="text-center py-5">
      <div class="spinner-border" style="color: var(--primary);"></div>
    </div>
    <div *ngIf="error" class="alert alert-danger">{{ error }}</div>

    <div *ngIf="customerAr && !loading">
      <!-- Buckets -->
      <div class="row g-3 mb-4">
        <div class="col-sm-6 col-lg-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="kpi-label">{{ 'billing.ar.current' | translate }}</div>
              <div class="kpi-value" style="color: var(--success);">{{ customerAr.buckets.current | number:'1.2-2' }}</div>
            </div>
          </div>
        </div>
        <div class="col-sm-6 col-lg-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="kpi-label">{{ 'billing.ar.bucket030' | translate }}</div>
              <div class="kpi-value" style="color: var(--warning);">{{ customerAr.buckets.days0to30 | number:'1.2-2' }}</div>
            </div>
          </div>
        </div>
        <div class="col-sm-6 col-lg-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="kpi-label">{{ 'billing.ar.bucket3160' | translate }}</div>
              <div class="kpi-value" style="color: var(--warning);">{{ customerAr.buckets.days31to60 | number:'1.2-2' }}</div>
            </div>
          </div>
        </div>
        <div class="col-sm-6 col-lg-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="kpi-label">{{ 'billing.ar.bucket6190' | translate }}</div>
              <div class="kpi-value" style="color: var(--danger);">{{ customerAr.buckets.days61to90 | number:'1.2-2' }}</div>
            </div>
          </div>
        </div>
        <div class="col-sm-6 col-lg-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="kpi-label">{{ 'billing.ar.bucketOver90' | translate }}</div>
              <div class="kpi-value" style="color: var(--danger);">{{ customerAr.buckets.over90 | number:'1.2-2' }}</div>
            </div>
          </div>
        </div>
        <div class="col-sm-6 col-lg-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="kpi-label">{{ 'billing.ar.totalAr' | translate }}</div>
              <div class="kpi-value fw-bold">{{ customerAr.buckets.total | number:'1.2-2' }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Open Invoices -->
      <div class="card border-0 shadow-sm">
        <div class="card-header bg-transparent fw-medium">{{ 'billing.ar.openInvoices' | translate }} ({{ customerAr.openInvoices.length }})</div>
        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th>{{ 'billing.invoices.number' | translate }}</th>
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
              <tr *ngIf="customerAr.openInvoices.length === 0">
                <td colspan="8" class="text-center text-muted py-4">{{ 'common.noData' | translate }}</td>
              </tr>
              <tr *ngFor="let inv of customerAr.openInvoices"
                  [class.table-danger]="inv.daysOverdue > 0">
                <td class="font-monospace fw-medium small">{{ inv.number }}</td>
                <td><span class="badge" [class]="invoiceStatusBadge(inv.status)">{{ inv.status }}</span></td>
                <td class="small">{{ inv.dueAt | date:'mediumDate' }}</td>
                <td class="text-end small">{{ inv.currency }} {{ inv.totalAmount | number:'1.2-2' }}</td>
                <td class="text-end small text-success">{{ inv.currency }} {{ inv.amountPaid | number:'1.2-2' }}</td>
                <td class="text-end fw-medium" [class.text-danger]="inv.outstandingAmount > 0">
                  {{ inv.currency }} {{ inv.outstandingAmount | number:'1.2-2' }}
                </td>
                <td>
                  <span *ngIf="inv.daysOverdue > 0" class="badge badge-cancelled">{{ inv.daysOverdue }}d</span>
                  <span *ngIf="inv.daysOverdue <= 0" class="text-muted small">—</span>
                </td>
                <td class="text-end">
                  <a [routerLink]="['/admin/billing/invoices', inv.id]" class="btn btn-sm btn-outline-primary">
                    <i class="fas fa-eye"></i>
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class CustomerArComponent implements OnInit {
  customerAr: CustomerArDto | null = null;
  loading = true;
  error = '';

  constructor(private route: ActivatedRoute, private billingApi: BillingApiService) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.billingApi.getCustomerAr(id).subscribe({
        next: res => {
          this.loading = false;
          if (res.isSuccess) this.customerAr = res.data;
          else this.error = res.message;
        },
        error: (err: any) => { this.loading = false; this.error = err?.message ?? 'Error'; }
      });
    }
  }

  invoiceStatusBadge(status: string): string {
    const map: Record<string, string> = {
      'Draft': 'badge-draft', 'Issued': 'badge-submitted', 'PartiallyPaid': 'badge-inpreparation',
      'Paid': 'badge-delivered', 'Voided': 'badge-cancelled', 'Overdue': 'badge-cancelled'
    };
    return map[status] ?? 'badge-draft';
  }
}
