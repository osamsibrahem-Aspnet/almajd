import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { PurchasingApiService, SupplierCompareDto } from '../services/purchasing-api.service';

@Component({
  selector: 'app-supplier-compare',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="page-header">
      <h2>{{ 'purchasing.suppliers.compareTitle' | translate }}</h2>
      <p class="text-muted small mb-0">{{ 'purchasing.suppliers.compareSubtitle' | translate }}</p>
    </div>

    <div class="card border-0 shadow-sm mb-3">
      <div class="card-body py-2">
        <form [formGroup]="searchForm" (ngSubmit)="search()" class="row g-2 align-items-end">
          <div class="col-sm-6">
            <label class="form-label small fw-medium">{{ 'purchasing.suppliers.skuId' | translate }}</label>
            <input type="text" class="form-control form-control-sm" formControlName="skuId"
                   [placeholder]="'purchasing.suppliers.skuIdPlaceholder' | translate">
            <small *ngIf="searchForm.get('skuId')?.invalid && searchForm.get('skuId')?.touched" class="text-danger">
              {{ 'purchasing.suppliers.skuIdRequired' | translate }}
            </small>
          </div>
          <div class="col-auto">
            <button type="submit" class="btn btn-primary btn-sm" [disabled]="loading">
              <span *ngIf="loading" class="spinner-border spinner-border-sm me-1"></span>
              <i *ngIf="!loading" class="fas fa-search me-1"></i>
              {{ 'purchasing.suppliers.compare' | translate }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div *ngIf="error" class="alert alert-danger">{{ error }}</div>

    <div *ngIf="results.length > 0" class="card border-0 shadow-sm">
      <div class="card-header bg-transparent">
        <span class="fw-medium">{{ 'purchasing.suppliers.compareResults' | translate }}</span>
        <span class="text-muted small ms-2">SKU: {{ currentSkuId }}</span>
      </div>
      <div class="table-responsive">
        <table class="table table-hover mb-0">
          <thead class="table-light">
            <tr>
              <th>{{ 'purchasing.suppliers.name' | translate }}</th>
              <th>{{ 'purchasing.suppliers.code' | translate }}</th>
              <th class="text-end">{{ 'purchasing.suppliers.costPrice' | translate }}</th>
              <th>{{ 'purchasing.suppliers.leadTime' | translate }}</th>
              <th>{{ 'purchasing.suppliers.preferred' | translate }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of results; let i = index"
                [class.table-success]="r.isPreferred">
              <td class="fw-medium">{{ r.supplierName }}</td>
              <td class="font-monospace small">{{ r.supplierCode }}</td>
              <td class="text-end fw-medium">
                {{ r.currency }} {{ r.costPrice | number:'1.2-2' }}
                <span *ngIf="i === 0" class="badge badge-approved ms-1">
                  <i class="fas fa-trophy me-1"></i>{{ 'purchasing.suppliers.cheapest' | translate }}
                </span>
              </td>
              <td>{{ r.leadTimeDays }}d</td>
              <td>
                <span *ngIf="r.isPreferred" class="badge badge-approved">
                  <i class="fas fa-star me-1"></i>{{ 'purchasing.suppliers.preferredBadge' | translate }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div *ngIf="searched && results.length === 0 && !loading && !error"
         class="alert alert-info">
      {{ 'purchasing.suppliers.noSuppliersForSku' | translate }}
    </div>
  `
})
export class SupplierCompareComponent {
  results: SupplierCompareDto[] = [];
  loading = false;
  error = '';
  searched = false;
  currentSkuId = '';

  searchForm = this.fb.group({
    skuId: ['', Validators.required]
  });

  constructor(private fb: FormBuilder, private purchasingApi: PurchasingApiService) {}

  search(): void {
    if (this.searchForm.invalid) { this.searchForm.markAllAsTouched(); return; }
    this.loading = true;
    this.error = '';
    this.results = [];
    this.currentSkuId = this.searchForm.value.skuId!;
    this.purchasingApi.compareSuppliers(this.currentSkuId).subscribe({
      next: res => {
        this.loading = false;
        this.searched = true;
        if (res.isSuccess) { this.results = res.data ?? []; }
        else { this.error = res.message; }
      },
      error: (err: any) => { this.loading = false; this.error = err?.message ?? 'Error'; }
    });
  }
}
