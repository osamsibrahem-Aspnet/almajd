import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BillingApiService, PaymentDto } from '../services/billing-api.service';

@Component({
  selector: 'app-payment-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <div class="page-header d-flex justify-content-between align-items-center flex-wrap gap-2">
      <div>
        <a routerLink="/admin/billing/payments" class="text-muted text-decoration-none small">
          <i class="fas fa-arrow-left me-1"></i>{{ 'billing.payments.title' | translate }}
        </a>
        <h2 class="mt-1">{{ payment?.number || '...' }}</h2>
      </div>
    </div>

    <div *ngIf="loading" class="text-center py-5">
      <div class="spinner-border" style="color:var(--primary)"></div>
    </div>
    <div *ngIf="error" class="alert alert-danger">{{ error }}</div>

    <div *ngIf="payment && !loading" class="row g-3">
      <!-- Header card -->
      <div class="col-lg-5">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-header bg-transparent fw-semibold">{{ 'billing.payments.header' | translate }}</div>
          <div class="card-body">
            <dl class="row small mb-0">
              <dt class="col-5 text-muted">{{ 'billing.payments.number' | translate }}</dt>
              <dd class="col-7 font-monospace fw-medium">{{ payment.number }}</dd>

              <dt class="col-5 text-muted">{{ 'orders.customer' | translate }}</dt>
              <dd class="col-7">
                <a [routerLink]="['/admin/customers', payment.customerId]" class="text-primary">
                  {{ payment.customerName }}
                </a>
              </dd>

              <dt class="col-5 text-muted">{{ 'billing.payments.method' | translate }}</dt>
              <dd class="col-7">{{ payment.paymentMethod }}</dd>

              <dt class="col-5 text-muted">{{ 'billing.payments.paidAt' | translate }}</dt>
              <dd class="col-7">{{ payment.paidAt | date:'mediumDate' }}</dd>

              <dt class="col-5 text-muted">{{ 'billing.payments.reference' | translate }}</dt>
              <dd class="col-7">{{ payment.referenceNumber || '—' }}</dd>
            </dl>
          </div>
        </div>
      </div>

      <!-- Totals card -->
      <div class="col-lg-7">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-header bg-transparent fw-semibold">{{ 'common.total' | translate }}</div>
          <div class="card-body">
            <div class="row g-3">
              <div class="col-4 text-center">
                <div class="fw-bold fs-4" style="color:var(--primary)">{{ payment.totalAmount | number:'1.2-2' }}</div>
                <div class="small text-muted">{{ 'billing.payments.amount' | translate }}</div>
              </div>
              <div class="col-4 text-center">
                <div class="fw-bold fs-4 text-success">{{ payment.allocatedAmount | number:'1.2-2' }}</div>
                <div class="small text-muted">{{ 'billing.payments.allocated' | translate }}</div>
              </div>
              <div class="col-4 text-center">
                <div class="fw-bold fs-4" [class.text-warning]="payment.unallocatedAmount > 0">
                  {{ payment.unallocatedAmount | number:'1.2-2' }}
                </div>
                <div class="small text-muted">{{ 'billing.payments.unallocated' | translate }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Allocations table -->
      <div class="col-12">
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-transparent fw-semibold">{{ 'billing.payments.allocate' | translate }}</div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover mb-0">
                <thead class="table-light">
                  <tr>
                    <th>{{ 'billing.invoices.number' | translate }}</th>
                    <th class="text-end">{{ 'billing.payments.allocateAmount' | translate }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngIf="!payment.allocations || payment.allocations.length === 0">
                    <td colspan="2" class="text-center text-muted py-4">{{ 'common.noData' | translate }}</td>
                  </tr>
                  <tr *ngFor="let a of payment.allocations">
                    <td>
                      <a [routerLink]="['/admin/billing/invoices', a.invoiceId]" class="text-primary font-monospace small">
                        {{ a.invoiceNumber || a.invoiceId }}
                      </a>
                    </td>
                    <td class="text-end fw-medium">{{ a.allocatedAmount | number:'1.2-2' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class PaymentDetailComponent implements OnInit {
  loading = false;
  error = '';
  payment: PaymentDto | null = null;

  constructor(
    private route: ActivatedRoute,
    private billingApi: BillingApiService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loading = true;
    this.billingApi.getPayment(id).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess && res.data) this.payment = res.data;
        else this.error = res.message;
      },
      error: err => { this.loading = false; this.error = err?.message ?? 'Error'; }
    });
  }
}
