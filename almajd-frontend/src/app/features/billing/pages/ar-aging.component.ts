import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BillingApiService, ArAgingDto } from '../services/billing-api.service';

@Component({
  selector: 'app-ar-aging',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="page-header d-flex justify-content-between align-items-center">
      <h2>{{ 'billing.ar.title' | translate }}</h2>
      <div class="d-flex align-items-center gap-2">
        <label class="small fw-medium mb-0">{{ 'billing.ar.asOf' | translate }}</label>
        <input type="date" class="form-control form-control-sm" style="width:160px" [(ngModel)]="asOf" (change)="load()">
      </div>
    </div>

    <div *ngIf="loading" class="text-center py-5">
      <div class="spinner-border" style="color: var(--primary);"></div>
    </div>
    <div *ngIf="error" class="alert alert-danger">{{ error }}</div>

    <div *ngIf="aging && !loading">
      <!-- KPI Tiles -->
      <div class="row g-3 mb-4">
        <div class="col-sm-6 col-lg-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="kpi-label">{{ 'billing.ar.current' | translate }}</div>
              <div class="kpi-value" style="color: var(--success);">{{ aging.totals.current | number:'1.2-2' }}</div>
            </div>
          </div>
        </div>
        <div class="col-sm-6 col-lg-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="kpi-label">{{ 'billing.ar.bucket030' | translate }}</div>
              <div class="kpi-value" style="color: var(--warning);">{{ aging.totals.days0to30 | number:'1.2-2' }}</div>
            </div>
          </div>
        </div>
        <div class="col-sm-6 col-lg-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="kpi-label">{{ 'billing.ar.bucket3160' | translate }}</div>
              <div class="kpi-value" style="color: var(--warning);">{{ aging.totals.days31to60 | number:'1.2-2' }}</div>
            </div>
          </div>
        </div>
        <div class="col-sm-6 col-lg-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="kpi-label">{{ 'billing.ar.bucket6190' | translate }}</div>
              <div class="kpi-value" style="color: var(--danger);">{{ aging.totals.days61to90 | number:'1.2-2' }}</div>
            </div>
          </div>
        </div>
        <div class="col-sm-6 col-lg-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="kpi-label">{{ 'billing.ar.bucketOver90' | translate }}</div>
              <div class="kpi-value" style="color: var(--danger);">{{ aging.totals.over90 | number:'1.2-2' }}</div>
            </div>
          </div>
        </div>
        <div class="col-sm-6 col-lg-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="kpi-label">{{ 'billing.ar.totalAr' | translate }}</div>
              <div class="kpi-value fw-bold">{{ aging.totals.total | number:'1.2-2' }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Table by customer -->
      <div class="card border-0 shadow-sm">
        <div class="card-header bg-transparent fw-medium">
          {{ 'billing.ar.byCustomer' | translate }}
          <small class="text-muted ms-2">{{ 'billing.ar.asOf' | translate }}: {{ aging.asOf | date:'mediumDate' }}</small>
        </div>
        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th>{{ 'customers.legalName' | translate }}</th>
                <th class="text-end">{{ 'billing.ar.current' | translate }}</th>
                <th class="text-end">{{ 'billing.ar.bucket030' | translate }}</th>
                <th class="text-end">{{ 'billing.ar.bucket3160' | translate }}</th>
                <th class="text-end">{{ 'billing.ar.bucket6190' | translate }}</th>
                <th class="text-end">{{ 'billing.ar.bucketOver90' | translate }}</th>
                <th class="text-end fw-semibold">{{ 'billing.ar.totalAr' | translate }}</th>
                <th class="text-end">{{ 'common.actions' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="aging.rows.length === 0">
                <td colspan="8" class="text-center text-muted py-4">{{ 'common.noData' | translate }}</td>
              </tr>
              <tr *ngFor="let row of aging.rows" [class.table-warning]="row.days61to90 + row.over90 > 0">
                <td class="fw-medium small">{{ row.customerName }}</td>
                <td class="text-end small">{{ row.current | number:'1.2-2' }}</td>
                <td class="text-end small">{{ row.days0to30 | number:'1.2-2' }}</td>
                <td class="text-end small" [class.text-warning]="row.days31to60 > 0">{{ row.days31to60 | number:'1.2-2' }}</td>
                <td class="text-end small" [class.text-danger]="row.days61to90 > 0">{{ row.days61to90 | number:'1.2-2' }}</td>
                <td class="text-end small fw-bold" [class.text-danger]="row.over90 > 0">{{ row.over90 | number:'1.2-2' }}</td>
                <td class="text-end fw-semibold">{{ row.total | number:'1.2-2' }}</td>
                <td class="text-end">
                  <a [routerLink]="['/admin/billing/ar', row.customerId]" class="btn btn-sm btn-outline-primary">
                    <i class="fas fa-eye"></i>
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class ArAgingComponent implements OnInit {
  aging: ArAgingDto | null = null;
  loading = true;
  error = '';
  asOf = new Date().toISOString().split('T')[0];

  constructor(private billingApi: BillingApiService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.error = '';
    this.billingApi.getArAging(this.asOf).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess) this.aging = res.data;
        else this.error = res.message;
      },
      error: (err: any) => { this.loading = false; this.error = err?.message ?? 'Error'; }
    });
  }
}
