import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Chart, registerables } from 'chart.js';
import { ReportsApiService, SalesReportPointDto } from '../services/reports-api.service';
import { CsvExportService } from '../../../core/csv/csv-export.service';

Chart.register(...registerables);

@Component({
  selector: 'app-sales-report',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  template: `
    <div class="page-header d-flex align-items-center justify-content-between flex-wrap gap-2">
      <h2>{{ 'reports.sales.title' | translate }}</h2>
      <button class="btn btn-outline-primary btn-sm" (click)="exportCsv()">
        <i class="fas fa-download me-1"></i>{{ 'reports.export' | translate }}
      </button>
    </div>

    <!-- Filters -->
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
              <label class="form-label small mb-1">{{ 'reports.groupBy' | translate }}</label>
              <select class="form-select form-select-sm" formControlName="groupBy">
                <option value="day">{{ 'reports.groupByDay' | translate }}</option>
                <option value="week">{{ 'reports.groupByWeek' | translate }}</option>
                <option value="month">{{ 'reports.groupByMonth' | translate }}</option>
                <option value="year">{{ 'reports.groupByYear' | translate }}</option>
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

    <div *ngIf="!loading && !error">
      <!-- KPI tiles -->
      <div class="row g-3 mb-4">
        <div class="col-6 col-xl-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body d-flex align-items-center gap-3">
              <div class="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0 bg-primary" style="width:52px;height:52px;">
                <i class="fas fa-dollar-sign fa-lg text-white"></i>
              </div>
              <div>
                <div class="fw-bold fs-5">{{ totalRevenue | number:'1.0-0' }}</div>
                <div class="small text-muted">{{ 'reports.sales.totalRevenue' | translate }}</div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-6 col-xl-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body d-flex align-items-center gap-3">
              <div class="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0 bg-success" style="width:52px;height:52px;">
                <i class="fas fa-chart-line fa-lg text-white"></i>
              </div>
              <div>
                <div class="fw-bold fs-5">{{ totalProfit | number:'1.0-0' }}</div>
                <div class="small text-muted">{{ 'reports.sales.totalProfit' | translate }}</div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-6 col-xl-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body d-flex align-items-center gap-3">
              <div class="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0 bg-info" style="width:52px;height:52px;">
                <i class="fas fa-cart-shopping fa-lg text-white"></i>
              </div>
              <div>
                <div class="fw-bold fs-5">{{ totalOrders | number }}</div>
                <div class="small text-muted">{{ 'reports.sales.totalOrders' | translate }}</div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-6 col-xl-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body d-flex align-items-center gap-3">
              <div class="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0 bg-warning" style="width:52px;height:52px;">
                <i class="fas fa-boxes-stacked fa-lg text-white"></i>
              </div>
              <div>
                <div class="fw-bold fs-5">{{ totalUnits | number }}</div>
                <div class="small text-muted">{{ 'reports.sales.totalUnits' | translate }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Chart -->
      <div class="card border-0 shadow-sm mb-3">
        <div class="card-header bg-transparent fw-semibold">{{ 'reports.sales.chartTitle' | translate }}</div>
        <div class="card-body">
          <canvas #salesCanvas height="80"></canvas>
        </div>
      </div>

      <!-- Table -->
      <div class="card border-0 shadow-sm">
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover mb-0">
              <thead class="table-light">
                <tr>
                  <th (click)="sort('bucket')" style="cursor:pointer">
                    {{ 'reports.sales.bucket' | translate }}
                    <i class="fas fa-sort ms-1 small"></i>
                  </th>
                  <th (click)="sort('orderCount')" style="cursor:pointer" class="text-end">
                    {{ 'reports.sales.orderCount' | translate }}
                    <i class="fas fa-sort ms-1 small"></i>
                  </th>
                  <th (click)="sort('unitsSold')" style="cursor:pointer" class="text-end">
                    {{ 'reports.sales.unitsSold' | translate }}
                    <i class="fas fa-sort ms-1 small"></i>
                  </th>
                  <th (click)="sort('revenue')" style="cursor:pointer" class="text-end">
                    {{ 'reports.sales.revenue' | translate }}
                    <i class="fas fa-sort ms-1 small"></i>
                  </th>
                  <th (click)="sort('cost')" style="cursor:pointer" class="text-end">
                    {{ 'reports.sales.cost' | translate }}
                    <i class="fas fa-sort ms-1 small"></i>
                  </th>
                  <th (click)="sort('profit')" style="cursor:pointer" class="text-end">
                    {{ 'reports.sales.profit' | translate }}
                    <i class="fas fa-sort ms-1 small"></i>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr *ngIf="rows.length === 0">
                  <td colspan="6" class="text-center text-muted py-4">{{ 'common.noData' | translate }}</td>
                </tr>
                <tr *ngFor="let r of sortedRows">
                  <td class="font-monospace small">{{ r.bucket }}</td>
                  <td class="text-end">{{ r.orderCount | number }}</td>
                  <td class="text-end">{{ r.unitsSold | number }}</td>
                  <td class="text-end fw-medium">{{ r.revenue | number:'1.2-2' }}</td>
                  <td class="text-end text-muted">{{ r.cost | number:'1.2-2' }}</td>
                  <td class="text-end fw-medium text-success">{{ r.profit | number:'1.2-2' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SalesReportComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('salesCanvas') salesCanvas!: ElementRef<HTMLCanvasElement>;

  loading = false;
  error = '';
  rows: SalesReportPointDto[] = [];
  sortCol: keyof SalesReportPointDto = 'bucket';
  sortAsc = true;
  private chart?: Chart;
  private dataReady = false;
  private viewReady = false;

  filterForm = this.fb.group({
    from: [this.defaultFrom()],
    to: [this.defaultTo()],
    groupBy: ['month']
  });

  constructor(
    private fb: FormBuilder,
    private reportsApi: ReportsApiService,
    private csv: CsvExportService
  ) {}

  ngOnInit(): void { this.load(); }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.tryBuildChart();
  }

  ngOnDestroy(): void { this.chart?.destroy(); }

  load(): void {
    this.loading = true;
    this.error = '';
    const v = this.filterForm.value;
    this.reportsApi.getSales({
      from: v.from ?? undefined,
      to: v.to ?? undefined,
      groupBy: (v.groupBy as any) ?? 'month'
    }).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess && res.data) {
          this.rows = res.data;
          this.dataReady = true;
          this.tryBuildChart();
        } else {
          this.error = res.message;
        }
      },
      error: err => { this.loading = false; this.error = err?.message ?? 'Error'; }
    });
  }

  sort(col: keyof SalesReportPointDto): void {
    if (this.sortCol === col) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortCol = col;
      this.sortAsc = true;
    }
  }

  get sortedRows(): SalesReportPointDto[] {
    return [...this.rows].sort((a, b) => {
      const va = a[this.sortCol] as string | number;
      const vb = b[this.sortCol] as string | number;
      if (va < vb) return this.sortAsc ? -1 : 1;
      if (va > vb) return this.sortAsc ? 1 : -1;
      return 0;
    });
  }

  get totalRevenue(): number { return this.rows.reduce((s, r) => s + r.revenue, 0); }
  get totalProfit(): number { return this.rows.reduce((s, r) => s + r.profit, 0); }
  get totalOrders(): number { return this.rows.reduce((s, r) => s + r.orderCount, 0); }
  get totalUnits(): number { return this.rows.reduce((s, r) => s + r.unitsSold, 0); }

  exportCsv(): void {
    this.csv.download(this.rows, 'sales-report', [
      { key: 'bucket', header: 'Bucket' },
      { key: 'orderCount', header: 'Orders' },
      { key: 'unitsSold', header: 'Units Sold' },
      { key: 'revenue', header: 'Revenue' },
      { key: 'cost', header: 'Cost' },
      { key: 'profit', header: 'Profit' }
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

  private tryBuildChart(): void {
    if (!this.dataReady || !this.viewReady || this.loading) return;
    setTimeout(() => this.buildChart(), 0);
  }

  private buildChart(): void {
    if (!this.salesCanvas?.nativeElement) return;
    const ctx = this.salesCanvas.nativeElement.getContext('2d');
    if (!ctx) return;
    this.chart?.destroy();
    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.rows.map(r => r.bucket),
        datasets: [
          {
            label: 'Revenue',
            data: this.rows.map(r => r.revenue),
            borderColor: '#059669',
            backgroundColor: 'rgba(5,150,105,0.08)',
            fill: true,
            tension: 0.3,
            pointBackgroundColor: '#059669',
            pointRadius: 3
          },
          {
            label: 'Profit',
            data: this.rows.map(r => r.profit),
            borderColor: '#15803D',
            backgroundColor: 'rgba(21,128,61,0.06)',
            fill: true,
            tension: 0.3,
            pointBackgroundColor: '#15803D',
            pointRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          tooltip: { mode: 'index', intersect: false }
        },
        scales: {
          x: { grid: { color: '#BBF7D0' } },
          y: { grid: { color: '#BBF7D0' }, beginAtZero: true }
        }
      }
    });
  }
}
