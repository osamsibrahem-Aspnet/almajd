import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BillingApiService, IssueInvoiceDto } from '../services/billing-api.service';

@Component({
  selector: 'app-issue-invoice',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="page-header">
      <a routerLink="/admin/billing/invoices" class="text-muted text-decoration-none small">
        <i class="fas fa-arrow-left me-1"></i>{{ 'billing.invoices.title' | translate }}
      </a>
      <h2 class="mt-1">{{ 'billing.invoices.issue' | translate }}</h2>
    </div>

    <div class="row justify-content-center">
      <div class="col-md-6">
        <div class="card border-0 shadow-sm">
          <div class="card-body">
            <div *ngIf="error" class="alert alert-danger py-2 small">{{ error }}</div>
            <form [formGroup]="form" (ngSubmit)="doIssue()">
              <div class="mb-3">
                <label class="form-label small fw-medium">{{ 'billing.invoices.orderId' | translate }} *</label>
                <input type="text" class="form-control" formControlName="orderId"
                       [placeholder]="'billing.invoices.orderIdPlaceholder' | translate">
                <small *ngIf="form.get('orderId')?.invalid && form.get('orderId')?.touched" class="text-danger">
                  {{ 'billing.invoices.orderIdRequired' | translate }}
                </small>
              </div>
              <div class="mb-3">
                <label class="form-label small fw-medium">{{ 'billing.invoices.netDays' | translate }}</label>
                <input type="number" class="form-control" formControlName="netDays" min="0"
                       [placeholder]="'billing.invoices.netDaysPlaceholder' | translate">
                <small class="text-muted">{{ 'billing.invoices.netDaysHint' | translate }}</small>
              </div>
              <div class="mb-3">
                <label class="form-label small fw-medium">{{ 'inventory.counts.notes' | translate }}</label>
                <textarea class="form-control" formControlName="notes" rows="3"></textarea>
              </div>
              <div class="d-flex gap-2">
                <button type="submit" class="btn btn-primary" [disabled]="saving || form.invalid">
                  <span *ngIf="saving" class="spinner-border spinner-border-sm me-1"></span>
                  <i class="fas fa-file-invoice me-1"></i>{{ 'billing.invoices.issue' | translate }}
                </button>
                <a routerLink="/admin/billing/invoices" class="btn btn-outline-secondary">
                  {{ 'common.cancel' | translate }}
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `
})
export class IssueInvoiceComponent {
  saving = false;
  error = '';

  form = this.fb.group({
    orderId: ['', Validators.required],
    netDays: [null as number | null],
    notes: ['']
  });

  constructor(private fb: FormBuilder, private router: Router, private billingApi: BillingApiService) {}

  doIssue(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    this.error = '';
    const v = this.form.value;
    const dto: IssueInvoiceDto = {
      orderId: v.orderId!,
      netDays: v.netDays ?? undefined,
      notes: v.notes || undefined
    };
    this.billingApi.issueInvoice(dto).subscribe({
      next: res => {
        this.saving = false;
        if (res.isSuccess) {
          this.router.navigate(['/admin/billing/invoices', res.data.id]);
        } else {
          this.error = res.message;
        }
      },
      error: (err: any) => { this.saving = false; this.error = err?.message ?? 'Error'; }
    });
  }
}
