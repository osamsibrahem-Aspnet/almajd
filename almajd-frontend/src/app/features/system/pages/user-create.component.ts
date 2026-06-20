import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SystemApiService } from '../services/system-api.service';

@Component({
  selector: 'app-user-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="page-header d-flex justify-content-between align-items-center">
      <div>
        <a routerLink="/admin/system/users" class="text-muted text-decoration-none small">
          <i class="fas fa-arrow-left me-1"></i>{{ 'system.users.title' | translate }}
        </a>
        <h2 class="mt-1">{{ 'system.users.create' | translate }}</h2>
      </div>
    </div>

    <div *ngIf="error" class="alert alert-danger">{{ error }}</div>

    <div class="card border-0 shadow-sm" style="max-width:600px;">
      <div class="card-body">
        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="mb-3">
            <label class="form-label">{{ 'system.users.email' | translate }} *</label>
            <input type="email" class="form-control" formControlName="email" autocomplete="off">
            <small *ngIf="f['email'].invalid && f['email'].touched" class="text-danger">
              {{ 'system.users.emailRequired' | translate }}
            </small>
          </div>

          <div class="mb-3">
            <label class="form-label">{{ 'auth.password' | translate }} *</label>
            <input type="password" class="form-control" formControlName="password" autocomplete="new-password">
            <div class="mt-1">
              <div class="d-flex gap-1">
                <div class="flex-fill rounded" style="height:4px;"
                     [class.bg-danger]="pwStrength >= 1"
                     [class.bg-secondary]="pwStrength < 1"></div>
                <div class="flex-fill rounded" style="height:4px;"
                     [class.bg-warning]="pwStrength >= 2"
                     [class.bg-secondary]="pwStrength < 2"></div>
                <div class="flex-fill rounded" style="height:4px;"
                     [class.bg-success]="pwStrength >= 3"
                     [class.bg-secondary]="pwStrength < 3"></div>
              </div>
              <small class="text-muted">{{ pwStrengthLabel }}</small>
            </div>
            <small *ngIf="f['password'].invalid && f['password'].touched" class="text-danger d-block mt-1">
              {{ 'system.users.passwordRequired' | translate }}
            </small>
          </div>

          <div class="mb-3">
            <label class="form-label">{{ 'system.users.fullName' | translate }} *</label>
            <input type="text" class="form-control" formControlName="fullName">
            <small *ngIf="f['fullName'].invalid && f['fullName'].touched" class="text-danger">
              {{ 'system.users.fullNameRequired' | translate }}
            </small>
          </div>

          <div class="mb-3">
            <label class="form-label">{{ 'system.users.phone' | translate }}</label>
            <input type="tel" class="form-control" formControlName="phone">
          </div>

          <div class="mb-3">
            <label class="form-label">{{ 'system.users.roles' | translate }} *</label>
            <p class="small text-muted mb-1">{{ 'system.users.rolesHint' | translate }}</p>
            <div class="d-flex flex-wrap gap-2">
              <div *ngFor="let role of availableRoles" class="form-check form-check-inline">
                <input
                  type="checkbox"
                  class="form-check-input"
                  [id]="'newrole-' + role"
                  [checked]="selectedRoles.includes(role)"
                  (change)="toggleRole(role, $event)">
                <label class="form-check-label small" [for]="'newrole-' + role">{{ role }}</label>
              </div>
            </div>
            <small *ngIf="rolesError" class="text-danger d-block mt-1">{{ rolesError }}</small>
          </div>

          <div class="d-flex gap-2 mt-4">
            <button type="submit" class="btn btn-primary" [disabled]="saving">
              <span *ngIf="saving" class="spinner-border spinner-border-sm me-1"></span>
              {{ 'system.users.create' | translate }}
            </button>
            <a routerLink="/admin/system/users" class="btn btn-outline-secondary">{{ 'common.cancel' | translate }}</a>
          </div>
        </form>
      </div>
    </div>
  `
})
export class UserCreateComponent implements OnInit {
  saving = false;
  error = '';
  rolesError = '';
  availableRoles: string[] = [];
  selectedRoles: string[] = [];

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    fullName: ['', Validators.required],
    phone: ['']
  });

  get f() { return this.form.controls; }

  constructor(
    private fb: FormBuilder,
    private systemApi: SystemApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.systemApi.listRoles().subscribe({
      next: res => { if (res.isSuccess && res.data) this.availableRoles = res.data; }
    });
  }

  get pwStrength(): number {
    const pw = this.form.value.password ?? '';
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  }

  get pwStrengthLabel(): string {
    const labels = ['', 'system.users.pwWeak', 'system.users.pwFair', 'system.users.pwStrong'];
    return labels[this.pwStrength] ?? '';
  }

  toggleRole(role: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      if (!this.selectedRoles.includes(role)) this.selectedRoles.push(role);
    } else {
      this.selectedRoles = this.selectedRoles.filter(r => r !== role);
    }
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (this.selectedRoles.length === 0) {
      this.rolesError = 'At least one role is required';
      return;
    }
    this.rolesError = '';
    this.saving = true;
    const v = this.form.value;
    this.systemApi.createUser({
      email: v.email!,
      password: v.password!,
      fullName: v.fullName!,
      phone: v.phone ?? '',
      roles: this.selectedRoles
    }).subscribe({
      next: res => {
        this.saving = false;
        if (res.isSuccess) {
          this.router.navigate(['/admin/system/users', res.data?.id]);
        } else {
          this.error = res.message;
          if (res.errors?.length) this.error += ': ' + res.errors.join(', ');
        }
      },
      error: err => { this.saving = false; this.error = err?.message ?? 'Error'; }
    });
  }
}
