import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { CatalogApiService, CategoryTreeNodeDto, CategoryDto, CategoryCreateDto, CategoryUpdateDto } from '../../services/catalog-api.service';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, TranslateModule],
  template: `
    <div class="page-header d-flex justify-content-between align-items-center">
      <h2>{{ 'catalog.categories.title' | translate }}</h2>
      <button *ngIf="canWrite" class="btn btn-primary btn-sm" (click)="openCreate()">
        <i class="fas fa-plus me-1"></i>{{ 'common.create' | translate }}
      </button>
    </div>

    <div *ngIf="successMsg" class="alert alert-success py-2 mb-3">{{ successMsg }}</div>
    <div *ngIf="errorMsg" class="alert alert-danger py-2 mb-3">{{ errorMsg }}</div>

    <div *ngIf="loading" class="text-center py-4">
      <div class="spinner-border" style="color: var(--primary);"></div>
    </div>

    <div *ngIf="!loading" class="card border-0 shadow-sm">
      <div class="card-body category-tree">
        <div *ngIf="tree.length === 0" class="text-muted text-center py-3">{{ 'common.noData' | translate }}</div>
        <ng-container *ngTemplateOutlet="treeNodes; context: { nodes: tree }"></ng-container>
      </div>
    </div>

    <ng-template #treeNodes let-nodes="nodes">
      <div *ngFor="let node of nodes">
        <div class="category-row">
          <i class="fas fa-chevron-right toggle-icon" *ngIf="node.children.length > 0"
             [style.transform]="expanded[node.id] ? 'rotate(90deg)' : ''"
             (click)="toggle(node.id)" style="transition: transform 0.2s;"></i>
          <i class="fas fa-minus toggle-icon" *ngIf="node.children.length === 0" style="opacity:0.3;"></i>
          <span class="cat-name fw-medium">{{ node.name }}</span>
          <span class="badge" [class]="node.isActive ? 'badge-active' : 'badge-draft'" style="font-size: 0.7rem;">
            {{ (node.isActive ? 'common.active' : 'common.inactive') | translate }}
          </span>
          <button *ngIf="canWrite" class="btn btn-sm btn-outline-secondary btn-sm py-0 px-1" (click)="openEdit(node)">
            <i class="fas fa-pencil fa-sm"></i>
          </button>
          <button *ngIf="canWrite" class="btn btn-sm btn-outline-danger btn-sm py-0 px-1" (click)="openCreateChild(node)">
            <i class="fas fa-plus fa-sm"></i>
          </button>
        </div>
        <div class="children" *ngIf="expanded[node.id] && node.children.length > 0">
          <ng-container *ngTemplateOutlet="treeNodes; context: { nodes: node.children }"></ng-container>
        </div>
      </div>
    </ng-template>

    <!-- Create/Edit Modal -->
    <div *ngIf="showModal" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.4);">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              {{ (editingId ? 'catalog.categories.editTitle' : 'catalog.categories.createTitle') | translate }}
            </h5>
            <button type="button" class="btn-close" (click)="closeModal()"></button>
          </div>
          <form [formGroup]="form" (ngSubmit)="onSave()">
            <div class="modal-body">
              <div *ngIf="formError" class="alert alert-danger py-2 small">{{ formError }}</div>

              <div class="mb-3">
                <label class="form-label fw-medium small">{{ 'catalog.categories.name' | translate }} *</label>
                <input type="text" class="form-control" formControlName="name"
                       [class.is-invalid]="form.controls['name'].touched && form.controls['name'].invalid">
                <small class="text-danger" *ngIf="form.controls['name'].touched && form.controls['name'].hasError('required')">
                  Name is required
                </small>
              </div>

              <div class="mb-3">
                <label class="form-label fw-medium small">{{ 'catalog.categories.parent' | translate }}</label>
                <select class="form-select" [(ngModel)]="parentId" [ngModelOptions]="{ standalone: true }">
                  <option [ngValue]="null">— None (root) —</option>
                  <option *ngFor="let opt of parentOptions" [ngValue]="opt.id">
                    {{ opt.indentedLabel }}
                  </option>
                </select>
              </div>

              <div class="mb-3">
                <label class="form-label fw-medium small">{{ 'catalog.categories.description' | translate }}</label>
                <textarea class="form-control" formControlName="description" rows="2"></textarea>
              </div>

              <div class="mb-3">
                <label class="form-label fw-medium small">{{ 'catalog.categories.sortOrder' | translate }}</label>
                <input type="number" class="form-control" formControlName="sortOrder">
              </div>

              <div class="form-check" *ngIf="editingId">
                <input type="checkbox" class="form-check-input" formControlName="isActive" id="catActive">
                <label class="form-check-label" for="catActive">{{ 'catalog.categories.isActive' | translate }}</label>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="closeModal()">{{ 'common.cancel' | translate }}</button>
              <button type="submit" class="btn btn-primary" [disabled]="saving">
                <span *ngIf="saving" class="spinner-border spinner-border-sm me-1"></span>
                {{ 'common.save' | translate }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class CategoriesComponent implements OnInit {
  tree: CategoryTreeNodeDto[] = [];
  parentOptions: { id: string; indentedLabel: string }[] = [];
  loading = true;
  saving = false;
  showModal = false;
  editingId: string | null = null;
  parentId: string | null = null;
  expanded: Record<string, boolean> = {};
  successMsg = '';
  errorMsg = '';
  formError = '';

  form = this.fb.group({
    name:        ['', Validators.required],
    description: [''],
    sortOrder:   [0],
    isActive:    [true]
  });

  constructor(
    private fb: FormBuilder,
    private catalogApi: CatalogApiService,
    private auth: AuthService
  ) {}

  get canWrite(): boolean {
    return this.auth.hasRole('Admin');
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.catalogApi.getCategoryTree(true).subscribe({
      next: res => {
        this.loading = false;
        this.tree = res.data ?? [];
        this.expanded = {};
        this.expandAll(this.tree);
      },
      error: () => { this.loading = false; }
    });
  }

  private buildParentOptions(excludeId: string | null): void {
    const out: { id: string; indentedLabel: string }[] = [];
    const walk = (nodes: CategoryTreeNodeDto[], depth: number) => {
      for (const n of nodes) {
        if (n.id === excludeId) continue; // cannot parent under self or its descendants
        const prefix = depth === 0 ? '' : '— '.repeat(depth);
        out.push({ id: n.id, indentedLabel: `${prefix}${n.name}` });
        if (n.children.length > 0) walk(n.children, depth + 1);
      }
    };
    walk(this.tree, 0);
    this.parentOptions = out;
  }

  private expandAll(nodes: CategoryTreeNodeDto[]): void {
    nodes.forEach(n => {
      if (n.children.length > 0) {
        this.expanded[n.id] = true;
        this.expandAll(n.children);
      }
    });
  }

  toggle(id: string): void { this.expanded[id] = !this.expanded[id]; }

  openCreate(): void {
    this.editingId = null;
    this.parentId = null;
    this.buildParentOptions(null);
    this.form.reset({ name: '', description: '', sortOrder: 0, isActive: true });
    this.formError = '';
    this.showModal = true;
  }

  openCreateChild(parent: CategoryTreeNodeDto): void {
    this.editingId = null;
    this.parentId = parent.id;
    this.buildParentOptions(null);
    this.form.reset({ name: '', description: '', sortOrder: 0, isActive: true });
    this.formError = '';
    this.showModal = true;
  }

  openEdit(node: CategoryTreeNodeDto): void {
    this.editingId = node.id;
    this.parentId = node.parentId ?? null;
    this.buildParentOptions(node.id);
    this.form.patchValue({ name: node.name, description: node.description ?? '', sortOrder: node.sortOrder, isActive: node.isActive });
    this.formError = '';
    this.showModal = true;
  }

  closeModal(): void { this.showModal = false; }

  onSave(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    this.formError = '';
    const v = this.form.value;

    if (this.editingId) {
      const dto: CategoryUpdateDto = {
        name: v.name!, parentId: this.parentId ?? undefined,
        description: v.description ?? undefined, sortOrder: v.sortOrder ?? 0,
        isActive: v.isActive!
      };
      this.catalogApi.updateCategory(this.editingId, dto).subscribe({
        next: res => this.handleRes(res, 'catalog.categories.updateSuccess'),
        error: (err: any) => { this.saving = false; this.formError = err?.message ?? 'Error'; }
      });
    } else {
      const dto: CategoryCreateDto = {
        name: v.name!, parentId: this.parentId ?? undefined,
        description: v.description ?? undefined, sortOrder: v.sortOrder ?? 0
      };
      this.catalogApi.createCategory(dto).subscribe({
        next: res => this.handleRes(res, 'catalog.categories.createSuccess'),
        error: (err: any) => { this.saving = false; this.formError = err?.message ?? 'Error'; }
      });
    }
  }

  private handleRes(res: any, msgKey: string): void {
    this.saving = false;
    if (res.isSuccess) {
      this.showModal = false;
      this.successMsg = msgKey;
      setTimeout(() => this.successMsg = '', 3000);
      this.load();
    } else {
      this.formError = res.message;
    }
  }
}
