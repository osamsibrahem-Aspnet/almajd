import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Chart, registerables } from 'chart.js';
import { ReportsApiService, SupplierSpendDto } from '../services/reports-api.service';
import { CsvExportService } from '../../../core/csv/csv-export.service';

Chart.register(...registerables);

@Component({
  selector: 'app-supplier-spend-report',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  template: `
    <div class="page-header d-flex align-items-center justify-content-between flex-wrap gap-2">
      <h2>{{ 'reports.supplierSpend.title' | translate }}</h2>
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

    <div *ngIf="!loading && !error" class="row g-3">
      <!-- Doughnut chart of top 8 -->
      <div class="col-lg-5">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-header bg-transparent fw-semibold">{{ 'reports.supplierSpend.chartTitle' | translate }}</div>
          <div class="card-body d-flex align-items-center justify-content-center">
            <canvas #doughnutCanvas style="max-height:280px;"></canvas>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="col-lg-7">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover mb-0">
                <thead class="table-light">
                  <tr>
                    <th>{{ 'reports.supplierSpend.supplier' | translate }}</th>
                    <th class="text-end">{{ 'reports.supplierSpend.poCount' | translate }}</th>
                    <th class="text-end">{{ 'reports.supplierSpend.totalSpend' | translate }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngIf="rows.length === 0">
                    <td colspan="3" class="text-center text-muted py-4">{{ 'common.noData' | translate }}</td>
                  </tr>
                  <tr *ngFor="let r of rows">
                    <td>
                      <div class="fw-medium small">{{ r.supplierName }}</div>
                      <div class="text-muted small font-monospace">{{ r.supplierCode }}</div>
                    </td>
                    <td class="text-end">{{ r.poCount | number }}</td>
                    <td class="text-end fw-medium">{{ r.totalSpend | number:'1.0-0' }}</td>
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
export class SupplierSpendReportComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('doughnutCanvas') doughnutCanvas!: ElementRef<HTMLCanvasElement>;

  loading = false;
  error = '';
  rows: SupplierSpendDto[] = [];
  private chart?: Chart;
  private dataReady = false;
  private viewReady = false;

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

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.tryBuildChart();
  }

  ngOnDestroy(): void { this.chart?.destroy(); }

  load(): void {
    this.loading = true;
    this.error = '';
    const v = this.filterForm.value;
    this.reportsApi.getSupplierSpend(v.from ?? undefined, v.to ?? undefined).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess && res.data) {
          this.rows = res.data.sort((a, b) => b.totalSpend - a.totalSpend);
          this.dataReady = true;
          this.tryBuildChart();
        } else {
          this.error = res.message;
        }
      },
      error: err => { this.loading = false; this.error = err?.message ?? 'Error'; }
    });
  }

  exportCsv(): void {
    this.csv.download(this.rows, 'supplier-spend', [
      { key: 'supplierCode', header: 'Code' },
      { key: 'supplierName', header: 'Supplier' },
      { key: 'poCount', header: 'PO Count' },
      { key: 'totalSpend', header: 'Total Spend' }
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
    if (!this.doughnutCanvas?.nativeElement) return;
    const ctx = this.doughnutCanvas.nativeElement.getContext('2d');
    if (!ctx) return;
    this.chart?.destroy();
    const top8 = this.rows.slice(0, 8);
    const palette = ['#059669','#15803D','#B45309','#B91C1C','#7c3aed','#0d6efd','#0dcaf0','#adb5bd'];
    this.chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: top8.map(r => r.supplierName),
        datasets: [{
          data: top8.map(r => r.totalSpend),
          backgroundColor: palette,
          borderWidth: 2,
          borderColor: '#F0FDF4'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 14, padding: 10, font: { size: 11 } } },
          tooltip: { callbacks: { label: c => `${c.label}: ${Number(c.raw).toLocaleString()}` } }
        }
      }
    });
  }
}
