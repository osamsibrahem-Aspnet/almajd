import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ReportsApiService, ProfitByProductDto } from '../services/reports-api.service';
import { CsvExportService } from '../../../core/csv/csv-export.service';

@Component({
  selector: 'app-profit-report',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  template: `
    <div class="page-header d-flex align-items-center justify-content-between flex-wrap gap-2">
      <h2>{{ 'reports.profit.title' | translate }}</h2>
      <button class="btn btn-outline-primary btn-sm" (click)="exportCsv()">
        <i class="fas fa-download me-1"></i>{{ 'reports.export' | translate }}
      </button>
    </div>

    <div class="card border-0 shadow-sm mb-3">
      <div class="card-body py-2">
        <form [formGroup]="filterForm" (ngSubmit)="load()">
          <div class="row g-2 align-items-end">
            <div class="col-sm-auto">
              <label class="form-label small mb-1">{{ 'reports.from' | translate }}</label>
              <input type="date" class="form-control form-control-sm" formControlName="from">
            </div>
            <div class="col-sm-auto">
              <label class="form-label small mb-1">{{ 'reports.to' | translate }}</label>
              <input type="date" class="form-control form-control-sm" formControlName="to">
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

    <div *ngIf="!loading && !error" class="card border-0 shadow-sm">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th (click)="sort('skuCode')" style="cursor:pointer">
                  {{ 'reports.profit.sku' | translate }}<i class="fas fa-sort ms-1 small"></i>
                </th>
                <th (click)="sort('productName')" style="cursor:pointer">
                  {{ 'reports.profit.product' | translate }}<i class="fas fa-sort ms-1 small"></i>
                </th>
                <th (click)="sort('unitsSold')" style="cursor:pointer" class="text-end">
                  {{ 'reports.profit.unitsSold' | translate }}<i class="fas fa-sort ms-1 small"></i>
                </th>
                <th (click)="sort('revenue')" style="cursor:pointer" class="text-end">
                  {{ 'reports.profit.revenue' | translate }}<i class="fas fa-sort ms-1 small"></i>
                </th>
                <th (click)="sort('cost')" style="cursor:pointer" class="text-end">
                  {{ 'reports.profit.cost' | translate }}<i class="fas fa-sort ms-1 small"></i>
                </th>
                <th (click)="sort('profit')" style="cursor:pointer" class="text-end">
                  {{ 'reports.profit.profit' | translate }}<i class="fas fa-sort ms-1 small"></i>
                </th>
                <th (click)="sort('marginPct')" style="cursor:pointer" class="text-end">
                  {{ 'reports.profit.margin' | translate }}<i class="fas fa-sort ms-1 small"></i>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="rows.length === 0">
                <td colspan="7" class="text-center text-muted py-4">{{ 'common.noData' | translate }}</td>
              </tr>
              <tr *ngFor="let r of sortedRows">
                <td class="font-monospace small">{{ r.skuCode }}</td>
                <td class="small">{{ r.productName }}</td>
                <td class="text-end">{{ r.unitsSold | number }}</td>
                <td class="text-end">{{ r.revenue | number:'1.2-2' }}</td>
                <td class="text-end text-muted">{{ r.cost | number:'1.2-2' }}</td>
                <td class="text-end fw-medium">{{ r.profit | number:'1.2-2' }}</td>
                <td class="text-end">
                  <span class="badge" [class]="marginClass(r.marginPct)">{{ r.marginPct | number:'1.1-1' }}%</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class ProfitReportComponent implements OnInit {
  loading = false;
  error = '';
  rows: ProfitByProductDto[] = [];
  sortCol: keyof ProfitByProductDto = 'revenue';
  sortAsc = false;

  filterForm = this.fb.group({
    from: [this.defaultFrom()],
    to: [this.defaultTo()]
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
    this.reportsApi.getProfitByProduct(v.from ?? undefined, v.to ?? undefined).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess && res.data) this.rows = res.data;
        else this.error = res.message;
      },
      error: err => { this.loading = false; this.error = err?.message ?? 'Error'; }
    });
  }

  sort(col: keyof ProfitByProductDto): void {
    if (this.sortCol === col) this.sortAsc = !this.sortAsc;
    else { this.sortCol = col; this.sortAsc = false; }
  }

  get sortedRows(): ProfitByProductDto[] {
    return [...this.rows].sort((a, b) => {
      const va = a[this.sortCol] as string | number;
      const vb = b[this.sortCol] as string | number;
      if (va < vb) return this.sortAsc ? -1 : 1;
      if (va > vb) return this.sortAsc ? 1 : -1;
      return 0;
    });
  }

  marginClass(pct: number): string {
    if (pct >= 30) return 'bg-success text-white';
    if (pct >= 10) return 'bg-warning text-dark';
    return 'bg-danger text-white';
  }

  exportCsv(): void {
    this.csv.download(this.rows, 'profit-by-product', [
      { key: 'skuCode', header: 'SKU' },
      { key: 'productName', header: 'Product' },
      { key: 'unitsSold', header: 'Units Sold' },
      { key: 'revenue', header: 'Revenue' },
      { key: 'cost', header: 'Cost' },
      { key: 'profit', header: 'Profit' },
      { key: 'marginPct', header: 'Margin %' }
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
