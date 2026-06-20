import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { InventoryApiService, WarehouseDto, WarehouseCreateDto, WarehouseUpdateDto } from '../services/inventory-api.service';

@Component({
  selector: 'app-warehouses',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="page-header d-flex align-items-center justify-content-between">
      <h2>{{ 'inventory.warehouse.title' | translate }}</h2>
      <button class="btn btn-primary btn-sm" (click)="openCreate()">
        <i class="fas fa-plus me-1"></i>{{ 'inventory.warehouse.create' | translate }}
      </button>
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
                <th>{{ 'inventory.warehouse.code' | translate }}</th>
                <th>{{ 'inventory.warehouse.name' | translate }}</th>
                <th>{{ 'inventory.warehouse.address' | translate }}</th>
                <th class="text-center">{{ 'inventory.warehouse.locationCount' | translate }}</th>
                <th class="text-center">{{ 'common.status' | translate }}</th>
                <th class="text-end">{{ 'common.actions' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="warehouses.length === 0">
                <td colspan="6" class="text-center text-muted py-4">{{ 'common.noData' | translate }}</td>
              </tr>
              <tr *ngFor="let w of warehouses">
                <td class="fw-medium font-monospace">{{ w.code }}</td>
                <td>{{ w.name }}</td>
                <td class="small text-muted">{{ w.address || '—' }}</td>
                <td class="text-center">
                  <span class="badge bg-secondary">{{ w.locationCount }}</span>
                </td>
                <td class="text-center">
                  <span class="badge" [class.badge-active]="w.isActive" [class.badge-cancelled]="!w.isActive">
                    {{ (w.isActive ? 'common.active' : 'common.inactive') | translate }}
                  </span>
                </td>
                <td class="text-end">
                  <a [routerLink]="['/admin/inventory/warehouses', w.id, 'locations']"
                     class="btn btn-sm btn-outline-secondary me-1"
                     title="{{ 'inventory.location.title' | translate }}">
                    <i class="fas fa-map-marker-alt"></i>
                  </a>
                  <button class="btn btn-sm btn-outline-primary me-1" (click)="openEdit(w)">
                    <i class="fas fa-pen"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-danger" (click)="deleteWarehouse(w)">
                    <i class="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Create / Edit Modal -->
    <div *ngIf="showModal" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              {{ (editId ? 'inventory.warehouse.edit' : 'inventory.warehouse.create') | translate }}
            </h5>
            <button type="button" class="btn-close" (click)="showModal = false"></button>
          </div>
          <div class="modal-body">
            <div *ngIf="modalError" class="alert alert-danger">{{ modalError }}</div>
            <form [formGroup]="warehouseForm">
              <div class="mb-3">
                <label class="form-label">{{ 'inventory.warehouse.code' | translate }} *</label>
                <input type="text" class="form-control" formControlName="code" maxlength="32">
                <small *ngIf="warehouseForm.get('code')?.invalid && warehouseForm.get('code')?.touched" class="text-danger">
                  {{ 'inventory.warehouse.codeRequired' | translate }}
                </small>
              </div>
              <div class="mb-3">
                <label class="form-label">{{ 'inventory.warehouse.name' | translate }} *</label>
                <input type="text" class="form-control" formControlName="name" maxlength="128">
                <small *ngIf="warehouseForm.get('name')?.invalid && warehouseForm.get('name')?.touched" class="text-danger">
                  {{ 'inventory.warehouse.nameRequired' | translate }}
                </small>
              </div>
              <div class="mb-3">
                <label class="form-label">{{ 'inventory.warehouse.address' | translate }}</label>
                <textarea class="form-control" formControlName="address" rows="2" maxlength="512"></textarea>
              </div>
              <div *ngIf="editId" class="mb-3 form-check">
                <input type="checkbox" class="form-check-input" formControlName="isActive" id="whActive">
                <label class="form-check-label" for="whActive">{{ 'common.active' | translate }}</label>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" (click)="showModal = false">{{ 'common.cancel' | translate }}</button>
            <button type="button" class="btn btn-primary" [disabled]="submitting" (click)="submitWarehouse()">
              <span *ngIf="submitting" class="spinner-border spinner-border-sm me-1"></span>
              {{ 'common.save' | translate }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class WarehousesComponent implements OnInit {
  warehouses: WarehouseDto[] = [];
  loading = true;
  error = '';
  showModal = false;
  submitting = false;
  modalError = '';
  editId: string | null = null;

  warehouseForm = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(32)]],
    name: ['', [Validators.required, Validators.maxLength(128)]],
    address: [''],
    isActive: [true]
  });

  constructor(private fb: FormBuilder, private inventoryApi: InventoryApiService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.error = '';
    this.inventoryApi.listWarehouses(true).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess && res.data) this.warehouses = res.data;
        else this.error = res.message;
      },
      error: (err) => { this.loading = false; this.error = err?.message ?? 'Error'; }
    });
  }

  openCreate(): void {
    this.editId = null;
    this.modalError = '';
    this.warehouseForm.reset({ isActive: true });
    this.showModal = true;
  }

  openEdit(w: WarehouseDto): void {
    this.editId = w.id;
    this.modalError = '';
    this.warehouseForm.patchValue({ code: w.code, name: w.name, address: w.address ?? '', isActive: w.isActive });
    this.showModal = true;
  }

  submitWarehouse(): void {
    if (this.warehouseForm.invalid) { this.warehouseForm.markAllAsTouched(); return; }
    this.submitting = true; this.modalError = '';
    const v = this.warehouseForm.value;

    const obs = this.editId
      ? this.inventoryApi.updateWarehouse(this.editId, {
          code: v.code!, name: v.name!, address: v.address || undefined, isActive: v.isActive!
        } as WarehouseUpdateDto)
      : this.inventoryApi.createWarehouse({
          code: v.code!, name: v.name!, address: v.address || undefined
        } as WarehouseCreateDto);

    obs.subscribe({
      next: res => {
        this.submitting = false;
        if (res.isSuccess) { this.showModal = false; this.load(); }
        else { this.modalError = res.message; }
      },
      error: (err) => { this.submitting = false; this.modalError = err?.message ?? 'Error'; }
    });
  }

  deleteWarehouse(w: WarehouseDto): void {
    if (!confirm(`Delete warehouse "${w.name}"?`)) return;
    this.inventoryApi.deleteWarehouse(w.id).subscribe({
      next: res => {
        if (res.isSuccess) this.load();
        else this.error = res.message;
      },
      error: (err) => { this.error = err?.message ?? 'Error'; }
    });
  }
}
