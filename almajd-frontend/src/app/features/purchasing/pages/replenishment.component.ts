import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {
  PurchasingApiService,
  ReplenishmentSuggestionDto,
  SupplierListItemDto,
  PurchaseOrderCreateDto
} from '../services/purchasing-api.service';

@Component({
  selector: 'app-replenishment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="page-header d-flex justify-content-between align-items-center">
      <h2>{{ 'purchasing.replenishment.title' | translate }}</h2>
      <div class="d-flex gap-2">
        <button class="btn btn-outline-primary btn-sm" (click)="load()">
          <i class="fas fa-sync me-1"></i>{{ 'common.refresh' | translate }}
        </button>
        <button class="btn btn-primary btn-sm" (click)="createBulkPOs()"
                [disabled]="selectedItems.size === 0 || creating">
          <span *ngIf="creating" class="spinner-border spinner-border-sm me-1"></span>
          <i *ngIf="!creating" class="fas fa-cart-plus me-1"></i>
          {{ 'purchasing.replenishment.createPOs' | translate }} ({{ selectedItems.size }})
        </button>
      </div>
    </div>

    <div *ngIf="successMsg" class="alert alert-success py-2">{{ successMsg }}</div>
    <div *ngIf="error" class="alert alert-danger">{{ error }}</div>

    <!-- Filter by supplier -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-body py-2">
        <form [formGroup]="filterForm" (ngSubmit)="applyFilter()" class="row g-2 align-items-end">
          <div class="col-sm-4">
            <select class="form-select form-select-sm" formControlName="supplierId">
              <option value="">{{ 'purchasing.replenishment.allSuppliers' | translate }}</option>
              <option *ngFor="let s of suppliers" [value]="s.id">{{ s.name }}</option>
            </select>
          </div>
          <div class="col-auto">
            <button type="submit" class="btn btn-primary btn-sm">{{ 'common.filter' | translate }}</button>
            <button type="button" class="btn btn-outline-secondary btn-sm ms-1" (click)="resetFilter()">{{ 'common.cancel' | translate }}</button>
          </div>
        </form>
      </div>
    </div>

    <div *ngIf="loading" class="text-center py-4">
      <div class="spinner-border" style="color: var(--primary);"></div>
    </div>

    <div *ngIf="!loading" class="card border-0 shadow-sm">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th style="width:40px">
                  <input type="checkbox" class="form-check-input" (change)="toggleAll($event)" [checked]="allSelected">
                </th>
                <th>{{ 'purchasing.suppliers.skuCode' | translate }}</th>
                <th>{{ 'catalog.products.name' | translate }}</th>
                <th class="text-center">{{ 'inventory.stock.available' | translate }}</th>
                <th class="text-center">{{ 'purchasing.replenishment.reorderPoint' | translate }}</th>
                <th class="text-center">{{ 'purchasing.replenishment.suggestedQty' | translate }}</th>
                <th>{{ 'purchasing.replenishment.preferredSupplier' | translate }}</th>
                <th class="text-end">{{ 'purchasing.replenishment.lastCost' | translate }}</th>
                <th>{{ 'purchasing.suppliers.leadTime' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="suggestions.length === 0">
                <td colspan="9" class="text-center text-muted py-4">{{ 'purchasing.replenishment.noSuggestions' | translate }}</td>
              </tr>
              <tr *ngFor="let s of suggestions">
                <td>
                  <input type="checkbox" class="form-check-input"
                         [checked]="selectedItems.has(s.skuId)"
                         (change)="toggleItem(s)">
                </td>
                <td class="font-monospace small fw-medium">{{ s.skuCode }}</td>
                <td class="small">{{ s.productName }}</td>
                <td class="text-center">
                  <span class="text-danger fw-semibold">{{ s.qtyAvailable }}</span>
                </td>
                <td class="text-center text-muted small">{{ s.reorderPoint }}</td>
                <td class="text-center">
                  <span class="badge badge-submitted">{{ s.suggestedQty }}</span>
                </td>
                <td class="small">
                  <span *ngIf="s.preferredSupplierName">{{ s.preferredSupplierName }}</span>
                  <span *ngIf="!s.preferredSupplierName" class="text-muted">—</span>
                </td>
                <td class="text-end small">
                  <span *ngIf="s.lastCostPrice">{{ s.currency }} {{ s.lastCostPrice | number:'1.2-2' }}</span>
                  <span *ngIf="!s.lastCostPrice" class="text-muted">—</span>
                </td>
                <td class="small text-muted">
                  {{ s.leadTimeDays != null ? (s.leadTimeDays + 'd') : '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class ReplenishmentComponent implements OnInit {
  suggestions: ReplenishmentSuggestionDto[] = [];
  suppliers: SupplierListItemDto[] = [];
  selectedItems = new Set<string>();
  loading = true;
  creating = false;
  error = '';
  successMsg = '';

  filterForm = this.fb.group({ supplierId: [''] });

  get allSelected(): boolean {
    return this.suggestions.length > 0 && this.selectedItems.size === this.suggestions.length;
  }

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private purchasingApi: PurchasingApiService
  ) {}

  ngOnInit(): void {
    this.loadSuppliers();
    this.load();
  }

  loadSuppliers(): void {
    this.purchasingApi.searchSuppliers({ isActive: true, pageSize: 200 }).subscribe({
      next: res => { if (res.isSuccess) this.suppliers = res.data?.items ?? []; }
    });
  }

  load(): void {
    this.loading = true;
    this.error = '';
    const supplierId = this.filterForm.value.supplierId || undefined;
    this.purchasingApi.getReplenishmentSuggestions(supplierId).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess) this.suggestions = res.data ?? [];
        else this.error = res.message;
      },
      error: (err: any) => { this.loading = false; this.error = err?.message ?? 'Error'; }
    });
  }

  applyFilter(): void { this.selectedItems.clear(); this.load(); }
  resetFilter(): void { this.filterForm.reset({ supplierId: '' }); this.selectedItems.clear(); this.load(); }

  toggleItem(s: ReplenishmentSuggestionDto): void {
    if (this.selectedItems.has(s.skuId)) this.selectedItems.delete(s.skuId);
    else this.selectedItems.add(s.skuId);
  }

  toggleAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) this.suggestions.forEach(s => this.selectedItems.add(s.skuId));
    else this.selectedItems.clear();
  }

  createBulkPOs(): void {
    if (this.selectedItems.size === 0) return;
    const selected = this.suggestions.filter(s => this.selectedItems.has(s.skuId));

    // Group by preferred supplier
    const bySupplier = new Map<string, ReplenishmentSuggestionDto[]>();
    selected.forEach(s => {
      const key = s.preferredSupplierId ?? '__none';
      if (!bySupplier.has(key)) bySupplier.set(key, []);
      bySupplier.get(key)!.push(s);
    });

    const groups = Array.from(bySupplier.entries()).filter(([k]) => k !== '__none');
    if (groups.length === 0) {
      this.error = 'purchasing.replenishment.noPreferredSupplier';
      return;
    }

    this.creating = true;
    this.error = '';
    const first = groups[0];
    const [supplierId, items] = first;
    const dto: PurchaseOrderCreateDto = {
      supplierId,
      notes: 'Auto-generated from replenishment suggestions',
      lines: items.map(i => ({
        skuId: i.skuId,
        qty: i.suggestedQty,
        costPrice: i.lastCostPrice ?? 0
      }))
    };

    this.purchasingApi.createPO(dto).subscribe({
      next: res => {
        this.creating = false;
        if (res.isSuccess) {
          this.successMsg = 'purchasing.replenishment.poCreated';
          setTimeout(() => this.successMsg = '', 4000);
          this.router.navigate(['/admin/purchasing/purchase-orders', res.data.id]);
        } else {
          this.error = res.message;
        }
      },
      error: (err: any) => { this.creating = false; this.error = err?.message ?? 'Error'; }
    });
  }
}
