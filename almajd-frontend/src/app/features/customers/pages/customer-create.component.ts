import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CustomersApiService, CustomerCreateDto } from '../services/customers-api.service';

@Component({
  selector: 'app-customer-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="page-header">
      <a routerLink="/admin/customers" class="text-muted text-decoration-none small">
        <i class="fas fa-arrow-left me-1"></i>{{ 'customers.title' | translate }}
      </a>
      <h2 class="mt-1">{{ 'customers.createTitle' | translate }}</h2>
    </div>

    <div class="card border-0 shadow-sm" style="max-width: 640px;">
      <div class="card-body">
        <div *ngIf="errorMsg" class="alert alert-danger py-2 mb-3">
          {{ errorMsg }}
          <ul *ngIf="errorList.length" class="mb-0 mt-1 ps-3">
            <li *ngFor="let e of errorList" class="small">{{ e }}</li>
          </ul>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="row g-3">
            <div class="col-12">
              <label class="form-label small fw-medium">{{ 'customers.legalName' | translate }} *</label>
              <input type="text" class="form-control" formControlName="legalName"
                     [class.is-invalid]="form.controls['legalName'].touched && form.controls['legalName'].invalid">
              <small class="text-danger" *ngIf="form.controls['legalName'].touched && form.controls['legalName'].hasError('required')">
                Legal name is required
              </small>
            </div>

            <div class="col-12">
              <label class="form-label small fw-medium">{{ 'customers.tradeName' | translate }}</label>
              <input type="text" class="form-control" formControlName="tradeName">
            </div>

            <div class="col-md-6">
              <label class="form-label small fw-medium">{{ 'customers.taxId' | translate }}</label>
              <input type="text" class="form-control" formControlName="taxId">
            </div>

            <div class="col-md-6">
              <label class="form-label small fw-medium">{{ 'customers.phone' | translate }}</label>
              <input type="tel" class="form-control" formControlName="phone">
            </div>

            <div class="col-12">
              <label class="form-label small fw-medium">{{ 'customers.email' | translate }}</label>
              <input type="email" class="form-control" formControlName="email">
            </div>

            <div class="col-md-4">
              <label class="form-label small fw-medium">{{ 'customers.tier' | translate }}</label>
              <select class="form-select" formControlName="tier">
                <option value="VIP">VIP</option>
                <option value="Mid">Mid</option>
                <option value="Small">Small</option>
              </select>
            </div>

            <div class="col-md-4">
              <label class="form-label small fw-medium">{{ 'customers.paymentTerms' | translate }}</label>
              <select class="form-select" formControlName="paymentTermsNetDays">
                <option [value]="0">Net 0 (COD)</option>
                <option [value]="15">Net 15</option>
                <option [value]="30">Net 30</option>
                <option [value]="60">Net 60</option>
              </select>
            </div>

            <div class="col-md-4">
              <label class="form-label small fw-medium">{{ 'customers.creditLimit' | translate }}</label>
              <input type="number" class="form-control" formControlName="creditLimit" min="0">
            </div>
          </div>

          <div class="d-flex gap-2 mt-4">
            <button type="submit" class="btn btn-primary" [disabled]="saving">
              <span *ngIf="saving" class="spinner-border spinner-border-sm me-1"></span>
              {{ 'common.save' | translate }}
            </button>
            <a routerLink="/admin/customers" class="btn btn-outline-secondary">
              {{ 'common.cancel' | translate }}
            </a>
          </div>
        </form>
      </div>
    </div>
  `
})
export class CustomerCreateComponent {
  saving = false;
  errorMsg = '';
  errorList: string[] = [];

  form = this.fb.group({
    legalName:            ['', Validators.required],
    tradeName:            [''],
    taxId:                [''],
    phone:                [''],
    email:                [''],
    tier:                 ['Small'],
    paymentTermsNetDays:  [0],
    creditLimit:          [0]
  });

  constructor(
    private fb: FormBuilder,
    private customersApi: CustomersApiService,
    private router: Router
  ) {}

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    this.errorMsg = '';
    this.errorList = [];
    const v = this.form.value;
    const dto: CustomerCreateDto = {
      legalName: v.legalName!, tradeName: v.tradeName ?? undefined,
      taxId: v.taxId ?? undefined, phone: v.phone ?? undefined, email: v.email ?? undefined,
      tier: v.tier!, paymentTermsNetDays: v.paymentTermsNetDays!, creditLimit: v.creditLimit!
    };
    this.customersApi.create(dto).subscribe({
      next: res => {
        this.saving = false;
        if (res.isSuccess) {
          this.router.navigate(['/admin/customers', res.data.id]);
        } else {
          this.errorMsg = res.message;
          this.errorList = res.errors ?? [];
        }
      },
      error: (err: any) => {
        this.saving = false;
        this.errorMsg = err?.message ?? 'Error creating customer.';
        this.errorList = err?.errors ?? [];
      }
    });
  }
}
