import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {
  InventoryApiService,
  StockItemDto,
  WarehouseDto,
  AdjustStockDto,
  TransferStockDto,
  ReceiveStockDto,
  LocationDto
} from '../services/inventory-api.service';
import { PagedResult } from '../../../core/api/paged-result';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-stock-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="page-header d-flex align-items-center justify-content-between">
      <h2>{{ 'inventory.stock.title' | translate }}</h2>
      <div class="d-flex gap-2">
        <button class="btn btn-sm btn-outline-primary" (click)="openReceive()">
          <i class="fas fa-arrow-down me-1"></i>{{ 'inventory.stock.receive' | translate }}
        </button>
        <button *ngIf="canAdjust" class="btn btn-sm btn-outline-warning" (click)="openAdjust()">
          <i class="fas fa-sliders me-1"></i>{{ 'inventory.stock.adjust' | translate }}
        </button>
        <button class="btn btn-sm btn-outline-secondary" (click)="openTransfer()">
          <i class="fas fa-arrows-left-right me-1"></i>{{ 'inventory.stock.transfer' | translate }}
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-body py-2">
        <form [formGroup]="filterForm" (ngSubmit)="applyFilters()" class="row g-2 align-items-end">
          <div class="col-sm-3">
            <input type="text" class="form-control form-control-sm" formControlName="skuCode"
                   [placeholder]="'inventory.stock.skuOrBarcode' | translate">
          </div>
          <div class="col-sm-3">
            <select class="form-select form-select-sm" formControlName="warehouseId">
              <option value="">{{ 'inventory.warehouse.all' | translate }}</option>
              <option *ngFor="let w of warehouses" [value]="w.id">{{ w.code }} — {{ w.name }}</option>
            </select>
          </div>
          <div class="col-auto">
            <div class="form-check d-inline-flex align-items-center gap-1">
              <input type="checkbox" class="form-check-input" formControlName="onlyAvailable" id="availChk">
              <label class="form-check-label small" for="availChk">{{ 'inventory.stock.onlyAvailable' | translate }}</label>
            </div>
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
                <th>{{ 'inventory.stock.sku' | translate }}</th>
                <th>{{ 'inventory.stock.product' | translate }}</th>
                <th>{{ 'inventory.stock.location' | translate }}</th>
                <th>{{ 'inventory.stock.warehouse' | translate }}</th>
                <th class="text-end">{{ 'inventory.stock.onHand' | translate }}</th>
                <th class="text-end">{{ 'inventory.stock.reserved' | translate }}</th>
                <th class="text-end">{{ 'inventory.stock.available' | translate }}</th>
                <th class="text-end">{{ 'common.actions' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="items.length === 0">
                <td colspan="8" class="text-center text-muted py-4">{{ 'common.noData' | translate }}</td>
              </tr>
              <tr *ngFor="let item of items" [class.table-danger]="item.qtyAvailable <= 0">
                <td>
                  <span class="fw-medium font-monospace">{{ item.skuCode }}</span>
                  <br><small class="text-muted">{{ item.barcode }}</small>
                </td>
                <td>{{ item.productName }}</td>
                <td><span class="badge bg-secondary font-monospace">{{ item.locationAddress }}</span></td>
                <td>{{ item.warehouseCode }}</td>
                <td class="text-end fw-medium">{{ item.qtyOnHand }}</td>
                <td class="text-end text-warning">{{ item.qtyReserved }}</td>
                <td class="text-end">
                  <span [class.text-success]="item.qtyAvailable > 0"
                        [class.text-danger]="item.qtyAvailable <= 0"
                        class="fw-bold">{{ item.qtyAvailable }}</span>
                </td>
                <td class="text-end">
                  <a [routerLink]="['/admin/inventory/movements']"
                     [queryParams]="{ skuId: item.skuId }"
                     class="btn btn-sm btn-outline-secondary"
                     title="{{ 'inventory.stock.viewMovements' | translate }}">
                    <i class="fas fa-history"></i>
                  </a>
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

    <!-- Receive Modal -->
    <div *ngIf="showReceiveModal" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ 'inventory.stock.receive' | translate }}</h5>
            <button type="button" class="btn-close" (click)="showReceiveModal = false"></button>
          </div>
          <div class="modal-body">
            <div *ngIf="modalError" class="alert alert-danger">{{ modalError }}</div>
            <form [formGroup]="receiveForm">
              <div class="mb-3">
                <label class="form-label">{{ 'inventory.stock.skuId' | translate }} *</label>
                <input type="text" class="form-control" formControlName="skuId">
                <small *ngIf="receiveForm.get('skuId')?.invalid && receiveForm.get('skuId')?.touched" class="text-danger">
                  {{ 'inventory.stock.skuRequired' | translate }}
                </small>
              </div>
              <div class="mb-3">
                <label class="form-label">{{ 'inventory.stock.toLocation' | translate }} *</label>
                <select class="form-select" formControlName="toLocationId">
                  <option value="">— {{ 'inventory.stock.selectLocation' | translate }} —</option>
                  <option *ngFor="let l of allLocations" [value]="l.id">{{ l.address }}</option>
                </select>
                <small *ngIf="receiveForm.get('toLocationId')?.invalid && receiveForm.get('toLocationId')?.touched" class="text-danger">
                  {{ 'inventory.stock.locationRequired' | translate }}
                </small>
              </div>
              <div class="mb-3">
                <label class="form-label">{{ 'inventory.stock.quantity' | translate }} *</label>
                <input type="number" class="form-control" formControlName="quantity" min="1">
                <small *ngIf="receiveForm.get('quantity')?.invalid && receiveForm.get('quantity')?.touched" class="text-danger">
                  {{ 'inventory.stock.qtyMin1' | translate }}
                </small>
              </div>
              <div class="mb-3">
                <label class="form-label">{{ 'inventory.stock.notes' | translate }}</label>
                <textarea class="form-control" formControlName="notes" rows="2"></textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" (click)="showReceiveModal = false">{{ 'common.cancel' | translate }}</button>
            <button type="button" class="btn btn-primary" [disabled]="submitting" (click)="submitReceive()">
              <span *ngIf="submitting" class="spinner-border spinner-border-sm me-1"></span>
              {{ 'inventory.stock.receive' | translate }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Adjust Modal -->
    <div *ngIf="showAdjustModal" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ 'inventory.stock.adjust' | translate }}</h5>
            <button type="button" class="btn-close" (click)="showAdjustModal = false"></button>
          </div>
          <div class="modal-body">
            <div *ngIf="modalError" class="alert alert-danger">{{ modalError }}</div>
            <form [formGroup]="adjustForm">
              <div class="mb-3">
                <label class="form-label">{{ 'inventory.stock.skuId' | translate }} *</label>
                <input type="text" class="form-control" formControlName="skuId">
                <small *ngIf="adjustForm.get('skuId')?.invalid && adjustForm.get('skuId')?.touched" class="text-danger">
                  {{ 'inventory.stock.skuRequired' | translate }}
                </small>
              </div>
              <div class="mb-3">
                <label class="form-label">{{ 'inventory.stock.location' | translate }} *</label>
                <select class="form-select" formControlName="locationId">
                  <option value="">— {{ 'inventory.stock.selectLocation' | translate }} —</option>
                  <option *ngFor="let l of allLocations" [value]="l.id">{{ l.address }}</option>
                </select>
                <small *ngIf="adjustForm.get('locationId')?.invalid && adjustForm.get('locationId')?.touched" class="text-danger">
                  {{ 'inventory.stock.locationRequired' | translate }}
                </small>
              </div>
              <div class="mb-3">
                <label class="form-label">
                  {{ 'inventory.stock.delta' | translate }} *
                  <small class="text-muted">({{ 'inventory.stock.deltaHint' | translate }})</small>
                </label>
                <input type="number" class="form-control" formControlName="delta">
                <small *ngIf="adjustForm.get('delta')?.invalid && adjustForm.get('delta')?.touched" class="text-danger">
                  {{ 'inventory.stock.deltaRequired' | translate }}
                </small>
              </div>
              <div class="mb-3">
                <label class="form-label">{{ 'inventory.stock.reason' | translate }} *</label>
                <input type="text" class="form-control" formControlName="reason">
                <small *ngIf="adjustForm.get('reason')?.invalid && adjustForm.get('reason')?.touched" class="text-danger">
                  {{ 'inventory.stock.reasonRequired' | translate }}
                </small>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" (click)="showAdjustModal = false">{{ 'common.cancel' | translate }}</button>
            <button type="button" class="btn btn-warning text-white" [disabled]="submitting" (click)="submitAdjust()">
              <span *ngIf="submitting" class="spinner-border spinner-border-sm me-1"></span>
              {{ 'inventory.stock.adjust' | translate }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Transfer Modal -->
    <div *ngIf="showTransferModal" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ 'inventory.stock.transfer' | translate }}</h5>
            <button type="button" class="btn-close" (click)="showTransferModal = false"></button>
          </div>
          <div class="modal-body">
            <div *ngIf="modalError" class="alert alert-danger">{{ modalError }}</div>
            <form [formGroup]="transferForm">
              <div class="mb-3">
                <label class="form-label">{{ 'inventory.stock.skuId' | translate }} *</label>
                <input type="text" class="form-control" formControlName="skuId">
                <small *ngIf="transferForm.get('skuId')?.invalid && transferForm.get('skuId')?.touched" class="text-danger">
                  {{ 'inventory.stock.skuRequired' | translate }}
                </small>
              </div>
              <div class="mb-3">
                <label class="form-label">{{ 'inventory.stock.fromLocation' | translate }} *</label>
                <select class="form-select" formControlName="fromLocationId">
                  <option value="">— {{ 'inventory.stock.selectLocation' | translate }} —</option>
                  <option *ngFor="let l of allLocations" [value]="l.id">{{ l.address }}</option>
                </select>
                <small *ngIf="transferForm.get('fromLocationId')?.invalid && transferForm.get('fromLocationId')?.touched" class="text-danger">
                  {{ 'inventory.stock.locationRequired' | translate }}
                </small>
              </div>
              <div class="mb-3">
                <label class="form-label">{{ 'inventory.stock.toLocation' | translate }} *</label>
                <select class="form-select" formControlName="toLocationId">
                  <option value="">— {{ 'inventory.stock.selectLocation' | translate }} —</option>
                  <option *ngFor="let l of allLocations" [value]="l.id">{{ l.address }}</option>
                </select>
                <small *ngIf="transferForm.get('toLocationId')?.invalid && transferForm.get('toLocationId')?.touched" class="text-danger">
                  {{ 'inventory.stock.locationRequired' | translate }}
                </small>
              </div>
              <div class="mb-3">
                <label class="form-label">{{ 'inventory.stock.quantity' | translate }} *</label>
                <input type="number" class="form-control" formControlName="quantity" min="1">
                <small *ngIf="transferForm.get('quantity')?.invalid && transferForm.get('quantity')?.touched" class="text-danger">
                  {{ 'inventory.stock.qtyMin1' | translate }}
                </small>
              </div>
              <div class="mb-3">
                <label class="form-label">{{ 'inventory.stock.notes' | translate }}</label>
                <textarea class="form-control" formControlName="notes" rows="2"></textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" (click)="showTransferModal = false">{{ 'common.cancel' | translate }}</button>
            <button type="button" class="btn btn-primary" [disabled]="submitting" (click)="submitTransfer()">
              <span *ngIf="submitting" class="spinner-border spinner-border-sm me-1"></span>
              {{ 'inventory.stock.transfer' | translate }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class StockListComponent implements OnInit {
  items: StockItemDto[] = [];
  warehouses: WarehouseDto[] = [];
  allLocations: LocationDto[] = [];
  pagedResult: PagedResult<StockItemDto> | null = null;
  loading = true;
  error = '';
  currentPage = 1;
  pageSize = 50;

  showReceiveModal = false;
  showAdjustModal = false;
  showTransferModal = false;
  submitting = false;
  modalError = '';

  filterForm = this.fb.group({
    skuCode: [''],
    warehouseId: [''],
    onlyAvailable: [false]
  });

  receiveForm = this.fb.group({
    skuId: ['', Validators.required],
    toLocationId: ['', Validators.required],
    quantity: [1, [Validators.required, Validators.min(1)]],
    notes: ['']
  });

  adjustForm = this.fb.group({
    skuId: ['', Validators.required],
    locationId: ['', Validators.required],
    delta: [0, Validators.required],
    reason: ['', Validators.required]
  });

  transferForm = this.fb.group({
    skuId: ['', Validators.required],
    fromLocationId: ['', Validators.required],
    toLocationId: ['', Validators.required],
    quantity: [1, [Validators.required, Validators.min(1)]],
    notes: ['']
  });

  get totalPages(): number {
    return this.pagedResult ? Math.ceil(this.pagedResult.total / this.pageSize) : 1;
  }

  constructor(
    private fb: FormBuilder,
    private inventoryApi: InventoryApiService,
    private auth: AuthService
  ) {}

  get canAdjust(): boolean {
    return this.auth.hasRole('Admin', 'WarehouseManager');
  }

  ngOnInit(): void {
    this.loadWarehouses();
    this.load();
  }

  loadWarehouses(): void {
    this.inventoryApi.listWarehouses().subscribe({
      next: res => {
        if (res.isSuccess && res.data) {
          this.warehouses = res.data;
          this.warehouses.forEach(w => {
            this.inventoryApi.listLocations(w.id).subscribe({
              next: lr => { if (lr.isSuccess && lr.data) this.allLocations.push(...lr.data); }
            });
          });
        }
      }
    });
  }

  load(): void {
    this.loading = true;
    this.error = '';
    const v = this.filterForm.value;
    const params: any = { page: this.currentPage, pageSize: this.pageSize };
    if (v.skuCode) params.skuCode = v.skuCode;
    if (v.warehouseId) params.warehouseId = v.warehouseId;
    if (v.onlyAvailable) params.onlyAvailable = true;

    this.inventoryApi.searchStock(params).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess && res.data) {
          this.pagedResult = res.data;
          this.items = res.data.items ?? [];
        } else {
          this.error = res.message;
        }
      },
      error: (err) => { this.loading = false; this.error = err?.message ?? 'Error'; }
    });
  }

  applyFilters(): void { this.currentPage = 1; this.load(); }
  resetFilters(): void {
    this.filterForm.reset({ skuCode: '', warehouseId: '', onlyAvailable: false });
    this.currentPage = 1; this.load();
  }
  changePage(p: number): void { this.currentPage = p; this.load(); }

  openReceive(): void { this.modalError = ''; this.receiveForm.reset({ quantity: 1 }); this.showReceiveModal = true; }
  openAdjust(): void { this.modalError = ''; this.adjustForm.reset({ delta: 0 }); this.showAdjustModal = true; }
  openTransfer(): void { this.modalError = ''; this.transferForm.reset({ quantity: 1 }); this.showTransferModal = true; }

  submitReceive(): void {
    if (this.receiveForm.invalid) { this.receiveForm.markAllAsTouched(); return; }
    this.submitting = true; this.modalError = '';
    const v = this.receiveForm.value;
    const dto: ReceiveStockDto = {
      skuId: v.skuId!,
      toLocationId: v.toLocationId!,
      quantity: v.quantity!,
      notes: v.notes || undefined
    };
    this.inventoryApi.receive(dto).subscribe({
      next: res => {
        this.submitting = false;
        if (res.isSuccess) { this.showReceiveModal = false; this.load(); }
        else { this.modalError = res.message; }
      },
      error: (err) => { this.submitting = false; this.modalError = err?.message ?? 'Error'; }
    });
  }

  submitAdjust(): void {
    if (this.adjustForm.invalid) { this.adjustForm.markAllAsTouched(); return; }
    this.submitting = true; this.modalError = '';
    const v = this.adjustForm.value;
    const dto: AdjustStockDto = {
      skuId: v.skuId!,
      locationId: v.locationId!,
      delta: v.delta!,
      reason: v.reason!
    };
    this.inventoryApi.adjust(dto).subscribe({
      next: res => {
        this.submitting = false;
        if (res.isSuccess) { this.showAdjustModal = false; this.load(); }
        else { this.modalError = res.message; }
      },
      error: (err) => { this.submitting = false; this.modalError = err?.message ?? 'Error'; }
    });
  }

  submitTransfer(): void {
    if (this.transferForm.invalid) { this.transferForm.markAllAsTouched(); return; }
    this.submitting = true; this.modalError = '';
    const v = this.transferForm.value;
    const dto: TransferStockDto = {
      skuId: v.skuId!,
      fromLocationId: v.fromLocationId!,
      toLocationId: v.toLocationId!,
      quantity: v.quantity!,
      notes: v.notes || undefined
    };
    this.inventoryApi.transfer(dto).subscribe({
      next: res => {
        this.submitting = false;
        if (res.isSuccess) { this.showTransferModal = false; this.load(); }
        else { this.modalError = res.message; }
      },
      error: (err) => { this.submitting = false; this.modalError = err?.message ?? 'Error'; }
    });
  }
}
