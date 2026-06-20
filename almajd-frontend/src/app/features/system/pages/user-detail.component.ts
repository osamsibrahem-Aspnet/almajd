import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SystemApiService, UserDto } from '../services/system-api.service';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="page-header d-flex justify-content-between align-items-center flex-wrap gap-2">
      <div>
        <a routerLink="/admin/system/users" class="text-muted text-decoration-none small">
          <i class="fas fa-arrow-left me-1"></i>{{ 'system.users.title' | translate }}
        </a>
        <h2 class="mt-1">{{ user?.fullName || 'system.users.detail' | translate }}</h2>
      </div>
    </div>

    <div *ngIf="loading" class="text-center py-5">
      <div class="spinner-border" style="color:var(--primary)"></div>
    </div>
    <div *ngIf="error" class="alert alert-danger">{{ error }}</div>
    <div *ngIf="actionSuccess" class="alert alert-success">{{ actionSuccess }}</div>

    <div *ngIf="user && !loading">
      <div class="row g-3">
        <!-- Header card -->
        <div class="col-lg-5">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="d-flex align-items-center gap-3 mb-3">
                <div class="avatar" style="width:52px;height:52px;font-size:1.2rem;">
                  {{ initials(user.fullName) }}
                </div>
                <div>
                  <div class="fw-bold fs-5">{{ user.fullName }}</div>
                  <div class="text-muted small">{{ user.email }}</div>
                </div>
              </div>
              <dl class="row small mb-0">
                <dt class="col-5 text-muted">{{ 'system.users.phone' | translate }}</dt>
                <dd class="col-7">{{ user.phone || '—' }}</dd>

                <dt class="col-5 text-muted">{{ 'common.status' | translate }}</dt>
                <dd class="col-7">
                  <span class="badge" [class]="user.isLockedOut ? 'bg-danger' : 'bg-success'">
                    {{ (user.isLockedOut ? 'system.users.locked' : 'system.users.active') | translate }}
                  </span>
                </dd>

                <ng-container *ngIf="user.customerName">
                  <dt class="col-5 text-muted">{{ 'system.users.customer' | translate }}</dt>
                  <dd class="col-7">
                    <a [routerLink]="['/admin/customers', user.customerId]" class="text-primary">{{ user.customerName }}</a>
                  </dd>
                </ng-container>
              </dl>

              <div class="d-flex gap-2 mt-3">
                <button *ngIf="!user.isLockedOut" class="btn btn-warning btn-sm" [disabled]="saving" (click)="deactivate()">
                  <i class="fas fa-ban me-1"></i>{{ 'system.users.deactivate' | translate }}
                </button>
                <button *ngIf="user.isLockedOut" class="btn btn-success btn-sm" [disabled]="saving" (click)="activate()">
                  <i class="fas fa-check me-1"></i>{{ 'system.users.activate' | translate }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Roles assignment -->
        <div class="col-lg-7">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent fw-semibold">{{ 'system.users.rolesAssignment' | translate }}</div>
            <div class="card-body">
              <div *ngIf="rolesError" class="alert alert-danger">{{ rolesError }}</div>
              <div class="d-flex flex-wrap gap-2 mb-3">
                <div *ngFor="let role of availableRoles" class="form-check form-check-inline">
                  <input
                    type="checkbox"
                    class="form-check-input"
                    [id]="'role-' + role"
                    [checked]="selectedRoles.includes(role)"
                    (change)="toggleRole(role, $event)">
                  <label class="form-check-label small" [for]="'role-' + role">{{ role }}</label>
                </div>
              </div>
              <button class="btn btn-primary btn-sm" [disabled]="saving" (click)="saveRoles()">
                <span *ngIf="saving" class="spinner-border spinner-border-sm me-1"></span>
                {{ 'common.save' | translate }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class UserDetailComponent implements OnInit {
  loading = false;
  saving = false;
  error = '';
  rolesError = '';
  actionSuccess = '';
  user: UserDto | null = null;
  availableRoles: string[] = [];
  selectedRoles: string[] = [];

  constructor(
    private route: ActivatedRoute,
    private systemApi: SystemApiService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loading = true;
    this.systemApi.listRoles().subscribe({
      next: res => { if (res.isSuccess && res.data) this.availableRoles = res.data; }
    });
    this.systemApi.getUser(id).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess && res.data) {
          this.user = res.data;
          this.selectedRoles = [...res.data.roles];
        } else {
          this.error = res.message;
        }
      },
      error: err => { this.loading = false; this.error = err?.message ?? 'Error'; }
    });
  }

  toggleRole(role: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      if (!this.selectedRoles.includes(role)) this.selectedRoles.push(role);
    } else {
      this.selectedRoles = this.selectedRoles.filter(r => r !== role);
    }
  }

  saveRoles(): void {
    if (!this.user) return;
    this.saving = true;
    this.rolesError = '';
    this.systemApi.setRoles(this.user.id, { roles: this.selectedRoles }).subscribe({
      next: res => {
        this.saving = false;
        if (res.isSuccess) {
          this.user!.roles = [...this.selectedRoles];
          this.actionSuccess = 'Roles updated successfully';
          setTimeout(() => this.actionSuccess = '', 3000);
        } else {
          this.rolesError = res.message;
        }
      },
      error: err => { this.saving = false; this.rolesError = err?.message ?? 'Error'; }
    });
  }

  deactivate(): void {
    if (!this.user) return;
    this.saving = true;
    this.systemApi.deactivateUser(this.user.id).subscribe({
      next: res => {
        this.saving = false;
        if (res.isSuccess) { this.user!.isLockedOut = true; }
        else this.error = res.message;
      },
      error: err => { this.saving = false; this.error = err?.message ?? 'Error'; }
    });
  }

  activate(): void {
    if (!this.user) return;
    this.saving = true;
    this.systemApi.activateUser(this.user.id).subscribe({
      next: res => {
        this.saving = false;
        if (res.isSuccess) { this.user!.isLockedOut = false; }
        else this.error = res.message;
      },
      error: err => { this.saving = false; this.error = err?.message ?? 'Error'; }
    });
  }

  initials(name: string): string {
    return (name ?? '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  }
}
