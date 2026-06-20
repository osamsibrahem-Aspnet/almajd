import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormControl, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { InventoryApiService, InventoryCountDto, WarehouseDto } from '../services/inventory-api.service';

@Component({
  selector: 'app-inventory-counts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="page-header d-flex align-items-center justify-content-between">
      <h2>{{ 'inventory.counts.title' | translate }}</h2>
      <button class="btn btn-primary btn-sm" (click)="openCreate()">
        <i class="fas fa-plus me-1"></i>{{ 'inventory.counts.create' | translate }}
      </button>
    </div>

    <!-- Warehouse filter -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-body py-2">
        <div class="row g-2 align-items-end">
          <div class="col-sm-3">
            <select class="form-select form-select-sm" [formControl]="warehouseFilter" (change)="load()">
              <option value="">{{ 'inventory.warehouse.all' | translate }}</option>
              <option *ngFor="let w of warehouses" [value]="w.id">{{ w.code }} — {{ w.name }}</option>
            </select>
          </div>
        </div>
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
                <th>{{ 'inventory.warehouse.code' | translate }}</th>
                <th>{{ 'common.status' | translate }}</th>
                <th>{{ 'inventory.counts.startedAt' | translate }}</th>
                <th>{{ 'inventory.counts.postedAt' | translate }}</th>
                <th class="text-center">{{ 'inventory.counts.lines' | translate }}</th>
                <th class="text-center">{{ 'inventory.counts.variance' | translate }}</th>
                <th class="text-end">{{ 'common.actions' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="counts.length === 0">
                <td colspan="7" class="text-center text-muted py-4">{{ 'common.noData' | translate }}</td>
              </tr>
              <tr *ngFor="let c of counts">
                <td class="font-monospace fw-medium">{{ c.warehouseCode }}</td>
                <td><span class="badge" [class]="countStatusClass(c.status)">{{ c.status }}</span></td>
                <td class="small text-muted">{{ c.startedAt ? (c.startedAt | date:'mediumDate') : '—' }}</td>
                <td class="small text-muted">{{ c.postedAt ? (c.postedAt | date:'mediumDate') : '—' }}</td>
                <td class="text-center">{{ c.lineCount }}</td>
                <td class="text-center" [class.text-danger]="c.totalVariance !== 0">
                  {{ c.totalVariance > 0 ? '+' : '' }}{{ c.totalVariance }}
                </td>
                <td class="text-end">
                  <a [routerLink]="['/admin/inventory/counts', c.id]" class="btn btn-sm btn-outline-primary">
                    <i class="fas fa-eye"></i>
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Create Modal -->
    <div *ngIf="showModal" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ 'inventory.counts.create' | translate }}</h5>
            <button type="button" class="btn-close" (click)="showModal = false"></button>
          </div>
          <div class="modal-body">
            <div *ngIf="modalError" class="alert alert-danger">{{ modalError }}</div>
            <form [formGroup]="createForm">
              <div class="mb-3">
                <label class="form-label">{{ 'inventory.warehouse.title' | translate }} *</label>
                <select class="form-select" formControlName="warehouseId">
                  <option value="">— {{ 'inventory.warehouse.select' | translate }} —</option>
                  <option *ngFor="let w of warehouses" [value]="w.id">{{ w.code }} — {{ w.name }}</option>
                </select>
                <small *ngIf="createForm.get('warehouseId')?.invalid && createForm.get('warehouseId')?.touched" class="text-danger">
                  {{ 'inventory.warehouse.required' | translate }}
                </small>
              </div>
              <div class="mb-3">
                <label class="form-label">{{ 'inventory.counts.notes' | translate }}</label>
                <textarea class="form-control" formControlName="notes" rows="2" maxlength="1024"></textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" (click)="showModal = false">{{ 'common.cancel' | translate }}</button>
            <button type="button" class="btn btn-primary" [disabled]="submitting" (click)="submitCreate()">
              <span *ngIf="submitting" class="spinner-border spinner-border-sm me-1"></span>
              {{ 'common.create' | translate }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class InventoryCountsComponent implements OnInit {
  counts: InventoryCountDto[] = [];
  warehouses: WarehouseDto[] = [];
  loading = true;
  error = '';
  showModal = false;
  submitting = false;
  modalError = '';
  warehouseFilter = new FormControl('');

  createForm = this.fb.group({
    warehouseId: ['', Validators.required],
    notes: ['']
  });

  constructor(private fb: FormBuilder, private inventoryApi: InventoryApiService) {}

  ngOnInit(): void {
    this.inventoryApi.listWarehouses().subscribe({
      next: res => { if (res.isSuccess && res.data) this.warehouses = res.data; }
    });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.inventoryApi.listCounts(this.warehouseFilter.value || undefined).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess && res.data) this.counts = res.data;
        else this.error = res.message;
      },
      error: (err) => { this.loading = false; this.error = err?.message ?? 'Error'; }
    });
  }

  openCreate(): void {
    this.modalError = '';
    this.createForm.reset();
    this.showModal = true;
  }

  submitCreate(): void {
    if (this.createForm.invalid) { this.createForm.markAllAsTouched(); return; }
    this.submitting = true; this.modalError = '';
    const v = this.createForm.value;
    this.inventoryApi.createCount({ warehouseId: v.warehouseId!, notes: v.notes || undefined }).subscribe({
      next: res => {
        this.submitting = false;
        if (res.isSuccess) { this.showModal = false; this.load(); }
        else { this.modalError = res.message; }
      },
      error: (err) => { this.submitting = false; this.modalError = err?.message ?? 'Error'; }
    });
  }

  countStatusClass(status: string): string {
    const map: Record<string, string> = {
      'Draft': 'badge-draft',
      'InProgress': 'badge-inpreparation',
      'Posted': 'badge-delivered',
      'Cancelled': 'badge-cancelled'
    };
    return map[status] ?? 'badge-draft';
  }
}
