import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { interval, Subscription } from 'rxjs';
import { ReportsApiService, OperationalKpisDto } from '../services/reports-api.service';

@Component({
  selector: 'app-kpis-report',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="page-header d-flex align-items-center justify-content-between flex-wrap gap-2">
      <h2>{{ 'reports.kpis.title' | translate }}</h2>
      <div class="d-flex align-items-center gap-2">
        <span class="small text-muted">{{ 'reports.kpis.autoRefresh' | translate }}</span>
        <button class="btn btn-outline-primary btn-sm" (click)="loadKpis()">
          <i class="fas fa-rotate me-1"></i>{{ 'common.refresh' | translate }}
        </button>
      </div>
    </div>

    <div *ngIf="loading" class="text-center py-5">
      <div class="spinner-border" style="color:var(--primary)"></div>
    </div>
    <div *ngIf="error" class="alert alert-danger">{{ error }}</div>

    <div *ngIf="!loading && kpis" class="row g-3">
      <!-- Open Orders -->
      <div class="col-sm-6 col-xl-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body d-flex align-items-center gap-3">
            <div class="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0 bg-primary" style="width:56px;height:56px;">
              <i class="fas fa-cart-shopping fa-lg text-white"></i>
            </div>
            <div>
              <div class="fw-bold fs-3">{{ kpis.openOrders }}</div>
              <div class="small text-muted">{{ 'reports.kpis.openOrders' | translate }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- In Preparation -->
      <div class="col-sm-6 col-xl-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body d-flex align-items-center gap-3">
            <div class="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0 bg-info" style="width:56px;height:56px;">
              <i class="fas fa-box-open fa-lg text-dark"></i>
            </div>
            <div>
              <div class="fw-bold fs-3">{{ kpis.ordersInPreparation }}</div>
              <div class="small text-muted">{{ 'reports.kpis.inPrep' | translate }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Ready to Ship -->
      <div class="col-sm-6 col-xl-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body d-flex align-items-center gap-3">
            <div class="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0 bg-secondary" style="width:56px;height:56px;">
              <i class="fas fa-truck-fast fa-lg text-white"></i>
            </div>
            <div>
              <div class="fw-bold fs-3">{{ kpis.ordersReadyToShip }}</div>
              <div class="small text-muted">{{ 'reports.kpis.readyToShip' | translate }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Shipped -->
      <div class="col-sm-6 col-xl-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body d-flex align-items-center gap-3">
            <div class="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0 bg-success" style="width:56px;height:56px;">
              <i class="fas fa-truck fa-lg text-white"></i>
            </div>
            <div>
              <div class="fw-bold fs-3">{{ kpis.ordersShipped }}</div>
              <div class="small text-muted">{{ 'reports.kpis.shipped' | translate }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Late Orders — red highlight when > 0 -->
      <div class="col-sm-6 col-xl-3">
        <div class="card border-0 shadow-sm h-100" [class.border-danger]="kpis.lateOrders > 0">
          <div class="card-body d-flex align-items-center gap-3">
            <div class="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0 bg-danger" style="width:56px;height:56px;">
              <i class="fas fa-clock fa-lg text-white"></i>
            </div>
            <div>
              <div class="fw-bold fs-3" [class.text-danger]="kpis.lateOrders > 0">{{ kpis.lateOrders }}</div>
              <div class="small text-muted">{{ 'reports.kpis.lateOrders' | translate }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Late % -->
      <div class="col-sm-6 col-xl-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body d-flex align-items-center gap-3">
            <div class="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0 bg-warning" style="width:56px;height:56px;">
              <i class="fas fa-triangle-exclamation fa-lg text-white"></i>
            </div>
            <div>
              <div class="fw-bold fs-3">{{ kpis.lateOrderPct | number:'1.1-1' }}%</div>
              <div class="small text-muted">{{ 'reports.kpis.latePct' | translate }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Avg Prep Hours -->
      <div class="col-sm-6 col-xl-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body d-flex align-items-center gap-3">
            <div class="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0 bg-primary" style="width:56px;height:56px;">
              <i class="fas fa-hourglass-half fa-lg text-white"></i>
            </div>
            <div>
              <div class="fw-bold fs-3">{{ kpis.avgPrepHours | number:'1.1-1' }}<span class="fs-6 fw-normal text-muted ms-1">h</span></div>
              <div class="small text-muted">{{ 'reports.kpis.avgPrep' | translate }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Fill Rate -->
      <div class="col-sm-6 col-xl-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body">
            <div class="d-flex align-items-center gap-3 mb-2">
              <div class="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0 bg-success" style="width:56px;height:56px;">
                <i class="fas fa-percent fa-lg text-white"></i>
              </div>
              <div>
                <div class="fw-bold fs-3">{{ kpis.fillRatePct | number:'1.1-1' }}%</div>
                <div class="small text-muted">{{ 'reports.kpis.fillRate' | translate }}</div>
              </div>
            </div>
            <div class="progress" style="height:8px;">
              <div
                class="progress-bar"
                [class.bg-success]="kpis.fillRatePct >= 90"
                [class.bg-warning]="kpis.fillRatePct >= 70 && kpis.fillRatePct < 90"
                [class.bg-danger]="kpis.fillRatePct < 70"
                role="progressbar"
                [style.width]="kpis.fillRatePct + '%'"
                [attr.aria-valuenow]="kpis.fillRatePct"
                aria-valuemin="0"
                aria-valuemax="100">
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class KpisReportComponent implements OnInit, OnDestroy {
  loading = false;
  error = '';
  kpis: OperationalKpisDto | null = null;
  private refreshSub?: Subscription;

  constructor(private reportsApi: ReportsApiService) {}

  ngOnInit(): void {
    this.loadKpis();
    this.refreshSub = interval(60000).subscribe(() => this.loadKpis());
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  loadKpis(): void {
    this.loading = !this.kpis;
    this.reportsApi.getKpis().subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess && res.data) this.kpis = res.data;
        else this.error = res.message;
      },
      error: err => { this.loading = false; this.error = err?.message ?? 'Error'; }
    });
  }
}
