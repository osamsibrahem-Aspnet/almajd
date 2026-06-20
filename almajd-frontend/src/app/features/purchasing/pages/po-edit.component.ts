import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {
  PurchasingApiService,
  PurchaseOrderDto,
  PurchaseOrderUpdateDto,
  PoLineInputDto
} from '../services/purchasing-api.service';

@Component({
  selector: 'app-po-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="page-header d-flex justify-content-between align-items-center">
      <div>
        <a [routerLink]="['/admin/purchasing/purchase-orders', poId]" class="text-muted text-decoration-none small">
          <i class="fas fa-arrow-left me-1"></i>{{ 'purchasing.po.backToDetail' | translate }}
        </a>
        <h2 class="mt-1">{{ 'purchasing.po.edit' | translate }}</h2>
      </div>
    </div>

    <div *ngIf="loading" class="text-center py-5">
      <div class="spinner-border" style="color: var(--primary);"></div>
    </div>
    <div *ngIf="error" class="alert alert-danger">{{ error }}</div>

    <form *ngIf="po && !loading" [formGroup]="form" (ngSubmit)="doSave()">
      <div class="row g-3 mb-3">
        <div class="col-12">
          <div class="card border-0 shadow-sm">
            <div class="card-header bg-transparent fw-medium">{{ 'purchasing.po.header' | translate }}</div>
            <div class="card-body">
              <div class="row g-3">
                <div class="col-md-3">
                  <label class="form-label small fw-medium">{{ 'purchasing.po.currency' | translate }} *</label>
                  <input type="text" class="form-control form-control-sm" formControlName="currency">
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

        <div class="col-12">
          <div class="card border-0 shadow-sm">
            <div class="card-header bg-transparent d-flex justify-content-between align-items-center">
              <span class="fw-medium">{{ 'purchasing.po.lines' | translate }}</span>
              <button type="button" class="btn btn-outline-primary btn-sm" (click)="addLine()">
                <i class="fas fa-plus me-1"></i>{{ 'purchasing.po.addLine' | translate }}
              </button>
            </div>
            <div class="card-body p-0">
              <div class="table-responsive">
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
                      <td><input type="text" class="form-control form-control-sm" formControlName="skuId"></td>
                      <td><input type="number" class="form-control form-control-sm" formControlName="qty" min="1" style="width:80px"></td>
                      <td><input type="number" class="form-control form-control-sm" formControlName="costPrice" min="0" step="0.01" style="width:100px"></td>
                      <td><input type="text" class="form-control form-control-sm" formControlName="currency" style="width:70px"></td>
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
        <button type="submit" class="btn btn-primary" [disabled]="saving">
          <span *ngIf="saving" class="spinner-border spinner-border-sm me-1"></span>
          {{ 'common.save' | translate }}
        </button>
        <a [routerLink]="['/admin/purchasing/purchase-orders', poId]" class="btn btn-outline-secondary">
          {{ 'common.cancel' | translate }}
        </a>
      </div>
    </form>
  `
})
export class PoEditComponent implements OnInit {
  po: PurchaseOrderDto | null = null;
  poId = '';
  loading = true;
  saving = false;
  error = '';

  form = this.fb.group({
    currency: ['SAR', Validators.required],
    expectedAt: [''],
    notes: [''],
    lines: this.fb.array([])
  });

  get lines(): FormArray {
    return this.form.get('lines') as FormArray;
  }

  constructor(private fb: FormBuilder, private route: ActivatedRoute, private router: Router, private purchasingApi: PurchasingApiService) {}

  ngOnInit(): void {
    this.poId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.poId) this.load();
  }

  load(): void {
    this.loading = true;
    this.purchasingApi.getPO(this.poId).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess) {
          this.po = res.data;
          if (this.po.status !== 'Draft') {
            this.error = 'purchasing.po.notEditable';
            return;
          }
          this.form.patchValue({
            currency: this.po.currency,
            expectedAt: this.po.expectedAt ?? '',
            notes: this.po.notes ?? ''
          });
          while (this.lines.length) this.lines.removeAt(0);
          this.po.lines.forEach(l => {
            this.lines.push(this.fb.group({
              skuId: [l.skuId, Validators.required],
              qty: [l.qty, [Validators.required, Validators.min(1)]],
              costPrice: [l.costPrice, [Validators.required, Validators.min(0.01)]]
            }));
          });
        } else {
          this.error = res.message;
        }
      },
      error: (err: any) => { this.loading = false; this.error = err?.message ?? 'Error'; }
    });
  }

  addLine(): void {
    this.lines.push(this.fb.group({
      skuId: ['', Validators.required],
      qty: [1, [Validators.required, Validators.min(1)]],
      costPrice: [0.01, [Validators.required, Validators.min(0.01)]]
    }));
  }

  removeLine(i: number): void { this.lines.removeAt(i); }

  doSave(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const v = this.form.value;
    const dto: PurchaseOrderUpdateDto = {
      expectedAt: v.expectedAt || undefined,
      notes: v.notes || undefined,
      lines: (v.lines as any[]).map((l): PoLineInputDto => ({
        skuId: l.skuId, qty: l.qty, costPrice: l.costPrice
      }))
    };
    this.purchasingApi.updatePO(this.poId, dto).subscribe({
      next: res => {
        this.saving = false;
        if (res.isSuccess) {
          this.router.navigate(['/admin/purchasing/purchase-orders', this.poId]);
        } else {
          this.error = res.message;
        }
      },
      error: (err: any) => { this.saving = false; this.error = err?.message ?? 'Error'; }
    });
  }
}
