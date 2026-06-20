import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  PurchasingApiService,
  SupplierDto,
  SupplierSkuDto,
  SupplierUpdateDto,
  SupplierSkuUpsertDto
} from '../services/purchasing-api.service';
import { CatalogApiService, ProductListItemDto, SkuDto } from '../../catalog/services/catalog-api.service';

@Component({
  selector: 'app-supplier-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, TranslateModule],
  template: `
    <div class="page-header d-flex justify-content-between align-items-center">
      <div>
        <a routerLink="/admin/purchasing/suppliers" class="text-muted text-decoration-none small">
          <i class="fas fa-arrow-left me-1"></i>{{ 'purchasing.suppliers.title' | translate }}
        </a>
        <h2 class="mt-1">{{ supplier?.name ?? ('common.loading' | translate) }}</h2>
      </div>
      <button *ngIf="supplier" class="btn btn-outline-primary btn-sm" (click)="openEditModal()">
        <i class="fas fa-edit me-1"></i>{{ 'common.edit' | translate }}
      </button>
    </div>

    <div *ngIf="loading" class="text-center py-5">
      <div class="spinner-border" style="color: var(--primary);"></div>
    </div>
    <div *ngIf="error" class="alert alert-danger">{{ error }}</div>
    <div *ngIf="successMsg" class="alert alert-success py-2">{{ successMsg }}</div>

    <div *ngIf="supplier && !loading">
      <!-- Tabs -->
      <ul class="nav nav-tabs mb-3">
        <li class="nav-item">
          <button class="nav-link" [class.active]="activeTab === 'info'" (click)="activeTab = 'info'">
            {{ 'purchasing.suppliers.tabInfo' | translate }}
          </button>
        </li>
        <li class="nav-item">
          <button class="nav-link" [class.active]="activeTab === 'skus'" (click)="activeTab = 'skus'; loadSkus()">
            {{ 'purchasing.suppliers.tabSkus' | translate }}
            <span *ngIf="supplier.skuCount > 0" class="badge bg-secondary ms-1">{{ supplier.skuCount }}</span>
          </button>
        </li>
      </ul>

      <!-- Info Tab -->
      <div *ngIf="activeTab === 'info'" class="card border-0 shadow-sm">
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-6">
              <table class="table table-sm table-borderless mb-0">
                <tr><td class="text-muted small fw-medium" style="width:160px;">{{ 'purchasing.suppliers.code' | translate }}</td><td class="font-monospace">{{ supplier.code }}</td></tr>
                <tr><td class="text-muted small fw-medium">{{ 'purchasing.suppliers.name' | translate }}</td><td>{{ supplier.name }}</td></tr>
                <tr><td class="text-muted small fw-medium">{{ 'purchasing.suppliers.contact' | translate }}</td><td>{{ supplier.contactName ?? '—' }}</td></tr>
                <tr><td class="text-muted small fw-medium">{{ 'purchasing.suppliers.phone' | translate }}</td><td>{{ supplier.phone ?? '—' }}</td></tr>
                <tr><td class="text-muted small fw-medium">{{ 'customers.email' | translate }}</td><td>{{ supplier.email ?? '—' }}</td></tr>
              </table>
            </div>
            <div class="col-md-6">
              <table class="table table-sm table-borderless mb-0">
                <tr><td class="text-muted small fw-medium" style="width:160px;">{{ 'purchasing.suppliers.currency' | translate }}</td><td>{{ supplier.currency }}</td></tr>
                <tr><td class="text-muted small fw-medium">{{ 'purchasing.suppliers.paymentTerms' | translate }}</td><td>Net {{ supplier.paymentTermsNetDays }}d</td></tr>
                <tr><td class="text-muted small fw-medium">{{ 'customers.taxId' | translate }}</td><td>{{ supplier.taxId ?? '—' }}</td></tr>
                <tr><td class="text-muted small fw-medium">{{ 'common.status' | translate }}</td>
                  <td><span class="badge" [class.badge-approved]="supplier.isActive" [class.badge-cancelled]="!supplier.isActive">
                    {{ (supplier.isActive ? 'common.active' : 'common.inactive') | translate }}
                  </span></td>
                </tr>
                <tr><td class="text-muted small fw-medium">{{ 'customers.addresses' | translate }}</td><td>{{ supplier.address ?? '—' }}</td></tr>
              </table>
            </div>
            <div class="col-12" *ngIf="supplier.notes">
              <label class="text-muted small fw-medium">{{ 'inventory.counts.notes' | translate }}</label>
              <p class="mb-0 small">{{ supplier.notes }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- SKUs Tab -->
      <div *ngIf="activeTab === 'skus'">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="text-muted small">{{ 'purchasing.suppliers.skuCount' | translate }}: {{ skus.length }}</span>
          <button class="btn btn-primary btn-sm" (click)="openSkuModal()">
            <i class="fas fa-plus me-1"></i>{{ 'purchasing.suppliers.addSku' | translate }}
          </button>
        </div>
        <div *ngIf="skusLoading" class="text-center py-3">
          <div class="spinner-border spinner-border-sm" style="color: var(--primary);"></div>
        </div>
        <div *ngIf="!skusLoading" class="card border-0 shadow-sm">
          <div class="table-responsive">
            <table class="table table-hover mb-0">
              <thead class="table-light">
                <tr>
                  <th>{{ 'purchasing.suppliers.skuCode' | translate }}</th>
                  <th>{{ 'catalog.products.name' | translate }}</th>
                  <th>{{ 'purchasing.suppliers.costPrice' | translate }}</th>
                  <th>{{ 'purchasing.suppliers.leadTime' | translate }}</th>
                  <th>{{ 'purchasing.suppliers.preferred' | translate }}</th>
                  <th class="text-end">{{ 'common.actions' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngIf="skus.length === 0">
                  <td colspan="6" class="text-center text-muted py-4">{{ 'common.noData' | translate }}</td>
                </tr>
                <tr *ngFor="let sku of skus">
                  <td class="font-monospace small">{{ sku.skuCode }}</td>
                  <td class="small">{{ sku.productName }}</td>
                  <td>{{ sku.currency }} {{ sku.costPrice | number:'1.2-2' }}</td>
                  <td>{{ sku.leadTimeDays }}d</td>
                  <td>
                    <span *ngIf="sku.isPreferred" class="badge badge-approved">
                      <i class="fas fa-star me-1"></i>{{ 'purchasing.suppliers.preferredBadge' | translate }}
                    </span>
                    <span *ngIf="!sku.isPreferred" class="text-muted small">—</span>
                  </td>
                  <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary me-1" (click)="openSkuModal(sku)">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" (click)="removeSku(sku)">
                      <i class="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Supplier Modal -->
    <div *ngIf="showEditModal" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.4);">
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ 'purchasing.suppliers.edit' | translate }}</h5>
            <button type="button" class="btn-close" (click)="showEditModal = false"></button>
          </div>
          <form [formGroup]="editForm" (ngSubmit)="doEdit()">
            <div class="modal-body">
              <div *ngIf="editError" class="alert alert-danger py-2 small">{{ editError }}</div>
              <div class="row g-3">
                <div class="col-md-4">
                  <label class="form-label small fw-medium">{{ 'purchasing.suppliers.code' | translate }} *</label>
                  <input type="text" class="form-control form-control-sm" formControlName="code">
                </div>
                <div class="col-md-8">
                  <label class="form-label small fw-medium">{{ 'purchasing.suppliers.name' | translate }} *</label>
                  <input type="text" class="form-control form-control-sm" formControlName="name">
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
                  <input type="text" class="form-control form-control-sm" formControlName="currency">
                </div>
                <div class="col-md-4">
                  <label class="form-label small fw-medium">{{ 'purchasing.suppliers.paymentTerms' | translate }} *</label>
                  <input type="number" class="form-control form-control-sm" formControlName="paymentTermsNetDays" min="0">
                </div>
                <div class="col-md-4">
                  <label class="form-label small fw-medium">{{ 'common.status' | translate }}</label>
                  <select class="form-select form-select-sm" formControlName="isActive">
                    <option [ngValue]="true">{{ 'common.active' | translate }}</option>
                    <option [ngValue]="false">{{ 'common.inactive' | translate }}</option>
                  </select>
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
              <button type="button" class="btn btn-secondary btn-sm" (click)="showEditModal = false">{{ 'common.cancel' | translate }}</button>
              <button type="submit" class="btn btn-primary btn-sm" [disabled]="editing || editForm.invalid">
                <span *ngIf="editing" class="spinner-border spinner-border-sm me-1"></span>
                {{ 'common.save' | translate }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- SKU Upsert Modal -->
    <div *ngIf="showSkuModal" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.4);">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ (editingSku ? 'purchasing.suppliers.editSku' : 'purchasing.suppliers.addSku') | translate }}</h5>
            <button type="button" class="btn-close" (click)="showSkuModal = false"></button>
          </div>
          <form [formGroup]="skuForm" (ngSubmit)="doUpsertSku()">
            <div class="modal-body">
              <div *ngIf="skuError" class="alert alert-danger py-2 small">{{ skuError }}</div>
              <div class="row g-3">
                <div class="col-12" *ngIf="!editingSku">
                  <label class="form-label small fw-medium">Product *</label>
                  <select class="form-select form-select-sm"
                          [ngModel]="selectedProductId" [ngModelOptions]="{ standalone: true }"
                          (ngModelChange)="onProductPicked($event)">
                    <option [ngValue]="null">— Select product —</option>
                    <option *ngFor="let p of productOptions" [ngValue]="p.id">
                      {{ p.brandName }} — {{ p.name }}
                    </option>
                  </select>
                </div>
                <div class="col-12" *ngIf="!editingSku">
                  <label class="form-label small fw-medium">SKU *</label>
                  <select class="form-select form-select-sm" formControlName="skuId" [attr.disabled]="!skuOptions.length ? true : null">
                    <option value="">— Select SKU —</option>
                    <option *ngFor="let s of skuOptions" [ngValue]="s.id">
                      {{ s.code }}<span *ngIf="s.barcode"> ({{ s.barcode }})</span>
                    </option>
                  </select>
                  <small *ngIf="skuForm.get('skuId')?.invalid && skuForm.get('skuId')?.touched" class="text-danger">
                    {{ 'purchasing.suppliers.skuIdRequired' | translate }}
                  </small>
                </div>
                <div class="col-12" *ngIf="editingSku">
                  <label class="form-label small fw-medium">SKU</label>
                  <input type="text" class="form-control form-control-sm"
                         [value]="editingSku.skuCode + ' — ' + editingSku.productName" readonly>
                </div>
                <div class="col-6">
                  <label class="form-label small fw-medium">{{ 'purchasing.suppliers.costPrice' | translate }} *</label>
                  <input type="number" class="form-control form-control-sm" formControlName="costPrice" min="0" step="0.01">
                </div>
                <div class="col-6">
                  <label class="form-label small fw-medium">{{ 'purchasing.suppliers.currency' | translate }} *</label>
                  <input type="text" class="form-control form-control-sm" formControlName="currency">
                </div>
                <div class="col-6">
                  <label class="form-label small fw-medium">{{ 'purchasing.suppliers.leadTime' | translate }}</label>
                  <input type="number" class="form-control form-control-sm" formControlName="leadTimeDays" min="0">
                </div>
                <div class="col-6 d-flex align-items-end pb-1">
                  <div class="form-check">
                    <input type="checkbox" class="form-check-input" formControlName="isPreferred" id="prefChk">
                    <label class="form-check-label small" for="prefChk">{{ 'purchasing.suppliers.preferred' | translate }}</label>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary btn-sm" (click)="showSkuModal = false">{{ 'common.cancel' | translate }}</button>
              <button type="submit" class="btn btn-primary btn-sm" [disabled]="upserting">
                <span *ngIf="upserting" class="spinner-border spinner-border-sm me-1"></span>
                {{ 'common.save' | translate }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class SupplierDetailComponent implements OnInit {
  supplier: SupplierDto | null = null;
  skus: SupplierSkuDto[] = [];
  loading = true;
  skusLoading = false;
  skusLoaded = false;
  error = '';
  successMsg = '';
  activeTab = 'info';
  showEditModal = false;
  editing = false;
  editError = '';
  showSkuModal = false;
  upserting = false;
  skuError = '';
  editingSku: SupplierSkuDto | null = null;
  productOptions: ProductListItemDto[] = [];
  skuOptions: SkuDto[] = [];
  selectedProductId: string | null = null;

  editForm = this.fb.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    contactName: [''],
    phone: [''],
    email: [''],
    taxId: [''],
    address: [''],
    currency: ['', Validators.required],
    paymentTermsNetDays: [30],
    isActive: [true],
    notes: ['']
  });

  skuForm = this.fb.group({
    skuId: ['', Validators.required],
    costPrice: [0, [Validators.required, Validators.min(0)]],
    currency: ['SAR', Validators.required],
    leadTimeDays: [7],
    isPreferred: [false]
  });

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private purchasingApi: PurchasingApiService,
    private catalogApi: CatalogApiService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.load(id);
  }

  load(id: string): void {
    this.loading = true;
    this.purchasingApi.getSupplier(id).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess) { this.supplier = res.data; }
        else { this.error = res.message; }
      },
      error: (err: any) => { this.loading = false; this.error = err?.message ?? 'Error'; }
    });
  }

  loadSkus(): void {
    if (!this.supplier || this.skusLoaded) return;
    this.skusLoading = true;
    this.purchasingApi.getSupplierSkus(this.supplier.id).subscribe({
      next: res => {
        this.skusLoading = false;
        this.skusLoaded = true;
        if (res.isSuccess) this.skus = res.data ?? [];
      },
      error: () => { this.skusLoading = false; }
    });
  }

  openEditModal(): void {
    if (!this.supplier) return;
    const s = this.supplier;
    this.editForm.patchValue({
      code: s.code, name: s.name, contactName: s.contactName ?? '',
      phone: s.phone ?? '', email: s.email ?? '', taxId: s.taxId ?? '',
      address: s.address ?? '', currency: s.currency,
      paymentTermsNetDays: s.paymentTermsNetDays, isActive: s.isActive,
      notes: s.notes ?? ''
    });
    this.editError = '';
    this.showEditModal = true;
  }

  doEdit(): void {
    if (!this.supplier || this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    this.editing = true;
    const v = this.editForm.value;
    const dto: SupplierUpdateDto = {
      code: v.code!, name: v.name!, contactName: v.contactName || undefined,
      phone: v.phone || undefined, email: v.email || undefined,
      taxId: v.taxId || undefined, address: v.address || undefined,
      currency: v.currency!, paymentTermsNetDays: v.paymentTermsNetDays ?? 30,
      isActive: v.isActive ?? true, notes: v.notes || undefined
    };
    this.purchasingApi.updateSupplier(this.supplier.id, dto).subscribe({
      next: res => {
        this.editing = false;
        if (res.isSuccess) {
          this.showEditModal = false;
          this.supplier = res.data;
          this.successMsg = 'purchasing.suppliers.updateSuccess';
          setTimeout(() => this.successMsg = '', 3000);
        } else {
          this.editError = res.message;
        }
      },
      error: (err: any) => { this.editing = false; this.editError = err?.message ?? 'Error'; }
    });
  }

  openSkuModal(sku?: SupplierSkuDto): void {
    this.editingSku = sku ?? null;
    this.skuError = '';
    this.selectedProductId = null;
    this.skuOptions = [];
    if (sku) {
      this.skuForm.patchValue({
        skuId: sku.skuId, costPrice: sku.costPrice, currency: sku.currency,
        leadTimeDays: sku.leadTimeDays, isPreferred: sku.isPreferred
      });
    } else {
      this.skuForm.reset({ currency: this.supplier?.currency ?? 'SAR', leadTimeDays: 7, isPreferred: false });
      this.loadProductOptions();
    }
    this.showSkuModal = true;
  }

  private loadProductOptions(): void {
    if (this.productOptions.length > 0) return;
    this.catalogApi.searchProducts({ pageSize: 500, sort: 'name' }).subscribe({
      next: res => {
        this.productOptions = res.data?.items ?? [];
      }
    });
  }

  onProductPicked(productId: string | null): void {
    this.selectedProductId = productId;
    this.skuOptions = [];
    this.skuForm.patchValue({ skuId: '' });
    if (!productId) return;
    this.catalogApi.getProduct(productId).subscribe({
      next: res => {
        if (res.isSuccess && res.data) this.skuOptions = res.data.skus ?? [];
      }
    });
  }

  doUpsertSku(): void {
    if (!this.supplier || this.skuForm.invalid) { this.skuForm.markAllAsTouched(); return; }
    this.upserting = true;
    const v = this.skuForm.value;
    const dto: SupplierSkuUpsertDto = {
      skuId: v.skuId!, costPrice: v.costPrice!, currency: v.currency!,
      leadTimeDays: v.leadTimeDays ?? 7, isPreferred: v.isPreferred ?? false
    };
    this.purchasingApi.upsertSupplierSku(this.supplier.id, dto).subscribe({
      next: res => {
        this.upserting = false;
        if (res.isSuccess) {
          this.showSkuModal = false;
          this.skusLoaded = false;
          this.loadSkus();
        } else {
          this.skuError = res.message;
        }
      },
      error: (err: any) => { this.upserting = false; this.skuError = err?.message ?? 'Error'; }
    });
  }

  removeSku(sku: SupplierSkuDto): void {
    if (!this.supplier || !confirm('Remove this SKU from supplier?')) return;
    this.purchasingApi.deleteSupplierSku(this.supplier.id, sku.skuId).subscribe({
      next: res => {
        if (res.isSuccess) {
          this.skus = this.skus.filter(s => s.skuId !== sku.skuId);
          if (this.supplier) this.supplier.skuCount = Math.max(0, this.supplier.skuCount - 1);
        }
      },
      error: () => {}
    });
  }
}
