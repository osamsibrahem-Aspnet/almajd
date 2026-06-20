import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  BillingApiService,
  InvoiceDto,
  CreditNoteDto,
  CreditNoteCreateDto,
  VoidInvoiceDto
} from '../services/billing-api.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-invoice-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="page-header d-flex justify-content-between align-items-center">
      <div>
        <a routerLink="/admin/billing/invoices" class="text-muted text-decoration-none small">
          <i class="fas fa-arrow-left me-1"></i>{{ 'billing.invoices.title' | translate }}
        </a>
        <h2 class="mt-1">
          {{ invoice?.number ?? ('common.loading' | translate) }}
          <span *ngIf="invoice" class="badge ms-2 fs-6" [class]="invoiceStatusBadge(invoice.status)">{{ invoice.status }}</span>
        </h2>
      </div>
      <div *ngIf="invoice" class="d-flex gap-2">
        <button class="btn btn-outline-secondary btn-sm" (click)="downloadPdf()">
          <i class="fas fa-file-pdf me-1"></i>{{ 'billing.invoices.downloadPdf' | translate }}
        </button>
        <button *ngIf="canVoid"
                class="btn btn-danger btn-sm"
                (click)="showVoidModal = true">
          <i class="fas fa-ban me-1"></i>{{ 'billing.invoices.void' | translate }}
        </button>
      </div>
    </div>

    <div *ngIf="loading" class="text-center py-5">
      <div class="spinner-border" style="color: var(--primary);"></div>
    </div>
    <div *ngIf="error" class="alert alert-danger">{{ error }}</div>
    <div *ngIf="successMsg" class="alert alert-success py-2">{{ successMsg }}</div>

    <div *ngIf="invoice && !loading" class="row g-3">
      <!-- Left: Details + Lines -->
      <div class="col-lg-8">
        <!-- Header info -->
        <div class="card border-0 shadow-sm mb-3">
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-6">
                <table class="table table-sm table-borderless mb-0">
                  <tr><td class="text-muted small fw-medium" style="width:140px;">{{ 'customers.legalName' | translate }}</td><td class="fw-medium">{{ invoice.customerName }}</td></tr>
                  <tr *ngIf="invoice.orderNumber"><td class="text-muted small fw-medium">{{ 'orders.number' | translate }}</td>
                    <td><a [routerLink]="['/admin/orders', invoice.orderId]">{{ invoice.orderNumber }}</a></td></tr>
                  <tr><td class="text-muted small fw-medium">{{ 'billing.invoices.issuedAt' | translate }}</td><td class="small">{{ invoice.issuedAt | date:'mediumDate' }}</td></tr>
                  <tr><td class="text-muted small fw-medium">{{ 'billing.invoices.dueAt' | translate }}</td>
                    <td class="small" [class.text-danger]="invoice.daysOverdue > 0">{{ invoice.dueAt | date:'mediumDate' }}</td></tr>
                </table>
              </div>
              <div class="col-md-6" *ngIf="invoice.shipToAddressSnapshot">
                <label class="text-muted small fw-medium">{{ 'billing.invoices.shipTo' | translate }}</label>
                <p class="small mb-0">{{ invoice.shipToAddressSnapshot }}</p>
              </div>
            </div>
            <div *ngIf="invoice.voidReason" class="alert alert-warning mt-3 py-2 small mb-0">
              <strong>{{ 'billing.invoices.voidReason' | translate }}:</strong> {{ invoice.voidReason }}
            </div>
          </div>
        </div>

        <!-- Lines -->
        <div class="card border-0 shadow-sm mb-3">
          <div class="card-header bg-transparent fw-medium">
            {{ 'billing.invoices.lines' | translate }} ({{ invoice.lines.length }})
          </div>
          <div class="table-responsive">
            <table class="table table-hover mb-0">
              <thead class="table-light">
                <tr>
                  <th>{{ 'purchasing.suppliers.skuCode' | translate }}</th>
                  <th>{{ 'catalog.products.name' | translate }}</th>
                  <th class="text-center">{{ 'purchasing.po.orderedQty' | translate }}</th>
                  <th class="text-end">{{ 'billing.invoices.unitPrice' | translate }}</th>
                  <th class="text-end">{{ 'billing.invoices.discount' | translate }}</th>
                  <th class="text-end">{{ 'billing.invoices.tax' | translate }}</th>
                  <th class="text-end">{{ 'billing.invoices.lineTotal' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngIf="invoice.lines.length === 0">
                  <td colspan="7" class="text-center text-muted py-3">{{ 'common.noData' | translate }}</td>
                </tr>
                <tr *ngFor="let l of invoice.lines">
                  <td class="font-monospace small">{{ l.skuCode }}</td>
                  <td class="small">{{ l.productName }}</td>
                  <td class="text-center">{{ l.qty }}</td>
                  <td class="text-end small">{{ l.unitPrice | number:'1.2-2' }}</td>
                  <td class="text-end small text-success">{{ l.discountAmt > 0 ? ('-' + (l.discountAmt | number:'1.2-2')) : '—' }}</td>
                  <td class="text-end small">{{ l.taxAmt > 0 ? (l.taxAmt | number:'1.2-2') : '—' }}</td>
                  <td class="text-end fw-medium">{{ l.lineTotal | number:'1.2-2' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Credit Notes -->
        <div class="card border-0 shadow-sm mb-3">
          <div class="card-header bg-transparent d-flex justify-content-between align-items-center">
            <span class="fw-medium">{{ 'billing.creditNotes.title' | translate }} ({{ creditNotes.length }})</span>
            <button *ngIf="canCreditNote && invoice.status !== 'Voided' && invoice.status !== 'Paid'"
                    class="btn btn-outline-primary btn-sm"
                    (click)="showCreditNoteModal = true">
              <i class="fas fa-plus me-1"></i>{{ 'billing.creditNotes.create' | translate }}
            </button>
          </div>
          <div *ngIf="cnLoading" class="p-3 text-center">
            <div class="spinner-border spinner-border-sm" style="color: var(--primary);"></div>
          </div>
          <div *ngIf="!cnLoading && creditNotes.length === 0" class="p-3 text-muted small text-center">
            {{ 'common.noData' | translate }}
          </div>
          <div *ngIf="!cnLoading && creditNotes.length > 0" class="table-responsive">
            <table class="table table-sm mb-0">
              <thead class="table-light">
                <tr>
                  <th>{{ 'billing.creditNotes.number' | translate }}</th>
                  <th class="text-end">{{ 'billing.creditNotes.amount' | translate }}</th>
                  <th>{{ 'billing.creditNotes.reason' | translate }}</th>
                  <th>{{ 'billing.invoices.issuedAt' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let cn of creditNotes">
                  <td class="font-monospace small">{{ cn.number }}</td>
                  <td class="text-end fw-medium text-success">{{ cn.currency }} {{ cn.amount | number:'1.2-2' }}</td>
                  <td class="small">{{ cn.reason }}</td>
                  <td class="small text-muted">{{ cn.issuedAt | date:'mediumDate' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Right: Totals box -->
      <div class="col-lg-4">
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-transparent fw-medium">{{ 'billing.invoices.totals' | translate }}</div>
          <div class="card-body">
            <table class="table table-sm table-borderless mb-0">
              <tr><td class="text-muted small">{{ 'billing.invoices.subtotal' | translate }}</td><td class="text-end">{{ invoice.currency }} {{ invoice.subTotal | number:'1.2-2' }}</td></tr>
              <tr *ngIf="invoice.discountTotal > 0"><td class="text-muted small">{{ 'billing.invoices.discount' | translate }}</td><td class="text-end text-success">-{{ invoice.currency }} {{ invoice.discountTotal | number:'1.2-2' }}</td></tr>
              <tr><td class="text-muted small">{{ 'billing.invoices.tax' | translate }}</td><td class="text-end">{{ invoice.currency }} {{ invoice.taxTotal | number:'1.2-2' }}</td></tr>
              <tr class="fw-semibold border-top"><td>{{ 'billing.invoices.total' | translate }}</td><td class="text-end fs-5">{{ invoice.currency }} {{ invoice.totalAmount | number:'1.2-2' }}</td></tr>
              <tr><td class="text-muted small">{{ 'billing.invoices.paid' | translate }}</td><td class="text-end text-success">{{ invoice.currency }} {{ invoice.amountPaid | number:'1.2-2' }}</td></tr>
              <tr class="fw-bold" [class.text-danger]="invoice.outstandingAmount > 0">
                <td>{{ 'billing.invoices.outstanding' | translate }}</td>
                <td class="text-end">{{ invoice.currency }} {{ invoice.outstandingAmount | number:'1.2-2' }}</td>
              </tr>
            </table>
            <div *ngIf="invoice.daysOverdue > 0" class="mt-2 alert alert-danger py-1 small">
              <i class="fas fa-exclamation-triangle me-1"></i>
              {{ 'billing.invoices.overdueBy' | translate }} {{ invoice.daysOverdue }} {{ 'billing.invoices.days' | translate }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Void Modal -->
    <div *ngIf="showVoidModal" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.4);">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ 'billing.invoices.voidTitle' | translate }}</h5>
            <button type="button" class="btn-close" (click)="showVoidModal = false"></button>
          </div>
          <form [formGroup]="voidForm" (ngSubmit)="doVoid()">
            <div class="modal-body">
              <div *ngIf="voidError" class="alert alert-danger py-2 small">{{ voidError }}</div>
              <div class="mb-3">
                <label class="form-label small fw-medium">{{ 'billing.invoices.voidReason' | translate }} *</label>
                <textarea class="form-control" formControlName="reason" rows="3"></textarea>
                <small *ngIf="voidForm.get('reason')?.invalid && voidForm.get('reason')?.touched" class="text-danger">
                  {{ 'billing.invoices.voidReasonRequired' | translate }}
                </small>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary btn-sm" (click)="showVoidModal = false">{{ 'common.cancel' | translate }}</button>
              <button type="submit" class="btn btn-danger btn-sm" [disabled]="voiding">
                <span *ngIf="voiding" class="spinner-border spinner-border-sm me-1"></span>
                {{ 'billing.invoices.confirmVoid' | translate }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Credit Note Modal -->
    <div *ngIf="showCreditNoteModal" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.4);">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ 'billing.creditNotes.create' | translate }}</h5>
            <button type="button" class="btn-close" (click)="showCreditNoteModal = false"></button>
          </div>
          <form [formGroup]="cnForm" (ngSubmit)="doCreateCreditNote()">
            <div class="modal-body">
              <div *ngIf="cnError" class="alert alert-danger py-2 small">{{ cnError }}</div>
              <div class="mb-3">
                <label class="form-label small fw-medium">{{ 'billing.creditNotes.amount' | translate }} *</label>
                <input type="number" class="form-control" formControlName="amount" min="0.01" step="0.01">
                <small *ngIf="cnForm.get('amount')?.invalid && cnForm.get('amount')?.touched" class="text-danger">
                  {{ 'billing.creditNotes.amountRequired' | translate }}
                </small>
              </div>
              <div class="mb-3">
                <label class="form-label small fw-medium">{{ 'billing.creditNotes.reason' | translate }} *</label>
                <textarea class="form-control" formControlName="reason" rows="2"></textarea>
                <small *ngIf="cnForm.get('reason')?.invalid && cnForm.get('reason')?.touched" class="text-danger">
                  {{ 'billing.creditNotes.reasonRequired' | translate }}
                </small>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary btn-sm" (click)="showCreditNoteModal = false">{{ 'common.cancel' | translate }}</button>
              <button type="submit" class="btn btn-primary btn-sm" [disabled]="cnCreating">
                <span *ngIf="cnCreating" class="spinner-border spinner-border-sm me-1"></span>
                {{ 'common.save' | translate }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class InvoiceDetailComponent implements OnInit {
  invoice: InvoiceDto | null = null;
  creditNotes: CreditNoteDto[] = [];
  loading = true;
  cnLoading = false;
  acting = false;
  voiding = false;
  cnCreating = false;
  error = '';
  voidError = '';
  cnError = '';
  successMsg = '';
  showVoidModal = false;
  showCreditNoteModal = false;

  voidForm = this.fb.group({ reason: ['', Validators.required] });
  cnForm = this.fb.group({
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    reason: ['', Validators.required]
  });

  get canVoid(): boolean {
    return !!this.invoice
      && this.invoice.amountPaid === 0
      && !['Voided', 'Paid'].includes(this.invoice.status)
      && this.auth.hasRole('Admin', 'Accountant');
  }

  get canCreditNote(): boolean {
    return this.auth.hasRole('Admin', 'Accountant');
  }

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private billingApi: BillingApiService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.load(id);
  }

  load(id: string): void {
    this.loading = true;
    this.billingApi.getInvoice(id).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess) {
          this.invoice = res.data;
          this.loadCreditNotes();
        } else {
          this.error = res.message;
        }
      },
      error: (err: any) => { this.loading = false; this.error = err?.message ?? 'Error'; }
    });
  }

  loadCreditNotes(): void {
    if (!this.invoice) return;
    this.cnLoading = true;
    this.billingApi.getCreditNotesByInvoice(this.invoice.id).subscribe({
      next: res => {
        this.cnLoading = false;
        if (res.isSuccess) this.creditNotes = res.data ?? [];
      },
      error: () => { this.cnLoading = false; }
    });
  }

  downloadPdf(): void {
    if (!this.invoice) return;
    this.billingApi.downloadInvoicePdf(this.invoice.id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${this.invoice!.number}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  }

  doVoid(): void {
    if (!this.invoice || this.voidForm.invalid) { this.voidForm.markAllAsTouched(); return; }
    this.voiding = true;
    this.voidError = '';
    const dto: VoidInvoiceDto = { reason: this.voidForm.value.reason! };
    this.billingApi.voidInvoice(this.invoice.id, dto).subscribe({
      next: res => {
        this.voiding = false;
        this.showVoidModal = false;
        if (res.isSuccess) {
          this.successMsg = 'billing.invoices.voidSuccess';
          setTimeout(() => this.successMsg = '', 3000);
          this.load(this.invoice!.id);
        } else {
          this.voidError = res.message;
        }
      },
      error: (err: any) => { this.voiding = false; this.voidError = err?.message ?? 'Error'; }
    });
  }

  doCreateCreditNote(): void {
    if (!this.invoice || this.cnForm.invalid) { this.cnForm.markAllAsTouched(); return; }
    this.cnCreating = true;
    this.cnError = '';
    const dto: CreditNoteCreateDto = {
      invoiceId: this.invoice.id,
      amount: this.cnForm.value.amount!,
      reason: this.cnForm.value.reason!
    };
    this.billingApi.createCreditNote(dto).subscribe({
      next: res => {
        this.cnCreating = false;
        if (res.isSuccess) {
          this.showCreditNoteModal = false;
          this.creditNotes = [...this.creditNotes, res.data];
          this.load(this.invoice!.id);
        } else {
          this.cnError = res.message;
        }
      },
      error: (err: any) => { this.cnCreating = false; this.cnError = err?.message ?? 'Error'; }
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
