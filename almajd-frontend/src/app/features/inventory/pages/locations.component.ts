import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {
  InventoryApiService,
  LocationDto,
  WarehouseDto,
  LocationCreateDto
} from '../services/inventory-api.service';

@Component({
  selector: 'app-locations',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="page-header d-flex align-items-center justify-content-between">
      <div>
        <a [routerLink]="['/admin/inventory/warehouses']" class="btn btn-sm btn-outline-secondary me-2">
          <i class="fas fa-arrow-left"></i>
        </a>
        <span class="fw-semibold">{{ warehouse?.code }} — {{ warehouse?.name }}</span>
        <span class="text-muted mx-1">/</span>
        <span>{{ 'inventory.location.title' | translate }}</span>
      </div>
      <button class="btn btn-primary btn-sm" (click)="openCreate()">
        <i class="fas fa-plus me-1"></i>{{ 'inventory.location.create' | translate }}
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
                <th>{{ 'inventory.location.address' | translate }}</th>
                <th>{{ 'inventory.location.zone' | translate }}</th>
                <th>{{ 'inventory.location.aisle' | translate }}</th>
                <th>{{ 'inventory.location.shelf' | translate }}</th>
                <th>{{ 'inventory.location.bin' | translate }}</th>
                <th class="text-center">{{ 'inventory.location.pickable' | translate }}</th>
                <th class="text-end">{{ 'common.actions' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="locations.length === 0">
                <td colspan="7" class="text-center text-muted py-4">{{ 'common.noData' | translate }}</td>
              </tr>
              <tr *ngFor="let loc of locations">
                <td class="fw-medium font-monospace">{{ loc.address }}</td>
                <td>{{ loc.zone }}</td>
                <td>{{ loc.aisle }}</td>
                <td>{{ loc.shelf }}</td>
                <td>{{ loc.bin }}</td>
                <td class="text-center">
                  <i class="fas" [class.fa-check-circle]="loc.isPickable" [class.fa-times-circle]="!loc.isPickable"
                     [class.text-success]="loc.isPickable" [class.text-muted]="!loc.isPickable"></i>
                </td>
                <td class="text-end">
                  <button class="btn btn-sm btn-outline-primary me-1" (click)="openEdit(loc)">
                    <i class="fas fa-pen"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-danger" (click)="deleteLocation(loc)">
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
              {{ (editId ? 'inventory.location.edit' : 'inventory.location.create') | translate }}
            </h5>
            <button type="button" class="btn-close" (click)="showModal = false"></button>
          </div>
          <div class="modal-body">
            <div *ngIf="modalError" class="alert alert-danger">{{ modalError }}</div>
            <form [formGroup]="locationForm">
              <div class="row g-2">
                <div class="col-6">
                  <label class="form-label">{{ 'inventory.location.zone' | translate }} *</label>
                  <input type="text" class="form-control" formControlName="zone" maxlength="16">
                  <small *ngIf="locationForm.get('zone')?.invalid && locationForm.get('zone')?.touched" class="text-danger">
                    {{ 'inventory.location.zoneRequired' | translate }}
                  </small>
                </div>
                <div class="col-6">
                  <label class="form-label">{{ 'inventory.location.aisle' | translate }} *</label>
                  <input type="text" class="form-control" formControlName="aisle" maxlength="16">
                  <small *ngIf="locationForm.get('aisle')?.invalid && locationForm.get('aisle')?.touched" class="text-danger">
                    {{ 'inventory.location.aisleRequired' | translate }}
                  </small>
                </div>
                <div class="col-6">
                  <label class="form-label">{{ 'inventory.location.shelf' | translate }} *</label>
                  <input type="text" class="form-control" formControlName="shelf" maxlength="16">
                  <small *ngIf="locationForm.get('shelf')?.invalid && locationForm.get('shelf')?.touched" class="text-danger">
                    {{ 'inventory.location.shelfRequired' | translate }}
                  </small>
                </div>
                <div class="col-6">
                  <label class="form-label">{{ 'inventory.location.bin' | translate }} *</label>
                  <input type="text" class="form-control" formControlName="bin" maxlength="16">
                  <small *ngIf="locationForm.get('bin')?.invalid && locationForm.get('bin')?.touched" class="text-danger">
                    {{ 'inventory.location.binRequired' | translate }}
                  </small>
                </div>
              </div>
              <div class="mt-3 form-check">
                <input type="checkbox" class="form-check-input" formControlName="isPickable" id="pickable">
                <label class="form-check-label" for="pickable">{{ 'inventory.location.pickable' | translate }}</label>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" (click)="showModal = false">{{ 'common.cancel' | translate }}</button>
            <button type="button" class="btn btn-primary" [disabled]="submitting" (click)="submitLocation()">
              <span *ngIf="submitting" class="spinner-border spinner-border-sm me-1"></span>
              {{ 'common.save' | translate }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class LocationsComponent implements OnInit {
  warehouseId = '';
  warehouse: WarehouseDto | null = null;
  locations: LocationDto[] = [];
  loading = true;
  error = '';
  showModal = false;
  submitting = false;
  modalError = '';
  editId: string | null = null;

  locationForm = this.fb.group({
    zone: ['', [Validators.required, Validators.maxLength(16)]],
    aisle: ['', [Validators.required, Validators.maxLength(16)]],
    shelf: ['', [Validators.required, Validators.maxLength(16)]],
    bin: ['', [Validators.required, Validators.maxLength(16)]],
    isPickable: [true]
  });

  constructor(
    private fb: FormBuilder,
    private inventoryApi: InventoryApiService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.warehouseId = this.route.snapshot.paramMap.get('warehouseId') ?? '';
    this.inventoryApi.getWarehouse(this.warehouseId).subscribe({
      next: res => { if (res.isSuccess && res.data) this.warehouse = res.data; }
    });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.inventoryApi.listLocations(this.warehouseId).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess && res.data) this.locations = res.data;
        else this.error = res.message;
      },
      error: (err) => { this.loading = false; this.error = err?.message ?? 'Error'; }
    });
  }

  openCreate(): void {
    this.editId = null;
    this.modalError = '';
    this.locationForm.reset({ isPickable: true });
    this.showModal = true;
  }

  openEdit(loc: LocationDto): void {
    this.editId = loc.id;
    this.modalError = '';
    this.locationForm.patchValue({
      zone: loc.zone, aisle: loc.aisle, shelf: loc.shelf, bin: loc.bin, isPickable: loc.isPickable
    });
    this.showModal = true;
  }

  submitLocation(): void {
    if (this.locationForm.invalid) { this.locationForm.markAllAsTouched(); return; }
    this.submitting = true; this.modalError = '';
    const v = this.locationForm.value;
    const dto: LocationCreateDto = {
      warehouseId: this.warehouseId,
      zone: v.zone!, aisle: v.aisle!, shelf: v.shelf!, bin: v.bin!, isPickable: v.isPickable!
    };

    const obs = this.editId
      ? this.inventoryApi.updateLocation(this.editId, dto)
      : this.inventoryApi.createLocation(dto);

    obs.subscribe({
      next: res => {
        this.submitting = false;
        if (res.isSuccess) { this.showModal = false; this.load(); }
        else { this.modalError = res.message; }
      },
      error: (err) => { this.submitting = false; this.modalError = err?.message ?? 'Error'; }
    });
  }

  deleteLocation(loc: LocationDto): void {
    if (!confirm(`Delete location "${loc.address}"?`)) return;
    this.inventoryApi.deleteLocation(loc.id).subscribe({
      next: res => {
        if (res.isSuccess) this.load();
        else this.error = res.message;
      },
      error: (err) => { this.error = err?.message ?? 'Error'; }
    });
  }
}
