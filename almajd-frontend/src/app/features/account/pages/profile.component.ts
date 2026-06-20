import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AccountApiService, CustomerProfile } from '../services/account-api.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  template: `
    <div class="page-header">
      <h2>{{ 'account.profile' | translate }}</h2>
    </div>

    <div *ngIf="loading" class="text-center py-5">
      <div class="spinner-border text-primary"></div>
    </div>

    <div *ngIf="!loading && profile" class="row g-4">
      <!-- Read-only info -->
      <div class="col-12 col-md-4">
        <div class="card h-100">
          <div class="card-header fw-semibold">{{ 'account.accountInfo' | translate }}</div>
          <div class="card-body">
            <dl class="row small mb-0">
              <dt class="col-5 text-muted">{{ 'customers.code' | translate }}</dt>
              <dd class="col-7 fw-medium">{{ profile.code }}</dd>
              <dt class="col-5 text-muted">{{ 'customers.tier' | translate }}</dt>
              <dd class="col-7">
                <span class="badge"
                      [class.badge-vip]="profile.tier === 'VIP'"
                      [class.badge-mid]="profile.tier === 'Mid'"
                      [class.badge-small]="profile.tier === 'Small'">
                  {{ profile.tier ?? '—' }}
                </span>
              </dd>
              <dt class="col-5 text-muted">{{ 'customers.creditLimit' | translate }}</dt>
              <dd class="col-7">{{ profile.creditLimit | number:'1.0-0' }}</dd>
              <dt class="col-5 text-muted">{{ 'customers.currentAr' | translate }}</dt>
              <dd class="col-7">{{ profile.currentAr | number:'1.2-2' }}</dd>
              <dt class="col-5 text-muted">{{ 'customers.paymentTerms' | translate }}</dt>
              <dd class="col-7">{{ profile.paymentTerms ? ('NET ' + profile.paymentTerms) : '—' }}</dd>
              <dt class="col-5 text-muted">{{ 'customers.salesRep' | translate }}</dt>
              <dd class="col-7">{{ profile.salesRepName ?? '—' }}</dd>
            </dl>
          </div>
        </div>
      </div>

      <!-- Editable fields -->
      <div class="col-12 col-md-8">
        <div class="card">
          <div class="card-header fw-semibold">{{ 'account.editProfile' | translate }}</div>
          <div class="card-body">
            <div *ngIf="saveMessage" class="alert py-2 mb-3 small"
                 [class.alert-success]="saveSuccess"
                 [class.alert-danger]="!saveSuccess">
              {{ saveMessage }}
            </div>

            <form [formGroup]="form" (ngSubmit)="save()">
              <div class="row g-3">
                <div class="col-12 col-sm-6">
                  <label class="form-label small fw-medium">{{ 'customers.legalName' | translate }}</label>
                  <input type="text" class="form-control" style="font-size:14px;" formControlName="legalName"
                         [class.is-invalid]="form.controls['legalName'].touched && form.controls['legalName'].invalid">
                  <small class="text-danger" *ngIf="form.controls['legalName'].touched && form.controls['legalName'].hasError('required')">
                    {{ 'account.legalNameRequired' | translate }}
                  </small>
                </div>
                <div class="col-12 col-sm-6">
                  <label class="form-label small fw-medium">{{ 'customers.tradeName' | translate }}</label>
                  <input type="text" class="form-control" style="font-size:14px;" formControlName="tradeName">
                </div>
                <div class="col-12 col-sm-6">
                  <label class="form-label small fw-medium">{{ 'customers.taxId' | translate }}</label>
                  <input type="text" class="form-control" style="font-size:14px;" formControlName="taxId">
                </div>
                <div class="col-12 col-sm-6">
                  <label class="form-label small fw-medium">{{ 'customers.phone' | translate }}</label>
                  <input type="tel" class="form-control" style="font-size:14px;" formControlName="phone">
                </div>
                <div class="col-12">
                  <label class="form-label small fw-medium">{{ 'customers.email' | translate }}</label>
                  <input type="email" class="form-control" style="font-size:14px;" formControlName="email"
                         [class.is-invalid]="form.controls['email'].touched && form.controls['email'].invalid">
                  <small class="text-danger" *ngIf="form.controls['email'].touched && form.controls['email'].hasError('email')">
                    {{ 'auth.emailInvalid' | translate }}
                  </small>
                </div>
                <div class="col-12 pt-2">
                  <button type="submit" class="btn btn-primary" style="min-height:44px;" [disabled]="saving">
                    <span *ngIf="saving" class="spinner-border spinner-border-sm me-2"></span>
                    {{ 'common.save' | translate }}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ProfileComponent implements OnInit {
  profile: CustomerProfile | null = null;
  loading = true;
  saving = false;
  saveMessage = '';
  saveSuccess = false;

  form = this.fb.group({
    legalName: ['', Validators.required],
    tradeName: [''],
    taxId: [''],
    phone: [''],
    email: ['', Validators.email]
  });

  constructor(
    private accountApi: AccountApiService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    const userId = this.authService.currentUser?.userId ?? '';
    this.accountApi.getProfile(userId).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess && res.data) {
          this.profile = res.data;
          this.form.patchValue({
            legalName: res.data.legalName,
            tradeName: res.data.tradeName ?? '',
            taxId: res.data.taxId ?? '',
            phone: res.data.phone ?? '',
            email: res.data.email ?? ''
          });
        }
      },
      error: () => { this.loading = false; }
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.saveMessage = '';
    const userId = this.authService.currentUser?.userId ?? '';
    const v = this.form.value;
    const dto: Partial<import('../services/account-api.service').CustomerProfile> = {
      legalName: v.legalName ?? undefined,
      tradeName: v.tradeName ?? undefined,
      taxId: v.taxId ?? undefined,
      phone: v.phone ?? undefined,
      email: v.email ?? undefined
    };

    this.accountApi.updateProfile(userId, dto).subscribe({
      next: res => {
        this.saving = false;
        if (res.isSuccess) {
          this.saveMessage = 'customers.updateSuccess';
          this.saveSuccess = true;
          if (res.data) this.profile = res.data;
        } else {
          this.saveMessage = res.message;
          this.saveSuccess = false;
        }
      },
      error: (err: any) => {
        this.saving = false;
        this.saveMessage = err?.message ?? 'Save failed.';
        this.saveSuccess = false;
      }
    });
  }
}
