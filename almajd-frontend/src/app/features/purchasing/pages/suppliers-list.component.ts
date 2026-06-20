import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { PurchasingApiService, SupplierListItemDto, SupplierCreateDto } from '../services/purchasing-api.service';
import { PagedResult } from '../../../core/api/paged-result';

@Component({
  selector: 'app-suppliers-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="page-header d-flex justify-content-between align-items-center">
      <h2>{{ 'purchasing.suppliers.title' | translate }}</h2>
      <button class="btn btn-primary btn-sm" (click)="openCreateModal()">
        <i class="fas fa-plus me-1"></i>{{ 'purchasing.suppliers.create' | translate }}
      </button>
    </div>

    <!-- Filters -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-body py-2">
        <form [formGroup]="filterForm" (ngSubmit)="applyFilters()" class="row g-2 align-items-end">
          <div class="col-sm-4">
            <input type="text" class="form-control form-control-sm" formControlName="search"
                   [placeholder]="'purchasing.suppliers.searchPlaceholder' | translate">
          </div>
          <div class="col-sm-2">
            <select class="form-select form-select-sm" formControlName="isActive">
              <option value="">{{ 'common.status' | translate }}</option>
              <option value="true">{{ 'common.active' | translate }}</option>
              <option value="false">{{ 'common.inactive' | translate }}</option>
            </select>
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
                <th>{{ 'purchasing.suppliers.code' | translate }}</th>
                <th>{{ 'purchasing.suppliers.name' | translate }}</th>
                <th>{{ 'purchasing.suppliers.contact' | translate }}</th>
                <th>{{ 'purchasing.suppliers.currency' | translate }}</th>
                <th>{{ 'purchasing.suppliers.paymentTerms' | translate }}</th>
                <th>{{ 'purchasing.suppliers.skuCount' | translate }}</th>
                <th>{{ 'common.status' | translate }}</th>
                <th class="text-end">{{ 'common.actions' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="suppliers.length === 0">
                <td colspan="8" class="text-center text-muted py-4">{{ 'common.noData' | translate }}</td>
              </tr>
              <tr *ngFor="let s of suppliers">
                <td class="font-monospace fw-medium">{{ s.code }}</td>
                <td>
                  <div class="fw-medium">{{ s.name }}</div>
                  <small *ngIf="s.email" class="text-muted">{{ s.email }}</small>
                </td>
                <td class="small">
                  <div *ngIf="s.contactName">{{ s.contactName }}</div>
                  <div *ngIf="s.phone" class="text-muted">{{ s.phone }}</div>
                </td>
                <td>{{ s.currency }}</td>
                <td class="small">Net {{ s.paymentTermsNetDays }}d</td>
                <td><span class="badge bg-secondary">{{ s.skuCount }}</span></td>
                <td>
                  <span class="badge" [class.badge-approved]="s.isActive" [class.badge-cancelled]="!s.isActive">
                    {{ (s.isActive ? 'common.active' : 'common.inactive') | translate }}
                  </span>
                </td>
                <td class="text-end">
                  <a [routerLink]="['/admin/purchasing/suppliers', s.id]" class="btn btn-sm btn-outline-primary me-1">
                    <i class="fas fa-eye"></i>
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

    <!-- Create Modal -->
    <div *ngIf="showCreateModal" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.4);">
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ 'purchasing.suppliers.create' | translate }}</h5>
            <button type="button" class="btn-close" (click)="showCreateModal = false"></button>
          </div>
          <form [formGroup]="createForm" (ngSubmit)="doCreate()">
            <div class="modal-body">
              <div *ngIf="createError" class="alert alert-danger py-2 small">{{ createError }}</div>
              <div class="row g-3">
                <div class="col-md-4">
                  <label class="form-label small fw-medium">{{ 'purchasing.suppliers.code' | translate }} *</label>
                  <input type="text" class="form-control form-control-sm" formControlName="code">
                  <small *ngIf="createForm.get('code')?.invalid && createForm.get('code')?.touched" class="text-danger">
                    {{ 'purchasing.suppliers.codeRequired' | translate }}
                  </small>
                </div>
                <div class="col-md-8">
                  <label class="form-label small fw-medium">{{ 'purchasing.suppliers.name' | translate }} *</label>
                  <input type="text" class="form-control form-control-sm" formControlName="name">
                  <small *ngIf="createForm.get('name')?.invalid && createForm.get('name')?.touched" class="text-danger">
                    {{ 'purchasing.suppliers.nameRequired' | translate }}
                  </small>
                </div>
                <div class="col-md-6">
                  <label class="form-label small fw-medium">{{ 'purchasing.suppliers.contact' | translate }}</label>
                  <input type="text" class="form-control form-control-sm" formControlName="contactName">
                </div>
                <div class="col-md-6">
                  <label class="form-label small fw-medium">{{ 'purchasing.suppliers.phone' | translate }}</label>
                  <input type="text" class="form-control form-control-sm" formControlName="phone">
                </div>
                <div class="col-md-6">
                  <label class="form-label small fw-medium">{{ 'customers.email' | translate }}</label>
                  <input type="email" class="form-control form-control-sm" formControlName="email">
                </div>
                <div class="col-md-6">
                  <label class="form-label small fw-medium">{{ 'customers.taxId' | translate }}</label>
                  <input type="text" class="form-control form-control-sm" formControlName="taxId">
                </div>
                <div class="col-md-4">
                  <label class="form-label small fw-medium">{{ 'purchasing.suppliers.currency' | translate }} *</label>
                  <input type="text" class="form-control form-control-sm" formControlName="currency" placeholder="SAR">
                  <small *ngIf="createForm.get('currency')?.invalid && createForm.get('currency')?.touched" class="text-danger">
                    {{ 'purchasing.suppliers.currencyRequired' | translate }}
                  </small>
                </div>
                <div class="col-md-4">
                  <label class="form-label small fw-medium">{{ 'purchasing.suppliers.paymentTerms' | translate }} *</label>
                  <input type="number" class="form-control form-control-sm" formControlName="paymentTermsNetDays" min="0">
                </div>
                <div class="col-12">
                  <label class="form-label small fw-medium">{{ 'customers.addresses' | translate }}</label>
                  <input type="text" class="form-control form-control-sm" formControlName="address">
                </div>
                <div class="col-12">
                  <label class="form-label small fw-medium">{{ 'inventory.counts.notes' | translate }}</label>
                  <textarea class="form-control form-control-sm" formControlName="notes" rows="2"></textarea>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary btn-sm" (click)="showCreateModal = false">
                {{ 'common.cancel' | translate }}
              </button>
              <button type="submit" class="btn btn-primary btn-sm" [disabled]="creating || createForm.invalid">
                <span *ngIf="creating" class="spinner-border spinner-border-sm me-1"></span>
                {{ 'common.save' | translate }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class SuppliersListComponent implements OnInit {
  suppliers: SupplierListItemDto[] = [];
  pagedResult: PagedResult<SupplierListItemDto> | null = null;
  loading = true;
  error = '';
  currentPage = 1;
  pageSize = 50;
  showCreateModal = false;
  creating = false;
  createError = '';

  filterForm = this.fb.group({ search: [''], isActive: [''] });
  createForm = this.fb.group({
    code: ['', [Validators.required]],
    name: ['', [Validators.required]],
    contactName: [''],
    phone: [''],
    email: [''],
    taxId: [''],
    address: [''],
    currency: ['SAR', [Validators.required]],
    paymentTermsNetDays: [30],
    notes: ['']
  });

  get totalPages(): number {
    return this.pagedResult ? Math.ceil(this.pagedResult.total / this.pageSize) : 1;
  }

  constructor(private fb: FormBuilder, private purchasingApi: PurchasingApiService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.error = '';
    const v = this.filterForm.value;
    const params: any = { page: this.currentPage, pageSize: this.pageSize };
    if (v.search) params.search = v.search;
    if (v.isActive !== '') params.isActive = v.isActive;

    this.purchasingApi.searchSuppliers(params).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess && res.data) {
          this.pagedResult = res.data;
          this.suppliers = res.data.items ?? [];
        } else {
          this.error = res.message;
        }
      },
      error: (err: any) => { this.loading = false; this.error = err?.message ?? 'Error'; }
    });
  }

  applyFilters(): void { this.currentPage = 1; this.load(); }
  resetFilters(): void {
    this.filterForm.reset({ search: '', isActive: '' });
    this.currentPage = 1;
    this.load();
  }
  changePage(p: number): void { this.currentPage = p; this.load(); }

  openCreateModal(): void {
    this.createForm.reset({ currency: 'SAR', paymentTermsNetDays: 30 });
    this.createError = '';
    this.showCreateModal = true;
  }

  doCreate(): void {
    if (this.createForm.invalid) { this.createForm.markAllAsTouched(); return; }
    this.creating = true;
    this.createError = '';
    const v = this.createForm.value;
    const dto: SupplierCreateDto = {
      code: v.code!,
      name: v.name!,
      contactName: v.contactName || undefined,
      phone: v.phone || undefined,
      email: v.email || undefined,
      taxId: v.taxId || undefined,
      address: v.address || undefined,
      currency: v.currency!,
      paymentTermsNetDays: v.paymentTermsNetDays ?? 30,
      notes: v.notes || undefined
    };
    this.purchasingApi.createSupplier(dto).subscribe({
      next: res => {
        this.creating = false;
        if (res.isSuccess) {
          this.showCreateModal = false;
          this.load();
        } else {
          this.createError = res.message;
        }
      },
      error: (err: any) => { this.creating = false; this.createError = err?.message ?? 'Error'; }
    });
  }
}
