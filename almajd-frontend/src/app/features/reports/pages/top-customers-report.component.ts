import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ReportsApiService, TopCustomerDto } from '../services/reports-api.service';
import { CsvExportService } from '../../../core/csv/csv-export.service';

@Component({
  selector: 'app-top-customers-report',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  template: `
    <div class="page-header d-flex align-items-center justify-content-between flex-wrap gap-2">
      <h2>{{ 'reports.topCustomers.title' | translate }}</h2>
      <button class="btn btn-outline-primary btn-sm" (click)="exportCsv()">
        <i class="fas fa-download me-1"></i>{{ 'reports.export' | translate }}
      </button>
    </div>

    <div class="card border-0 shadow-sm mb-3">
      <div class="card-body py-2">
        <form [formGroup]="filterForm" (ngSubmit)="load()">
          <div class="row g-2 align-items-end flex-wrap">
            <div class="col-sm-auto">
              <label class="form-label small mb-1">{{ 'reports.from' | translate }}</label>
              <input type="date" class="form-control form-control-sm" formControlName="from">
            </div>
            <div class="col-sm-auto">
              <label class="form-label small mb-1">{{ 'reports.to' | translate }}</label>
              <input type="date" class="form-control form-control-sm" formControlName="to">
            </div>
            <div class="col-sm-auto">
              <label class="form-label small mb-1">{{ 'reports.topN' | translate }}</label>
              <select class="form-select form-select-sm" formControlName="top" style="width:90px">
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
            <div class="col-sm-auto">
              <button type="submit" class="btn btn-primary btn-sm">
                <i class="fas fa-filter me-1"></i>{{ 'common.filter' | translate }}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <div *ngIf="loading" class="text-center py-5">
      <div class="spinner-border" style="color:var(--primary)"></div>
    </div>
    <div *ngIf="error" class="alert alert-danger">{{ error }}</div>

    <div *ngIf="!loading && !error" class="row g-3">
      <div class="col-12 col-md-6 col-xl-4" *ngFor="let c of rows">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body d-flex gap-3 align-items-start">
            <!-- Rank badge -->
            <div class="rank-badge" [class]="rankClass(c.rank)">
              {{ c.rank }}
            </div>
            <div class="flex-grow-1 min-width-0">
              <div class="fw-semibold text-truncate">{{ c.customerName }}</div>
              <div class="small text-muted font-monospace">{{ c.customerCode }}</div>
              <div class="mt-2 d-flex flex-wrap gap-3">
                <div>
                  <div class="fw-bold fs-5" style="color:var(--primary)">{{ c.revenue | number:'1.0-0' }}</div>
                  <div class="small text-muted">{{ 'reports.topCustomers.revenue' | translate }}</div>
                </div>
                <div>
                  <div class="fw-bold fs-5">{{ c.orderCount | number }}</div>
                  <div class="small text-muted">{{ 'reports.topCustomers.orders' | translate }}</div>
                </div>
              </div>
              <div class="small text-muted mt-2" *ngIf="c.lastOrderDate">
                {{ 'reports.topCustomers.lastOrder' | translate }}: {{ c.lastOrderDate | date:'mediumDate' }}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-12" *ngIf="rows.length === 0">
        <div class="text-center text-muted py-4">{{ 'common.noData' | translate }}</div>
      </div>
    </div>
  `,
  styles: [`
    .rank-badge {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1rem;
      flex-shrink: 0;
      color: #fff;
    }
    .rank-1 { background-color: #d97706; }
    .rank-2 { background-color: #6b7280; }
    .rank-3 { background-color: #92400e; }
    .rank-other { background-color: var(--primary); }
    .min-width-0 { min-width: 0; }
  `]
})
export class TopCustomersReportComponent implements OnInit {
  loading = false;
  error = '';
  rows: TopCustomerDto[] = [];

  filterForm = this.fb.group({
    from: [this.defaultFrom()],
    to: [this.defaultTo()],
    top: ['20']
  });

  constructor(
    private fb: FormBuilder,
    private reportsApi: ReportsApiService,
    private csv: CsvExportService
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.error = '';
    const v = this.filterForm.value;
    this.reportsApi.getTopCustomers(
      v.from ?? undefined,
      v.to ?? undefined,
      Number(v.top ?? 20)
    ).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess && res.data) this.rows = res.data;
        else this.error = res.message;
      },
      error: err => { this.loading = false; this.error = err?.message ?? 'Error'; }
    });
  }

  rankClass(rank: number): string {
    if (rank === 1) return 'rank-badge rank-1';
    if (rank === 2) return 'rank-badge rank-2';
    if (rank === 3) return 'rank-badge rank-3';
    return 'rank-badge rank-other';
  }

  exportCsv(): void {
    this.csv.download(this.rows, 'top-customers', [
      { key: 'rank', header: 'Rank' },
      { key: 'customerCode', header: 'Code' },
      { key: 'customerName', header: 'Name' },
      { key: 'orderCount', header: 'Orders' },
      { key: 'revenue', header: 'Revenue' },
      { key: 'lastOrderDate', header: 'Last Order' }
    ]);
  }

  private defaultFrom(): string {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().substring(0, 10);
  }

  private defaultTo(): string {
    return new Date().toISOString().substring(0, 10);
  }
}
