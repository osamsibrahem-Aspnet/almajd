import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { AccountApiService, Invoice } from '../services/account-api.service';

@Component({
  selector: 'app-statements',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="page-header">
      <h2>{{ 'account.statements' | translate }}</h2>
    </div>

    <div *ngIf="loading" class="text-center py-5">
      <div class="spinner-border text-primary"></div>
    </div>

    <div *ngIf="!loading && invoices.length === 0" class="text-center py-5 text-muted">
      <i class="fas fa-file-invoice fa-3x mb-3 d-block"></i>
      {{ 'account.noInvoices' | translate }}
    </div>

    <div *ngIf="!loading && invoices.length > 0">
      <!-- Desktop table -->
      <div class="card d-none d-md-block">
        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th>{{ 'billing.invoices.number' | translate }}</th>
                <th>{{ 'billing.invoices.issuedAt' | translate }}</th>
                <th>{{ 'billing.invoices.dueAt' | translate }}</th>
                <th class="text-end">{{ 'billing.invoices.total' | translate }}</th>
                <th class="text-end">{{ 'billing.invoices.outstanding' | translate }}</th>
                <th>{{ 'common.status' | translate }}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let inv of invoices">
                <td class="fw-semibold">{{ inv.invoiceNumber }}</td>
                <td>{{ inv.issuedAt | date:'shortDate' }}</td>
                <td>{{ inv.dueAt | date:'shortDate' }}</td>
                <td class="text-end">{{ inv.totalAmount | number:'1.2-2' }}</td>
                <td class="text-end" [class.text-danger]="(inv.outstandingAmount ?? 0) > 0">
                  {{ inv.outstandingAmount | number:'1.2-2' }}
                </td>
                <td>
                  <span class="badge" [ngClass]="statusClass(inv.status)">{{ inv.status }}</span>
                </td>
                <td>
                  <button class="btn btn-outline-secondary btn-sm"
                          (click)="downloadPdf(inv.id)"
                          [disabled]="downloading === inv.id">
                    <span *ngIf="downloading === inv.id" class="spinner-border spinner-border-sm me-1"></span>
                    <i *ngIf="downloading !== inv.id" class="fas fa-file-pdf me-1"></i>
                    {{ 'billing.invoices.downloadPdf' | translate }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Mobile cards -->
      <div class="d-md-none d-flex flex-column gap-3">
        <div *ngFor="let inv of invoices" class="card">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <span class="fw-semibold">{{ inv.invoiceNumber }}</span>
              <span class="badge" [ngClass]="statusClass(inv.status)">{{ inv.status }}</span>
            </div>
            <div class="row small text-muted g-1 mb-2">
              <div class="col-6">{{ 'billing.invoices.issuedAt' | translate }}: {{ inv.issuedAt | date:'shortDate' }}</div>
              <div class="col-6">{{ 'billing.invoices.dueAt' | translate }}: {{ inv.dueAt | date:'shortDate' }}</div>
              <div class="col-6">{{ 'billing.invoices.total' | translate }}: {{ inv.totalAmount | number:'1.2-2' }}</div>
              <div class="col-6" [class.text-danger]="(inv.outstandingAmount ?? 0) > 0">
                {{ 'billing.invoices.outstanding' | translate }}: {{ inv.outstandingAmount | number:'1.2-2' }}
              </div>
            </div>
            <button class="btn btn-outline-secondary btn-sm w-100"
                    (click)="downloadPdf(inv.id)"
                    [disabled]="downloading === inv.id">
              <i class="fas fa-file-pdf me-1"></i>{{ 'billing.invoices.downloadPdf' | translate }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class StatementsComponent implements OnInit {
  invoices: Invoice[] = [];
  loading = true;
  downloading = '';

  constructor(private accountApi: AccountApiService) {}

  ngOnInit(): void {
    this.accountApi.getInvoices({ page: 1, pageSize: 50 }).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess && res.data) {
          const data = res.data as any;
          this.invoices = Array.isArray(data) ? data : (data.items ?? []);
        }
      },
      error: () => { this.loading = false; }
    });
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      Draft: 'bg-secondary',
      Open: 'badge-approved',
      Overdue: 'badge-cancelled',
      Paid: 'badge-delivered',
      Void: 'badge-cancelled'
    };
    return map[status] ?? 'bg-secondary';
  }

  downloadPdf(invoiceId: string): void {
    this.downloading = invoiceId;
    this.accountApi.downloadInvoicePdf(invoiceId).subscribe({
      next: blob => {
        this.downloading = '';
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${invoiceId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => { this.downloading = ''; }
    });
  }
}
