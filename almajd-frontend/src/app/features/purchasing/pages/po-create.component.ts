import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {
  PurchasingApiService,
  SupplierListItemDto,
  SupplierSkuDto,
  PurchaseOrderCreateDto,
  PoLineInputDto
} from '../services/purchasing-api.service';

@Component({
  selector: 'app-po-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="page-header d-flex justify-content-between align-items-center">
      <div>
        <a routerLink="/admin/purchasing/purchase-orders" class="text-muted text-decoration-none small">
          <i class="fas fa-arrow-left me-1"></i>{{ 'purchasing.po.title' | translate }}
        </a>
        <h2 class="mt-1">{{ 'purchasing.po.create' | translate }}</h2>
      </div>
    </div>

    <div *ngIf="error" class="alert alert-danger">{{ error }}</div>

    <form [formGroup]="form" (ngSubmit)="doCreate()">
      <div class="row g-3 mb-3">
        <!-- Header card -->
        <div class="col-12">
          <div class="card border-0 shadow-sm">
            <div class="card-header bg-transparent fw-medium">{{ 'purchasing.po.header' | translate }}</div>
            <div class="card-body">
              <div class="row g-3">
                <div class="col-md-4">
                  <label class="form-label small fw-medium">{{ 'purchasing.suppliers.name' | translate }} *</label>
                  <select class="form-select form-select-sm" formControlName="supplierId" (change)="onSupplierChange()">
                    <option value="">{{ 'purchasing.po.selectSupplier' | translate }}</option>
                    <option *ngFor="let s of suppliers" [value]="s.id">{{ s.name }} ({{ s.code }})</option>
                  </select>
                  <small *ngIf="form.get('supplierId')?.invalid && form.get('supplierId')?.touched" class="text-danger">
                    {{ 'purchasing.po.supplierRequired' | translate }}
                  </small>
                </div>
                <div class="col-md-2">
                  <label class="form-label small fw-medium">{{ 'purchasing.po.currency' | translate }} *</label>
                  <input type="text" class="form-control form-control-sm" formControlName="currency" placeholder="SAR">
                </div>
                <div class="col-md-3">
                  <label class="form-label small fw-medium">{{ 'purchasing.po.expectedAt' | translate }}</label>
                  <input type="date" class="form-control form-control-sm" formControlName="expectedAt">
                </div>
                <div class="col-12">
                  <label class="form-label small fw-medium">{{ 'inventory.counts.notes' | translate }}</label>
                  <textarea class="form-control form-control-sm" formControlName="notes" rows="2"></textarea>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Lines -->
        <div class="col-12">
          <div class="card border-0 shadow-sm">
            <div class="card-header bg-transparent d-flex justify-content-between align-items-center">
              <span class="fw-medium">{{ 'purchasing.po.lines' | translate }}</span>
              <button type="button" class="btn btn-outline-primary btn-sm" (click)="addLine()">
                <i class="fas fa-plus me-1"></i>{{ 'purchasing.po.addLine' | translate }}
              </button>
            </div>
            <div class="card-body p-0">
              <div *ngIf="lines.length === 0" class="text-center text-muted py-4 small">
                {{ 'purchasing.po.noLines' | translate }}
              </div>
              <div *ngIf="form.value.supplierId && !supplierSkus.length && !loadingSupplierSkus"
                   class="alert alert-warning m-3 py-2 small">
                This supplier has no supplied SKUs yet. Open the supplier and add some first.
              </div>
              <div class="table-responsive" *ngIf="lines.length > 0">
                <table class="table table-sm mb-0">
                  <thead class="table-light">
                    <tr>
                      <th>{{ 'purchasing.suppliers.skuId' | translate }} *</th>
                      <th>{{ 'purchasing.po.qty' | translate }} *</th>
                      <th>{{ 'purchasing.suppliers.costPrice' | translate }} *</th>
                      <th>{{ 'purchasing.po.currency' | translate }}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody formArrayName="lines">
                    <tr *ngFor="let line of lines.controls; let i = index" [formGroupName]="i">
                      <td style="min-width: 260px;">
                        <select class="form-select form-select-sm" formControlName="skuId"
                                (change)="onLineSkuChange(i)" [attr.disabled]="!supplierSkus.length ? true : null">
                          <option value="">— Select SKU —</option>
                          <option *ngFor="let s of supplierSkus" [ngValue]="s.skuId">
                            {{ s.skuCode }} — {{ s.productName }}
                          </option>
                        </select>
                        <small *ngIf="line.get('skuId')?.invalid && line.get('skuId')?.touched" class="text-danger">Required</small>
                      </td>
                      <td>
                        <input type="number" class="form-control form-control-sm" formControlName="qty" min="1" style="width:80px">
                        <small *ngIf="line.get('qty')?.invalid && line.get('qty')?.touched" class="text-danger">Min 1</small>
                      </td>
                      <td>
                        <input type="number" class="form-control form-control-sm" formControlName="costPrice" min="0" step="0.01" style="width:100px">
                      </td>
                      <td>
                        <input type="text" class="form-control form-control-sm" formControlName="currency" style="width:70px">
                      </td>
                      <td>
                        <button type="button" class="btn btn-sm btn-outline-danger" (click)="removeLine(i)">
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
      </div>

      <div class="d-flex gap-2">
        <button type="submit" class="btn btn-primary" [disabled]="saving || form.invalid">
          <span *ngIf="saving" class="spinner-border spinner-border-sm me-1"></span>
          <i class="fas fa-save me-1"></i>{{ 'purchasing.po.saveDraft' | translate }}
        </button>
        <a routerLink="/admin/purchasing/purchase-orders" class="btn btn-outline-secondary">
          {{ 'common.cancel' | translate }}
        </a>
      </div>
    </form>
  `
})
export class PoCreateComponent implements OnInit {
  suppliers: SupplierListItemDto[] = [];
  supplierSkus: SupplierSkuDto[] = [];
  loadingSupplierSkus = false;
  saving = false;
  error = '';

  form = this.fb.group({
    supplierId: ['', Validators.required],
    currency: ['SAR', Validators.required],
    expectedAt: [''],
    notes: [''],
    lines: this.fb.array([])
  });

  get lines(): FormArray {
    return this.form.get('lines') as FormArray;
  }

  constructor(private fb: FormBuilder, private router: Router, private purchasingApi: PurchasingApiService) {}

  ngOnInit(): void {
    this.purchasingApi.searchSuppliers({ pageSize: 200 }).subscribe({
      next: res => { if (res.isSuccess) this.suppliers = res.data?.items ?? []; }
    });
  }

  onSupplierChange(): void {
    const sid = this.form.value.supplierId;
    const supplier = this.suppliers.find(s => s.id === sid);
    if (supplier) this.form.patchValue({ currency: supplier.currency });

    this.supplierSkus = [];
    while (this.lines.length > 0) this.lines.removeAt(0);
    if (!sid) return;

    this.loadingSupplierSkus = true;
    this.purchasingApi.getSupplierSkus(sid).subscribe({
      next: res => {
        this.loadingSupplierSkus = false;
        if (res.isSuccess) this.supplierSkus = res.data ?? [];
      },
      error: () => { this.loadingSupplierSkus = false; }
    });
  }

  onLineSkuChange(i: number): void {
    const line = this.lines.at(i);
    const skuId = line.get('skuId')?.value;
    const sku = this.supplierSkus.find(s => s.skuId === skuId);
    if (sku) line.patchValue({ costPrice: sku.costPrice, currency: sku.currency });
  }

  addLine(): void {
    const currency = this.form.value.currency ?? 'SAR';
    this.lines.push(this.fb.group({
      skuId: ['', Validators.required],
      qty: [1, [Validators.required, Validators.min(1)]],
      costPrice: [0, [Validators.required, Validators.min(0)]],
      currency: [currency, Validators.required]
    }));
  }

  removeLine(i: number): void { this.lines.removeAt(i); }

  doCreate(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    this.error = '';
    const v = this.form.value;
    const dto: PurchaseOrderCreateDto = {
      supplierId: v.supplierId!,
      expectedAt: v.expectedAt || undefined,
      notes: v.notes || undefined,
      lines: (v.lines as any[]).map((l): PoLineInputDto => ({
        skuId: l.skuId,
        qty: l.qty,
        costPrice: l.costPrice
      }))
    };
    this.purchasingApi.createPO(dto).subscribe({
      next: res => {
        this.saving = false;
        if (res.isSuccess) {
          this.router.navigate(['/admin/purchasing/purchase-orders', res.data.id]);
        } else {
          this.error = res.message;
        }
      },
      error: (err: any) => { this.saving = false; this.error = err?.message ?? 'Error'; }
    });
  }
}
