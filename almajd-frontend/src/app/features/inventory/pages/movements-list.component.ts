import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { InventoryApiService, StockMovementDto } from '../services/inventory-api.service';
import { PagedResult } from '../../../core/api/paged-result';

const MOVEMENT_TYPES = [
  'Receive', 'Sell', 'Transfer', 'Adjust', 'Reserve', 'Release', 'ConfirmSale', 'Return'
];

@Component({
  selector: 'app-movements-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  template: `
    <div class="page-header">
      <h2>{{ 'inventory.movements.title' | translate }}</h2>
    </div>

    <!-- Filters -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-body py-2">
        <form [formGroup]="filterForm" (ngSubmit)="applyFilters()" class="row g-2 align-items-end">
          <div class="col-sm-3">
            <input type="text" class="form-control form-control-sm" formControlName="skuId"
                   [placeholder]="'inventory.movements.filterSkuId' | translate">
          </div>
          <div class="col-sm-2">
            <select class="form-select form-select-sm" formControlName="type">
              <option value="">{{ 'inventory.movements.allTypes' | translate }}</option>
              <option *ngFor="let t of movementTypes" [value]="t">{{ t }}</option>
            </select>
          </div>
          <div class="col-sm-2">
            <input type="text" class="form-control form-control-sm" formControlName="referenceType"
                   [placeholder]="'inventory.movements.refType' | translate">
          </div>
          <div class="col-sm-2">
            <input type="date" class="form-control form-control-sm" formControlName="from">
          </div>
          <div class="col-sm-2">
            <input type="date" class="form-control form-control-sm" formControlName="to">
          </div>
          <div class="col-auto">
            <button type="submit" class="btn btn-primary btn-sm">
              <i class="fas fa-search me-1"></i>{{ 'common.filter' | translate }}
            </button>
            <button type="button" class="btn btn-outline-secondary btn-sm ms-1" (click)="resetFilters()">
              {{ 'common.cancel' | translate }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div *ngIf="loading" class="text-center py-4">
      <div class="spinner-border" style="color: var(--primary);"></div>
    </div>

    <div *ngIf="error" class="alert alert-danger">{{ error }}</div>

    <div *ngIf="!loading" class="card border-0 shadow-sm">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th>{{ 'inventory.movements.occurredAt' | translate }}</th>
                <th>{{ 'inventory.movements.type' | translate }}</th>
                <th>{{ 'inventory.stock.sku' | translate }}</th>
                <th>{{ 'inventory.movements.from' | translate }}</th>
                <th>{{ 'inventory.movements.to' | translate }}</th>
                <th class="text-end">{{ 'inventory.stock.quantity' | translate }}</th>
                <th>{{ 'inventory.movements.reference' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="movements.length === 0">
                <td colspan="7" class="text-center text-muted py-4">{{ 'common.noData' | translate }}</td>
              </tr>
              <tr *ngFor="let m of movements">
                <td class="small text-muted text-nowrap">{{ m.occurredAt | date:'medium' }}</td>
                <td>
                  <span class="badge" [class]="typeBadgeClass(m.type)">{{ m.type }}</span>
                </td>
                <td>
                  <span class="fw-medium font-monospace">{{ m.skuCode }}</span>
                  <br><small class="text-muted">{{ m.productName }}</small>
                </td>
                <td class="small font-monospace">{{ m.fromLocationAddress || '—' }}</td>
                <td class="small font-monospace">{{ m.toLocationAddress || '—' }}</td>
                <td class="text-end fw-bold" [class.text-success]="m.quantity > 0" [class.text-danger]="m.quantity < 0">
                  {{ m.quantity > 0 ? '+' : '' }}{{ m.quantity }}
                </td>
                <td class="small text-muted">
                  <span *ngIf="m.referenceType">{{ m.referenceType }}</span>
                  <span *ngIf="m.notes" class="d-block">{{ m.notes }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div *ngIf="pagedResult" class="card-footer d-flex align-items-center justify-content-between bg-transparent">
        <small class="text-muted">{{ 'common.total' | translate }}: {{ pagedResult.total }}</small>
        <div class="d-flex gap-2 align-items-center">
          <button class="btn btn-sm btn-outline-secondary" [disabled]="currentPage <= 1" (click)="changePage(currentPage - 1)">
            <i class="fas fa-chevron-left"></i>
          </button>
          <small>{{ 'common.page' | translate }} {{ currentPage }} {{ 'common.of' | translate }} {{ totalPages }}</small>
          <button class="btn btn-sm btn-outline-secondary" [disabled]="currentPage >= totalPages" (click)="changePage(currentPage + 1)">
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>
  `
})
export class MovementsListComponent implements OnInit {
  movements: StockMovementDto[] = [];
  pagedResult: PagedResult<StockMovementDto> | null = null;
  loading = true;
  error = '';
  currentPage = 1;
  pageSize = 50;
  movementTypes = MOVEMENT_TYPES;

  filterForm = this.fb.group({
    skuId: [''],
    type: [''],
    referenceType: [''],
    from: [''],
    to: ['']
  });

  get totalPages(): number {
    return this.pagedResult ? Math.ceil(this.pagedResult.total / this.pageSize) : 1;
  }

  constructor(
    private fb: FormBuilder,
    private inventoryApi: InventoryApiService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Pre-fill skuId from query params (coming from stock list "Movements" link)
    this.route.queryParams.subscribe(params => {
      if (params['skuId']) {
        this.filterForm.patchValue({ skuId: params['skuId'] });
      }
      this.load();
    });
  }

  load(): void {
    this.loading = true;
    this.error = '';
    const v = this.filterForm.value;
    const params: any = { page: this.currentPage, pageSize: this.pageSize };
    if (v.skuId) params.skuId = v.skuId;
    if (v.type) params.type = v.type;
    if (v.referenceType) params.referenceType = v.referenceType;
    if (v.from) params.from = v.from;
    if (v.to) params.to = v.to;

    this.inventoryApi.searchMovements(params).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess && res.data) {
          this.pagedResult = res.data;
          this.movements = res.data.items ?? [];
        } else {
          this.error = res.message;
        }
      },
      error: (err) => { this.loading = false; this.error = err?.message ?? 'Error'; }
    });
  }

  applyFilters(): void { this.currentPage = 1; this.load(); }
  resetFilters(): void {
    this.filterForm.reset({ skuId: '', type: '', referenceType: '', from: '', to: '' });
    this.currentPage = 1; this.load();
  }
  changePage(p: number): void { this.currentPage = p; this.load(); }

  typeBadgeClass(type: string): string {
    const map: Record<string, string> = {
      'Receive': 'bg-success',
      'Sell': 'bg-primary',
      'ConfirmSale': 'bg-primary',
      'Transfer': 'bg-info text-dark',
      'Adjust': 'bg-warning text-dark',
      'Reserve': 'bg-secondary',
      'Release': 'bg-secondary',
      'Return': 'bg-danger'
    };
    return map[type] ?? 'bg-secondary';
  }
}
