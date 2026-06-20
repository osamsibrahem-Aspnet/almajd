import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BillingApiService, InvoiceListItemDto, PaymentCreateDto } from '../services/billing-api.service';
import { CustomersApiService, CustomerListItemDto } from '../../customers/services/customers-api.service';

@Component({
  selector: 'app-record-payment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="page-header">
      <a routerLink="/admin/billing/payments" class="text-muted text-decoration-none small">
        <i class="fas fa-arrow-left me-1"></i>{{ 'billing.payments.title' | translate }}
      </a>
      <h2 class="mt-1">{{ 'billing.payments.record' | translate }}</h2>
    </div>

    <div *ngIf="error" class="alert alert-danger">{{ error }}</div>

    <form [formGroup]="form" (ngSubmit)="doSave()">
      <!-- Header -->
      <div class="card border-0 shadow-sm mb-3">
        <div class="card-header bg-transparent fw-medium">{{ 'billing.payments.header' | translate }}</div>
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-4">
              <label class="form-label small fw-medium">{{ 'customers.legalName' | translate }} *</label>
              <select class="form-select form-select-sm" formControlName="customerId" (change)="onCustomerChange()">
                <option value="">{{ 'billing.payments.selectCustomer' | translate }}</option>
                <option *ngFor="let c of customers" [value]="c.id">{{ c.legalName }} ({{ c.code }})</option>
              </select>
              <small *ngIf="form.get('customerId')?.invalid && form.get('customerId')?.touched" class="text-danger">
                {{ 'billing.payments.customerRequired' | translate }}
              </small>
            </div>
            <div class="col-md-3">
              <label class="form-label small fw-medium">{{ 'billing.payments.method' | translate }} *</label>
              <select class="form-select form-select-sm" formControlName="paymentMethod">
                <option value="">{{ 'billing.payments.selectMethod' | translate }}</option>
                <option value="Cash">Cash</option>
                <option value="BankTransfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
                <option value="Card">Card</option>
              </select>
              <small *ngIf="form.get('paymentMethod')?.invalid && form.get('paymentMethod')?.touched" class="text-danger">
                {{ 'billing.payments.methodRequired' | translate }}
              </small>
            </div>
            <div class="col-md-2">
              <label class="form-label small fw-medium">{{ 'billing.payments.paidAt' | translate }} *</label>
              <input type="date" class="form-control form-control-sm" formControlName="paidAt">
            </div>
            <div class="col-md-3">
              <label class="form-label small fw-medium">{{ 'billing.payments.reference' | translate }}</label>
              <input type="text" class="form-control form-control-sm" formControlName="referenceNumber">
            </div>
            <div class="col-md-4">
              <label class="form-label small fw-medium">{{ 'billing.payments.totalAmount' | translate }} *</label>
              <input type="number" class="form-control form-control-sm" formControlName="totalAmount" min="0.01" step="0.01">
              <small *ngIf="form.get('totalAmount')?.invalid && form.get('totalAmount')?.touched" class="text-danger">
                {{ 'billing.payments.amountRequired' | translate }}
              </small>
            </div>
            <div class="col-12">
              <label class="form-label small fw-medium">{{ 'inventory.counts.notes' | translate }}</label>
              <textarea class="form-control form-control-sm" formControlName="notes" rows="2"></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- Open Invoices Allocation -->
      <div class="card border-0 shadow-sm mb-3" *ngIf="openInvoices.length > 0 || invoicesLoading">
        <div class="card-header bg-transparent fw-medium">
          {{ 'billing.payments.allocate' | translate }}
          <span *ngIf="allocatedTotal > 0" class="text-muted small ms-2">
            {{ 'billing.payments.allocated' | translate }}: {{ allocatedTotal | number:'1.2-2' }}
          </span>
        </div>
        <div *ngIf="invoicesLoading" class="p-3 text-center">
          <div class="spinner-border spinner-border-sm" style="color: var(--primary);"></div>
        </div>
        <div *ngIf="!invoicesLoading" class="table-responsive">
          <table class="table table-sm mb-0">
            <thead class="table-light">
              <tr>
                <th>{{ 'billing.invoices.number' | translate }}</th>
                <th>{{ 'billing.invoices.dueAt' | translate }}</th>
                <th class="text-end">{{ 'billing.invoices.outstanding' | translate }}</th>
                <th>{{ 'billing.payments.allocateAmount' | translate }}</th>
              </tr>
            </thead>
            <tbody formArrayName="allocations">
              <tr *ngFor="let alloc of allocations.controls; let i = index" [formGroupName]="i">
                <td class="font-monospace small">{{ openInvoices[i] ? openInvoices[i].number : '' }}</td>
                <td class="small text-muted">{{ openInvoices[i] ? openInvoices[i].dueAt : null | date:'mediumDate' }}</td>
                <td class="text-end fw-medium small" [class.text-danger]="openInvoices[i] && openInvoices[i].daysOverdue > 0">
                  {{ openInvoices[i] ? openInvoices[i].currency : '' }} {{ openInvoices[i] ? openInvoices[i].outstandingAmount : 0 | number:'1.2-2' }}
                </td>
                <td>
                  <input type="number" class="form-control form-control-sm" formControlName="allocatedAmount"
                         min="0" [attr.max]="openInvoices[i] ? openInvoices[i].outstandingAmount : null" step="0.01" style="width:120px"
                         (input)="updateAllocatedTotal()">
                  <small *ngIf="alloc.get('allocatedAmount')?.invalid && alloc.get('allocatedAmount')?.touched" class="text-danger">
                    {{ 'billing.payments.allocInvalid' | translate }}
                  </small>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="d-flex gap-2">
        <button type="submit" class="btn btn-primary" [disabled]="saving || form.invalid">
          <span *ngIf="saving" class="spinner-border spinner-border-sm me-1"></span>
          <i class="fas fa-check me-1"></i>{{ 'billing.payments.confirm' | translate }}
        </button>
        <a routerLink="/admin/billing/payments" class="btn btn-outline-secondary">{{ 'common.cancel' | translate }}</a>
      </div>
    </form>
  `
})
export class RecordPaymentComponent implements OnInit {
  customers: CustomerListItemDto[] = [];
  openInvoices: InvoiceListItemDto[] = [];
  invoicesLoading = false;
  saving = false;
  error = '';
  allocatedTotal = 0;

  form = this.fb.group({
    customerId: ['', Validators.required],
    paymentMethod: ['', Validators.required],
    totalAmount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    referenceNumber: [''],
    paidAt: [new Date().toISOString().split('T')[0], Validators.required],
    notes: [''],
    allocations: this.fb.array([])
  });

  get allocations(): FormArray {
    return this.form.get('allocations') as FormArray;
  }

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private billingApi: BillingApiService,
    private customersApi: CustomersApiService
  ) {}

  ngOnInit(): void {
    this.customersApi.search({ pageSize: 200 }).subscribe({
      next: res => { if (res.isSuccess) this.customers = res.data?.items ?? []; }
    });
  }

  onCustomerChange(): void {
    const customerId = this.form.value.customerId;
    if (!customerId) return;
    this.invoicesLoading = true;
    while (this.allocations.length) this.allocations.removeAt(0);
    this.openInvoices = [];

    this.billingApi.searchInvoices({ customerId, status: 'Issued', pageSize: 100 }).subscribe({
      next: res => {
        this.invoicesLoading = false;
        if (res.isSuccess) {
          // Combine Issued + PartiallyPaid + Overdue
          const issued = res.data?.items ?? [];
          this.billingApi.searchInvoices({ customerId, status: 'PartiallyPaid', pageSize: 100 }).subscribe({
            next: r2 => {
              this.openInvoices = [...issued, ...(r2.data?.items ?? [])].filter(i => i.outstandingAmount > 0);
              this.openInvoices.forEach(inv => {
                this.allocations.push(this.fb.group({
                  invoiceId: [inv.id],
                  allocatedAmount: [0, [Validators.min(0), Validators.max(inv.outstandingAmount)]]
                }));
              });
            }
          });
        }
      },
      error: () => { this.invoicesLoading = false; }
    });
  }

  updateAllocatedTotal(): void {
    this.allocatedTotal = this.allocations.controls.reduce((sum, c) => sum + (c.get('allocatedAmount')?.value ?? 0), 0);
  }

  doSave(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const v = this.form.value;
    const dto: PaymentCreateDto = {
      customerId: v.customerId!,
      paymentMethod: v.paymentMethod!,
      totalAmount: v.totalAmount!,
      referenceNumber: v.referenceNumber || undefined,
      paidAt: v.paidAt!,
      notes: v.notes || undefined,
      allocations: (v.allocations as any[])
        .filter(a => a.allocatedAmount > 0)
        .map(a => ({ invoiceId: a.invoiceId, allocatedAmount: a.allocatedAmount }))
    };
    this.billingApi.createPayment(dto).subscribe({
      next: res => {
        this.saving = false;
        if (res.isSuccess) {
          this.router.navigate(['/admin/billing/payments']);
        } else {
          this.error = res.message;
        }
      },
      error: (err: any) => { this.saving = false; this.error = err?.message ?? 'Error'; }
    });
  }
}
