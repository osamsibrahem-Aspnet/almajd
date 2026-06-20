import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/api/api-response';
import { Chart, registerables } from 'chart.js';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

Chart.register(...registerables);

interface OperationalKpisDto {
  openOrders: number;
  ordersInPreparation: number;
  ordersReadyToShip: number;
  ordersShipped: number;
  lateOrders: number;
  lateOrderPct: number;
  avgPrepHours: number;
  fillRatePct: number;
}

interface SalesReportPointDto {
  bucket: string;
  orderCount: number;
  unitsSold: number;
  revenue: number;
  cost: number;
  profit: number;
}

interface ArAgingBucketDto {
  bucket: string;
  amount: number;
  invoiceCount: number;
}

interface ArAgingReportDto {
  asOf: string;
  totals: ArAgingBucketDto[];
  byCustomer: any[];
}

interface KpiCard {
  labelKey: string;
  value: number | string;
  icon: string;
  colorClass: string;
  suffix?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="page-header">
      <h2>{{ 'dashboard.title' | translate }}</h2>
    </div>

    <div *ngIf="loading" class="text-center py-5">
      <div class="spinner-border" style="color: var(--primary);"></div>
    </div>

    <div *ngIf="error" class="alert alert-danger">{{ error }}</div>

    <div *ngIf="!loading">
      <!-- KPI tiles -->
      <div class="row g-3 mb-4">
        <div class="col-sm-6 col-xl-3" *ngFor="let card of kpiCards">
          <div class="card h-100 border-0 shadow-sm">
            <div class="card-body d-flex align-items-center gap-3">
              <div class="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                   [class]="card.colorClass"
                   style="width: 52px; height: 52px;">
                <i class="fas {{ card.icon }} fa-lg text-white"></i>
              </div>
              <div>
                <div class="fw-bold fs-4" style="color: var(--fg);">
                  {{ card.value }}{{ card.suffix ?? '' }}
                </div>
                <div class="small" style="color: var(--fg-muted);">{{ card.labelKey | translate }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Charts row -->
      <div class="row g-3">
        <!-- Sales Line Chart -->
        <div class="col-lg-8">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent fw-semibold d-flex justify-content-between align-items-center">
              {{ 'dashboard.salesChart' | translate }}
              <small class="text-muted">{{ 'dashboard.last12Months' | translate }}</small>
            </div>
            <div class="card-body">
              <div *ngIf="chartsLoading" class="text-center py-4">
                <div class="spinner-border spinner-border-sm" style="color: var(--primary);"></div>
              </div>
              <canvas #salesCanvas id="salesChart" height="100" *ngIf="!chartsLoading"></canvas>
            </div>
          </div>
        </div>

        <!-- AR Aging Doughnut -->
        <div class="col-lg-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent fw-semibold">
              {{ 'dashboard.arAgingChart' | translate }}
            </div>
            <div class="card-body d-flex align-items-center justify-content-center">
              <div *ngIf="chartsLoading" class="text-center py-4">
                <div class="spinner-border spinner-border-sm" style="color: var(--primary);"></div>
              </div>
              <canvas #agingCanvas id="agingChart" *ngIf="!chartsLoading" style="max-height:260px;"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  loading = true;
  chartsLoading = true;
  error = '';
  kpiCards: KpiCard[] = [];

  @ViewChild('salesCanvas') salesCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('agingCanvas') agingCanvas!: ElementRef<HTMLCanvasElement>;

  private salesChart?: Chart;
  private agingChart?: Chart;

  private salesData: SalesReportPointDto[] = [];
  private agingData: ArAgingBucketDto[] = [];
  private chartsReady = false;
  private viewReady = false;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.get<OperationalKpisDto>('/api/reports/kpis').subscribe({
      next: (res: ApiResponse<OperationalKpisDto>) => {
        this.loading = false;
        const d = (res.isSuccess && res.data) ? res.data : {
          openOrders: 0, ordersInPreparation: 0, ordersReadyToShip: 0, ordersShipped: 0,
          lateOrders: 0, lateOrderPct: 0, avgPrepHours: 0, fillRatePct: 0
        };
        this.buildCards(d);
      },
      error: () => {
        this.loading = false;
        this.buildCards({
          openOrders: 0, ordersInPreparation: 0, ordersReadyToShip: 0, ordersShipped: 0,
          lateOrders: 0, lateOrderPct: 0, avgPrepHours: 0, fillRatePct: 0
        });
      }
    });

    // Load chart data in parallel
    const salesReq = this.api.get<SalesReportPointDto[]>('/api/reports/sales', { groupBy: 'month' })
      .pipe(catchError(() => of({ isSuccess: false, data: [], message: '', errors: [], statusCode: 500 } as ApiResponse<SalesReportPointDto[]>)));

    const agingReq = this.api.get<ArAgingReportDto>('/api/ar/aging')
      .pipe(catchError(() => of({ isSuccess: false, data: null as any, message: '', errors: [], statusCode: 500 } as ApiResponse<ArAgingReportDto>)));

    forkJoin([salesReq, agingReq]).subscribe(([salesRes, agingRes]) => {
      this.chartsLoading = false;
      if (salesRes.isSuccess && salesRes.data) {
        this.salesData = Array.isArray(salesRes.data) ? salesRes.data : [];
      }
      if (agingRes.isSuccess && agingRes.data?.totals) {
        this.agingData = agingRes.data.totals;
      }
      this.chartsReady = true;
      this.tryBuildCharts();
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.tryBuildCharts();
  }

  ngOnDestroy(): void {
    this.salesChart?.destroy();
    this.agingChart?.destroy();
  }

  private tryBuildCharts(): void {
    if (!this.chartsReady || !this.viewReady || this.chartsLoading) return;

    // Give Angular one tick to render canvases
    setTimeout(() => {
      this.buildSalesChart();
      this.buildAgingChart();
    }, 0);
  }

  private buildSalesChart(): void {
    if (!this.salesCanvas?.nativeElement) return;
    const ctx = this.salesCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const labels = this.salesData.map(p => p.bucket);
    const revenues = this.salesData.map(p => p.revenue);

    this.salesChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Revenue',
          data: revenues,
          borderColor: '#059669',
          backgroundColor: 'rgba(5,150,105,0.08)',
          fill: true,
          tension: 0.3,
          pointBackgroundColor: '#059669',
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => `Revenue: ${(ctx.parsed.y ?? 0).toLocaleString()}`
            }
          }
        },
        scales: {
          x: { grid: { color: '#BBF7D0' } },
          y: { grid: { color: '#BBF7D0' }, beginAtZero: true }
        }
      }
    });
  }

  private buildAgingChart(): void {
    if (!this.agingCanvas?.nativeElement) return;
    const ctx = this.agingCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    // Single stacked bar: total AR split into 4 aging buckets
    const buckets = ['0-30', '31-60', '61-90', '90+'];
    const data = buckets.map(b => {
      const found = this.agingData.find(d => d.bucket === b);
      return found ? Number(found.amount) : 0;
    });

    this.agingChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: buckets,
        datasets: [{
          data,
          backgroundColor: ['#15803D', '#B45309', '#B91C1C', '#7c3aed'],
          borderWidth: 2,
          borderColor: '#F0FDF4'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 14, padding: 12, font: { size: 12 } }
          },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.label}: ${Number(ctx.raw).toLocaleString()}`
            }
          }
        }
      }
    });
  }

  private buildCards(d: OperationalKpisDto): void {
    this.kpiCards = [
      { labelKey: 'dashboard.openOrders',   value: d.openOrders,             icon: 'fa-cart-shopping',       colorClass: 'bg-primary' },
      { labelKey: 'dashboard.lateOrders',   value: d.lateOrders,             icon: 'fa-clock',               colorClass: 'bg-danger' },
      { labelKey: 'dashboard.ordersInPrep', value: d.ordersInPreparation,    icon: 'fa-box-open',            colorClass: 'bg-warning' },
      { labelKey: 'dashboard.readyToShip',  value: d.ordersReadyToShip,      icon: 'fa-truck-fast',          colorClass: 'bg-info' },
      { labelKey: 'dashboard.shipped',      value: d.ordersShipped,          icon: 'fa-truck',               colorClass: 'bg-success' },
      { labelKey: 'dashboard.fillRate',     value: d.fillRatePct.toFixed(1), icon: 'fa-percent',             colorClass: 'bg-primary', suffix: '%' },
      { labelKey: 'dashboard.avgPrepHours', value: d.avgPrepHours.toFixed(1),icon: 'fa-hourglass-half',      colorClass: 'bg-secondary', suffix: 'h' },
      { labelKey: 'dashboard.lateOrderPct', value: d.lateOrderPct.toFixed(1),icon: 'fa-triangle-exclamation',colorClass: 'bg-danger', suffix: '%' },
    ];
  }
}
