import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { CatalogApiService, BrandDto, BrandCreateDto, BrandUpdateDto } from '../../services/catalog-api.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { FilesApiService } from '../../../../core/api/files-api.service';

@Component({
  selector: 'app-brands',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  template: `
    <div class="page-header d-flex justify-content-between align-items-center">
      <h2>{{ 'catalog.brands.title' | translate }}</h2>
      <button *ngIf="canWrite" class="btn btn-primary btn-sm" (click)="openCreate()">
        <i class="fas fa-plus me-1"></i>{{ 'common.create' | translate }}
      </button>
    </div>

    <!-- Alert -->
    <div *ngIf="successMsg" class="alert alert-success py-2 mb-3">{{ successMsg }}</div>
    <div *ngIf="errorMsg" class="alert alert-danger py-2 mb-3">{{ errorMsg }}</div>

    <!-- Loading -->
    <div *ngIf="loading" class="text-center py-4">
      <div class="spinner-border" style="color: var(--primary);"></div>
    </div>

    <!-- Table -->
    <div *ngIf="!loading" class="card border-0 shadow-sm">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th style="width: 64px;"></th>
                <th>{{ 'catalog.brands.name' | translate }}</th>
                <th>{{ 'catalog.brands.slug' | translate }}</th>
                <th>{{ 'common.status' | translate }}</th>
                <th class="text-end">{{ 'common.actions' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="brands.length === 0">
                <td colspan="5" class="text-center text-muted py-4">{{ 'common.noData' | translate }}</td>
              </tr>
              <tr *ngFor="let brand of brands">
                <td>
                  <img *ngIf="brand.logoPath" [src]="files.toAbsolute(brand.logoPath)"
                       alt="" style="width: 40px; height: 40px; object-fit: contain; border-radius: 6px; background: #f4f4f5;">
                  <div *ngIf="!brand.logoPath" class="text-muted small text-center"
                       style="width: 40px; height: 40px; line-height: 40px; background: #f4f4f5; border-radius: 6px;">
                    <i class="fas fa-image"></i>
                  </div>
                </td>
                <td class="fw-medium">{{ brand.name }}</td>
                <td class="text-muted small">{{ brand.slug }}</td>
                <td>
                  <span class="badge" [class]="brand.isActive ? 'badge-active' : 'badge-draft'">
                    {{ (brand.isActive ? 'common.active' : 'common.inactive') | translate }}
                  </span>
                </td>
                <td class="text-end" *ngIf="canWrite">
                  <button class="btn btn-sm btn-outline-secondary me-1" (click)="openEdit(brand)">
                    <i class="fas fa-pencil"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-danger" (click)="confirmDelete(brand)">
                    <i class="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div *ngIf="showModal" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.4);">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              {{ (editingId ? 'catalog.brands.editTitle' : 'catalog.brands.createTitle') | translate }}
            </h5>
            <button type="button" class="btn-close" (click)="closeModal()"></button>
          </div>
          <form [formGroup]="form" (ngSubmit)="onSave()">
            <div class="modal-body">
              <div *ngIf="formError" class="alert alert-danger py-2 small">{{ formError }}</div>
              <div *ngIf="formErrors.length" class="alert alert-danger py-2">
                <ul class="mb-0 ps-3"><li *ngFor="let e of formErrors" class="small">{{ e }}</li></ul>
              </div>

              <div class="mb-3">
                <label class="form-label fw-medium small">{{ 'catalog.brands.name' | translate }} *</label>
                <input type="text" class="form-control" formControlName="name"
                       [class.is-invalid]="form.controls['name'].touched && form.controls['name'].invalid">
                <small class="text-danger" *ngIf="form.controls['name'].touched && form.controls['name'].hasError('required')">
                  Name is required
                </small>
              </div>

              <div class="mb-3">
                <label class="form-label fw-medium small d-block">{{ 'catalog.brands.logo' | translate }}</label>

                <div class="d-flex align-items-center gap-3">
                  <div class="logo-thumb d-flex align-items-center justify-content-center"
                       style="width: 72px; height: 72px; border-radius: 8px; background: #f4f4f5; border: 1px dashed #d4d4d8; overflow: hidden;">
                    <img *ngIf="form.controls['logoPath'].value as logo"
                         [src]="files.toAbsolute(logo)" alt=""
                         style="max-width: 100%; max-height: 100%; object-fit: contain;">
                    <i *ngIf="!form.controls['logoPath'].value" class="fas fa-image text-muted"></i>
                  </div>

                  <div class="flex-grow-1">
                    <input #logoFile type="file" class="d-none"
                           accept="image/png,image/jpeg,image/webp,image/svg+xml"
                           (change)="onLogoSelected($event)">
                    <button type="button" class="btn btn-outline-primary btn-sm me-2"
                            (click)="logoFile.click()" [disabled]="uploading">
                      <span *ngIf="uploading" class="spinner-border spinner-border-sm me-1"></span>
                      <i *ngIf="!uploading" class="fas fa-upload me-1"></i>
                      {{ (form.controls['logoPath'].value ? 'common.replace' : 'common.upload') | translate }}
                    </button>
                    <button *ngIf="form.controls['logoPath'].value"
                            type="button" class="btn btn-outline-danger btn-sm"
                            (click)="clearLogo()" [disabled]="uploading">
                      <i class="fas fa-times"></i>
                    </button>
                    <div class="form-text small">PNG, JPG, WebP, or SVG. Max 2 MB.</div>
                    <div *ngIf="uploadError" class="text-danger small mt-1">{{ uploadError }}</div>
                  </div>
                </div>
              </div>

              <div class="form-check" *ngIf="editingId">
                <input type="checkbox" class="form-check-input" formControlName="isActive" id="brandActive">
                <label class="form-check-label" for="brandActive">{{ 'catalog.brands.isActive' | translate }}</label>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="closeModal()">
                {{ 'common.cancel' | translate }}
              </button>
              <button type="submit" class="btn btn-primary" [disabled]="saving">
                <span *ngIf="saving" class="spinner-border spinner-border-sm me-1"></span>
                {{ 'common.save' | translate }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Delete confirm modal -->
    <div *ngIf="deletingBrand" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.4);">
      <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ 'common.confirm' | translate }}</h5>
          </div>
          <div class="modal-body">
            <p>{{ 'catalog.brands.deleteConfirm' | translate }}</p>
            <strong>{{ deletingBrand.name }}</strong>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary btn-sm" (click)="deletingBrand = null">
              {{ 'common.cancel' | translate }}
            </button>
            <button class="btn btn-danger btn-sm" (click)="doDelete()" [disabled]="saving">
              <span *ngIf="saving" class="spinner-border spinner-border-sm me-1"></span>
              {{ 'common.delete' | translate }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class BrandsComponent implements OnInit {
  brands: BrandDto[] = [];
  loading = true;
  saving = false;
  showModal = false;
  editingId: string | null = null;
  deletingBrand: BrandDto | null = null;
  successMsg = '';
  errorMsg = '';
  formError = '';
  formErrors: string[] = [];
  uploading = false;
  uploadError = '';
  private static readonly MaxLogoBytes = 2 * 1024 * 1024;

  form = this.fb.group({
    name:     ['', Validators.required],
    logoPath: [''],
    isActive: [true]
  });

  constructor(
    private fb: FormBuilder,
    private catalogApi: CatalogApiService,
    private auth: AuthService,
    public files: FilesApiService
  ) {}

  get canWrite(): boolean {
    return this.auth.hasRole('Admin');
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.catalogApi.listBrands(true).subscribe({
      next: res => {
        this.loading = false;
        this.brands = res.data ?? [];
      },
      error: () => { this.loading = false; }
    });
  }

  openCreate(): void {
    this.editingId = null;
    this.form.reset({ name: '', logoPath: '', isActive: true });
    this.formError = '';
    this.formErrors = [];
    this.uploadError = '';
    this.showModal = true;
  }

  openEdit(brand: BrandDto): void {
    this.editingId = brand.id;
    this.form.patchValue({ name: brand.name, logoPath: brand.logoPath ?? '', isActive: brand.isActive });
    this.formError = '';
    this.formErrors = [];
    this.uploadError = '';
    this.showModal = true;
  }

  closeModal(): void { this.showModal = false; }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.uploadError = '';
    if (file.size > BrandsComponent.MaxLogoBytes) {
      this.uploadError = 'File exceeds 2 MB limit.';
      return;
    }

    this.uploading = true;
    this.files.upload(file, 'BrandLogos').subscribe({
      next: res => {
        this.uploading = false;
        if (res.isSuccess && res.data) {
          this.form.patchValue({ logoPath: res.data.url });
        } else {
          this.uploadError = res.message ?? 'Upload failed.';
        }
      },
      error: (err: any) => {
        this.uploading = false;
        this.uploadError = err?.message ?? 'Upload failed.';
      }
    });
  }

  clearLogo(): void {
    this.form.patchValue({ logoPath: '' });
    this.uploadError = '';
  }

  onSave(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    this.formError = '';
    this.formErrors = [];

    const v = this.form.value;

    if (this.editingId) {
      const dto: BrandUpdateDto = { name: v.name!, logoPath: v.logoPath ?? undefined, isActive: v.isActive! };
      this.catalogApi.updateBrand(this.editingId, dto).subscribe({
        next: res => this.handleSaveRes(res, 'catalog.brands.updateSuccess'),
        error: (err: any) => this.handleSaveErr(err)
      });
    } else {
      const dto: BrandCreateDto = { name: v.name!, logoPath: v.logoPath ?? undefined };
      this.catalogApi.createBrand(dto).subscribe({
        next: res => this.handleSaveRes(res, 'catalog.brands.createSuccess'),
        error: (err: any) => this.handleSaveErr(err)
      });
    }
  }

  private handleSaveRes(res: any, msgKey: string): void {
    this.saving = false;
    if (res.isSuccess) {
      this.showModal = false;
      this.successMsg = msgKey;
      setTimeout(() => this.successMsg = '', 3000);
      this.load();
    } else {
      this.formError = res.message;
      this.formErrors = res.errors ?? [];
    }
  }

  private handleSaveErr(err: any): void {
    this.saving = false;
    this.formError = err?.message ?? 'Error saving brand.';
    this.formErrors = err?.errors ?? [];
  }

  confirmDelete(brand: BrandDto): void { this.deletingBrand = brand; }

  doDelete(): void {
    if (!this.deletingBrand) return;
    this.saving = true;
    this.catalogApi.deleteBrand(this.deletingBrand.id).subscribe({
      next: res => {
        this.saving = false;
        this.deletingBrand = null;
        if (res.isSuccess) {
          this.successMsg = 'catalog.brands.deleteSuccess';
          setTimeout(() => this.successMsg = '', 3000);
          this.load();
        } else {
          this.errorMsg = res.message;
          setTimeout(() => this.errorMsg = '', 4000);
        }
      },
      error: (err: any) => {
        this.saving = false;
        this.deletingBrand = null;
        this.errorMsg = err?.message ?? 'Delete failed.';
        setTimeout(() => this.errorMsg = '', 4000);
      }
    });
  }
}
