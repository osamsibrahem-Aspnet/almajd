import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { SystemApiService, NotificationTemplateDto } from '../services/system-api.service';

const SAMPLE_VALUES: Record<string, string> = {
  '{{OrderNumber}}':    'ORD-2026-000123',
  '{{CustomerName}}':  'Phone Shop Cairo',
  '{{Amount}}':        '5,250.00',
  '{{DueDate}}':       '2026-07-01',
  '{{InvoiceNumber}}': 'INV-2026-000456',
  '{{ShipmentNumber}}':'SHP-2026-000789',
  '{{TrackingUrl}}':   'https://track.example.com/SHP-2026-000789',
  '{{DriverName}}':    'Ahmed Hassan',
};

function interpolate(text: string): string {
  return Object.entries(SAMPLE_VALUES).reduce(
    (t, [k, v]) => t.split(k).join(v),
    text
  );
}

@Component({
  selector: 'app-notification-templates',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  template: `
    <div class="page-header">
      <h2>{{ 'system.templates.title' | translate }}</h2>
    </div>

    <div *ngIf="loading" class="text-center py-5">
      <div class="spinner-border" style="color:var(--primary)"></div>
    </div>
    <div *ngIf="error" class="alert alert-danger">{{ error }}</div>

    <div *ngIf="!loading" class="card border-0 shadow-sm">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th>{{ 'system.templates.code' | translate }}</th>
                <th>{{ 'system.templates.category' | translate }}</th>
                <th>{{ 'system.templates.title' | translate }}</th>
                <th class="text-center">{{ 'common.active' | translate }}</th>
                <th class="text-end">{{ 'common.actions' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="templates.length === 0">
                <td colspan="5" class="text-center text-muted py-4">{{ 'common.noData' | translate }}</td>
              </tr>
              <tr *ngFor="let t of templates">
                <td class="font-monospace small">{{ t.code }}</td>
                <td><span class="badge bg-secondary">{{ t.category }}</span></td>
                <td class="small">{{ t.title }}</td>
                <td class="text-center">
                  <i class="fas" [class.fa-check-circle]="t.isActive" [class.fa-times-circle]="!t.isActive"
                     [class.text-success]="t.isActive" [class.text-muted]="!t.isActive"></i>
                </td>
                <td class="text-end">
                  <button class="btn btn-sm btn-outline-primary" (click)="openEdit(t)">
                    <i class="fas fa-pen"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <div *ngIf="showModal" class="modal d-block" tabindex="-1" style="background:rgba(0,0,0,0.5);">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ 'system.templates.edit' | translate }}</h5>
            <button type="button" class="btn-close" (click)="closeModal()"></button>
          </div>
          <div class="modal-body">
            <div *ngIf="modalError" class="alert alert-danger">{{ modalError }}</div>
            <form [formGroup]="editForm">
              <!-- Code (readonly) -->
              <div class="mb-3">
                <label class="form-label small fw-medium">{{ 'system.templates.code' | translate }}</label>
                <input type="text" class="form-control form-control-sm" formControlName="code" readonly>
              </div>
              <!-- Category -->
              <div class="mb-3">
                <label class="form-label small fw-medium">{{ 'system.templates.category' | translate }}</label>
                <input type="text" class="form-control form-control-sm" formControlName="category">
              </div>
              <!-- Title -->
              <div class="mb-3">
                <label class="form-label small fw-medium">{{ 'system.templates.titleField' | translate }} *</label>
                <input type="text" class="form-control form-control-sm" formControlName="title">
                <small *ngIf="ef['title'].invalid && ef['title'].touched" class="text-danger">
                  {{ 'system.templates.titleRequired' | translate }}
                </small>
              </div>
              <!-- Body -->
              <div class="mb-3">
                <label class="form-label small fw-medium">{{ 'system.templates.body' | translate }} *</label>
                <textarea class="form-control form-control-sm" formControlName="body" rows="5"
                          (input)="updatePreview()"></textarea>
                <small *ngIf="ef['body'].invalid && ef['body'].touched" class="text-danger">
                  {{ 'system.templates.bodyRequired' | translate }}
                </small>
              </div>
              <!-- isActive -->
              <div class="mb-3 form-check">
                <input type="checkbox" class="form-check-input" id="tplActive" formControlName="isActive">
                <label class="form-check-label small" for="tplActive">{{ 'common.active' | translate }}</label>
              </div>

              <!-- Preview -->
              <div class="card border" style="border-color:var(--border) !important;">
                <div class="card-header bg-transparent small fw-medium">{{ 'system.templates.preview' | translate }}</div>
                <div class="card-body small">
                  <div class="fw-semibold mb-1">{{ previewTitle }}</div>
                  <div class="text-muted" style="white-space:pre-wrap;">{{ previewBody }}</div>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline-secondary" (click)="closeModal()">{{ 'common.cancel' | translate }}</button>
            <button class="btn btn-primary" [disabled]="saving" (click)="saveTemplate()">
              <span *ngIf="saving" class="spinner-border spinner-border-sm me-1"></span>
              {{ 'common.save' | translate }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class NotificationTemplatesComponent implements OnInit {
  loading = false;
  saving = false;
  error = '';
  modalError = '';
  showModal = false;
  templates: NotificationTemplateDto[] = [];
  previewTitle = '';
  previewBody = '';

  editForm = this.fb.group({
    code: [{ value: '', disabled: true }],
    category: [''],
    title: ['', Validators.required],
    body: ['', Validators.required],
    isActive: [true]
  });

  get ef() { return this.editForm.controls; }

  constructor(private fb: FormBuilder, private systemApi: SystemApiService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.systemApi.listTemplates().subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess && res.data) this.templates = res.data;
        else this.error = res.message;
      },
      error: err => { this.loading = false; this.error = err?.message ?? 'Error'; }
    });
  }

  openEdit(t: NotificationTemplateDto): void {
    this.modalError = '';
    this.editForm.patchValue({
      code: t.code,
      category: t.category,
      title: t.title,
      body: t.body,
      isActive: t.isActive
    });
    this.updatePreview();
    this.showModal = true;
  }

  closeModal(): void { this.showModal = false; }

  updatePreview(): void {
    this.previewTitle = interpolate(this.editForm.value.title ?? '');
    this.previewBody = interpolate(this.editForm.value.body ?? '');
  }

  saveTemplate(): void {
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    this.saving = true;
    this.modalError = '';
    const v = this.editForm.getRawValue();
    this.systemApi.upsertTemplate({
      code: v.code!,
      category: v.category!,
      title: v.title!,
      body: v.body!,
      isActive: v.isActive!
    }).subscribe({
      next: res => {
        this.saving = false;
        if (res.isSuccess) {
          const idx = this.templates.findIndex(t => t.code === v.code);
          if (idx >= 0) {
            this.templates[idx] = {
              ...this.templates[idx],
              code: v.code ?? this.templates[idx].code,
              category: v.category ?? this.templates[idx].category,
              title: v.title ?? this.templates[idx].title,
              body: v.body ?? this.templates[idx].body,
              isActive: v.isActive ?? this.templates[idx].isActive
            };
          }
          this.showModal = false;
          this.load();
        } else {
          this.modalError = res.message;
        }
      },
      error: err => { this.saving = false; this.modalError = err?.message ?? 'Error'; }
    });
  }
}
