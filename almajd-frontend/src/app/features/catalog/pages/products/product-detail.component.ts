import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { CatalogApiService, ProductDto, BrandDto, CategoryDto, SkuCreateDto, SkuUpdateDto, SkuDto } from '../../services/catalog-api.service';

type ActiveTab = 'details' | 'skus' | 'media';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, TranslateModule, RouterLink],
  template: `
    <div class="page-header d-flex justify-content-between align-items-center">
      <div>
        <a routerLink="/admin/catalog/products" class="text-muted text-decoration-none small">
          <i class="fas fa-arrow-left me-1"></i>{{ 'catalog.products.title' | translate }}
        </a>
        <h2 class="mt-1">{{ creating ? ('catalog.products.createTitle' | translate) : (product?.name ?? '') }}</h2>
      </div>
      <div class="d-flex gap-2">
        <button *ngIf="product" class="btn btn-sm btn-outline-secondary" (click)="openEdit()">
          <i class="fas fa-pencil me-1"></i>{{ 'common.edit' | translate }}
        </button>
      </div>
    </div>

    <div *ngIf="loading" class="text-center py-5">
      <div class="spinner-border" style="color: var(--primary);"></div>
    </div>

    <div *ngIf="error" class="alert alert-danger">{{ error }}</div>

    <!-- CREATE mode (route /products/new) -->
    <div *ngIf="creating && !loading" class="card border-0 shadow-sm">
      <div class="card-body">
        <h5 class="mb-3">{{ 'catalog.products.createTitle' | translate }}</h5>
        <form [formGroup]="editForm" (ngSubmit)="saveCreate()">
          <div class="row g-3">
            <div *ngIf="formError" class="col-12">
              <div class="alert alert-danger py-2 small">{{ formError }}</div>
            </div>

            <div class="col-md-6">
              <label class="form-label small fw-medium">Brand *</label>
              <select class="form-select" formControlName="brandId">
                <option value="">— Select —</option>
                <option *ngFor="let b of brands" [value]="b.id">{{ b.name }}</option>
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label small fw-medium">Category</label>
              <select class="form-select" formControlName="categoryId">
                <option value="">None</option>
                <option *ngFor="let c of categories" [value]="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div class="col-12">
              <label class="form-label small fw-medium">Name *</label>
              <input type="text" class="form-control" formControlName="name">
            </div>
            <div class="col-12">
              <label class="form-label small fw-medium">Description</label>
              <textarea class="form-control" formControlName="description" rows="3"></textarea>
            </div>
            <div class="col-md-6">
              <label class="form-label small fw-medium">Status</label>
              <select class="form-select" formControlName="status">
                <option value="Draft">Draft</option>
                <option value="Published">Published</option>
                <option value="Discontinued">Discontinued</option>
              </select>
            </div>
            <div class="col-md-6 d-flex align-items-end">
              <div class="form-check">
                <input type="checkbox" class="form-check-input" formControlName="isFeatured" id="featureProdNew">
                <label class="form-check-label" for="featureProdNew">Featured</label>
              </div>
            </div>
          </div>
          <div class="d-flex justify-content-end gap-2 mt-4">
            <a routerLink="/admin/catalog/products" class="btn btn-secondary">Cancel</a>
            <button type="submit" class="btn btn-primary" [disabled]="saving">
              <span *ngIf="saving" class="spinner-border spinner-border-sm me-1"></span>
              Create
            </button>
          </div>
        </form>
      </div>
    </div>

    <div *ngIf="product && !loading">
      <!-- Product summary card -->
      <div class="card border-0 shadow-sm mb-3">
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-6">
              <table class="table table-sm table-borderless mb-0">
                <tr>
                  <td class="text-muted small fw-medium" style="width: 130px;">Brand</td>
                  <td>{{ product.brandName }}</td>
                </tr>
                <tr>
                  <td class="text-muted small fw-medium">Category</td>
                  <td>{{ product.categoryName ?? '—' }}</td>
                </tr>
                <tr>
                  <td class="text-muted small fw-medium">Status</td>
                  <td>
                    <span class="badge"
                      [class.badge-approved]="product.status === 'Published'"
                      [class.badge-draft]="product.status === 'Draft'"
                      [class.badge-cancelled]="product.status === 'Discontinued'">
                      {{ product.status }}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td class="text-muted small fw-medium">Featured</td>
                  <td>
                    <i class="fas" [class.fa-star]="product.isFeatured" [class.fa-star-half]="!product.isFeatured"
                       [style.color]="product.isFeatured ? '#B45309' : '#ccc'"></i>
                    {{ product.isFeatured ? 'Yes' : 'No' }}
                  </td>
                </tr>
              </table>
            </div>
            <div class="col-md-6">
              <p class="text-muted small mb-1 fw-medium">Description</p>
              <p class="small">{{ product.description || 'No description.' }}</p>
            </div>
          </div>

          <!-- Quick actions -->
          <div class="d-flex gap-2 mt-3 pt-3 border-top">
            <select class="form-select form-select-sm" style="max-width: 160px;" [(ngModel)]="newStatus">
              <option value="Draft">Draft</option>
              <option value="Published">Published</option>
              <option value="Discontinued">Discontinued</option>
            </select>
            <button class="btn btn-sm btn-outline-primary" (click)="changeStatus()">
              Set Status
            </button>
            <button class="btn btn-sm" [class.btn-warning]="!product.isFeatured" [class.btn-outline-secondary]="product.isFeatured"
                    (click)="toggleFeatured()">
              <i class="fas fa-star me-1"></i>{{ product.isFeatured ? 'Unfeature' : 'Feature' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <ul class="nav nav-tabs mb-3">
        <li class="nav-item">
          <button class="nav-link" [class.active]="activeTab === 'skus'" (click)="activeTab = 'skus'">
            {{ 'catalog.products.skus' | translate }} ({{ product.skus.length }})
          </button>
        </li>
        <li class="nav-item">
          <button class="nav-link" [class.active]="activeTab === 'media'" (click)="activeTab = 'media'">
            {{ 'catalog.products.media' | translate }} ({{ product.media.length }})
          </button>
        </li>
      </ul>

      <!-- SKUs Tab -->
      <div *ngIf="activeTab === 'skus'" class="card border-0 shadow-sm">
        <div class="card-header d-flex justify-content-between align-items-center bg-transparent">
          <span class="fw-medium">{{ 'catalog.products.skus' | translate }}</span>
          <button class="btn btn-sm btn-primary" (click)="openAddSku()">
            <i class="fas fa-plus me-1"></i>{{ 'catalog.products.addSku' | translate }}
          </button>
        </div>
        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th>Code</th>
                <th>Barcode</th>
                <th>Weight (g)</th>
                <th>Active</th>
                <th class="text-end">{{ 'common.actions' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="product.skus.length === 0">
                <td colspan="5" class="text-center text-muted py-3">No SKUs</td>
              </tr>
              <tr *ngFor="let sku of product.skus">
                <td class="fw-medium font-monospace">{{ sku.code }}</td>
                <td class="font-monospace small">{{ sku.barcode }}</td>
                <td>{{ sku.weightG ?? '—' }}</td>
                <td>
                  <span class="badge" [class]="sku.isActive ? 'badge-active' : 'badge-draft'">
                    {{ sku.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td class="text-end">
                  <button class="btn btn-sm btn-outline-secondary me-1" (click)="openEditSku(sku)">
                    <i class="fas fa-pencil"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-danger" (click)="removeSku(sku.id)">
                    <i class="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Media Tab -->
      <div *ngIf="activeTab === 'media'" class="card border-0 shadow-sm">
        <div class="card-header d-flex justify-content-between align-items-center bg-transparent">
          <span class="fw-medium">{{ 'catalog.products.media' | translate }}</span>
          <label class="btn btn-sm btn-primary mb-0">
            <i class="fas fa-upload me-1"></i>{{ 'catalog.products.uploadMedia' | translate }}
            <input type="file" accept="image/*" (change)="onFileSelected($event)" style="display:none">
          </label>
        </div>
        <div class="card-body">
          <div *ngIf="product.media.length === 0" class="text-muted text-center py-3">No media uploaded.</div>
          <div class="row g-3">
            <div class="col-6 col-md-3" *ngFor="let m of product.media">
              <div class="card border">
                <img [src]="m.url" class="card-img-top" style="height: 120px; object-fit: cover;"
                     onerror="this.src='https://via.placeholder.com/200x120?text=Image'">
                <div class="card-body p-2 text-center">
                  <button class="btn btn-sm btn-outline-danger" (click)="removeMedia(m.id)">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Product Modal -->
    <div *ngIf="showEditModal" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.4);">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ 'catalog.products.editTitle' | translate }}</h5>
            <button type="button" class="btn-close" (click)="showEditModal = false"></button>
          </div>
          <form [formGroup]="editForm" (ngSubmit)="saveEdit()">
            <div class="modal-body row g-3">
              <div *ngIf="formError" class="col-12"><div class="alert alert-danger py-2 small">{{ formError }}</div></div>

              <div class="col-md-6">
                <label class="form-label small fw-medium">Brand *</label>
                <select class="form-select" formControlName="brandId">
                  <option *ngFor="let b of brands" [value]="b.id">{{ b.name }}</option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-medium">Category</label>
                <select class="form-select" formControlName="categoryId">
                  <option value="">None</option>
                  <option *ngFor="let c of categories" [value]="c.id">{{ c.name }}</option>
                </select>
              </div>
              <div class="col-12">
                <label class="form-label small fw-medium">Name *</label>
                <input type="text" class="form-control" formControlName="name">
              </div>
              <div class="col-12">
                <label class="form-label small fw-medium">Description</label>
                <textarea class="form-control" formControlName="description" rows="3"></textarea>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-medium">Status</label>
                <select class="form-select" formControlName="status">
                  <option value="Draft">Draft</option>
                  <option value="Published">Published</option>
                  <option value="Discontinued">Discontinued</option>
                </select>
              </div>
              <div class="col-md-6 d-flex align-items-end">
                <div class="form-check">
                  <input type="checkbox" class="form-check-input" formControlName="isFeatured" id="featureProd">
                  <label class="form-check-label" for="featureProd">Featured</label>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="showEditModal = false">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="saving">
                <span *ngIf="saving" class="spinner-border spinner-border-sm me-1"></span>
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- SKU Modal -->
    <div *ngIf="showSkuModal" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.4);">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ editingSkuId ? 'Edit SKU' : 'Add SKU' }}</h5>
            <button type="button" class="btn-close" (click)="showSkuModal = false"></button>
          </div>
          <form [formGroup]="skuForm" (ngSubmit)="saveSku()">
            <div class="modal-body">
              <div *ngIf="formError" class="alert alert-danger py-2 small">{{ formError }}</div>
              <div class="mb-3">
                <label class="form-label small fw-medium">Code *</label>
                <input type="text" class="form-control font-monospace" formControlName="code">
              </div>
              <div class="mb-3">
                <label class="form-label small fw-medium">Barcode *</label>
                <input type="text" class="form-control font-monospace" formControlName="barcode">
              </div>
              <div class="mb-3">
                <label class="form-label small fw-medium">Weight (g)</label>
                <input type="number" class="form-control" formControlName="weightG">
              </div>
              <div class="form-check" *ngIf="editingSkuId">
                <input type="checkbox" class="form-check-input" formControlName="isActive" id="skuActive">
                <label class="form-check-label" for="skuActive">Active</label>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="showSkuModal = false">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="saving">
                <span *ngIf="saving" class="spinner-border spinner-border-sm me-1"></span>
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class ProductDetailComponent implements OnInit {
  product: ProductDto | null = null;
  brands: BrandDto[] = [];
  categories: CategoryDto[] = [];
  loading = true;
  creating = false;
  saving = false;
  error = '';
  formError = '';
  activeTab: ActiveTab = 'skus';
  showEditModal = false;
  showSkuModal = false;
  editingSkuId: string | null = null;
  newStatus = 'Draft';

  editForm = this.fb.group({
    brandId:     ['', Validators.required],
    categoryId:  [''],
    name:        ['', Validators.required],
    description: [''],
    status:      ['Draft'],
    isFeatured:  [false]
  });

  skuForm = this.fb.group({
    code:     ['', Validators.required],
    barcode:  ['', Validators.required],
    weightG:  [null as number | null],
    isActive: [true]
  });

  // for [(ngModel)] on status dropdown
  get ngModelProxy() { return this; }

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private catalogApi: CatalogApiService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id === 'new') {
      this.creating = true;
      this.loading = false;
      this.editForm.reset({ brandId: '', categoryId: '', name: '', description: '', status: 'Draft', isFeatured: false });
      this.loadBrands();
      this.loadCategories();
      return;
    }
    if (id) {
      this.loadProduct(id);
    }
    this.loadBrands();
    this.loadCategories();
  }

  saveCreate(): void {
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    const v = this.editForm.value;
    this.saving = true;
    this.formError = '';
    this.catalogApi.createProduct({
      brandId: v.brandId!,
      categoryId: v.categoryId || undefined,
      name: v.name!,
      description: v.description ?? undefined,
      status: v.status ?? 'Draft',
      isFeatured: !!v.isFeatured
    }).subscribe({
      next: res => {
        this.saving = false;
        if (res.isSuccess && res.data) {
          this.router.navigate(['/admin/catalog/products', res.data.id]);
        } else {
          this.formError = res.message ?? 'Failed to create product.';
        }
      },
      error: (err: any) => {
        this.saving = false;
        this.formError = err?.message ?? 'Failed to create product.';
      }
    });
  }

  loadProduct(id: string): void {
    this.loading = true;
    this.catalogApi.getProduct(id).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess) {
          this.product = res.data;
          this.newStatus = res.data.status;
        } else {
          this.error = res.message;
        }
      },
      error: (err: any) => {
        this.loading = false;
        this.error = err?.message ?? 'Failed to load product.';
      }
    });
  }

  loadBrands(): void {
    this.catalogApi.listBrands(false).subscribe({ next: r => this.brands = r.data ?? [] });
  }

  loadCategories(): void {
    this.catalogApi.listCategories(false).subscribe({ next: r => this.categories = r.data ?? [] });
  }

  openEdit(): void {
    if (!this.product) return;
    this.editForm.patchValue({
      brandId: this.product.brandId, categoryId: this.product.categoryId ?? '',
      name: this.product.name, description: this.product.description ?? '',
      status: this.product.status, isFeatured: this.product.isFeatured
    });
    this.formError = '';
    this.showEditModal = true;
  }

  saveEdit(): void {
    if (!this.product || this.editForm.invalid) return;
    this.saving = true;
    this.formError = '';
    const v = this.editForm.value;
    const dto = { brandId: v.brandId!, categoryId: v.categoryId || undefined, name: v.name!, description: v.description ?? undefined, status: v.status!, isFeatured: v.isFeatured! };
    this.catalogApi.updateProduct(this.product.id, dto).subscribe({
      next: res => {
        this.saving = false;
        if (res.isSuccess) { this.showEditModal = false; this.loadProduct(this.product!.id); }
        else { this.formError = res.message; }
      },
      error: (err: any) => { this.saving = false; this.formError = err?.message ?? 'Error'; }
    });
  }

  changeStatus(): void {
    if (!this.product) return;
    this.catalogApi.changeProductStatus(this.product.id, this.newStatus).subscribe({
      next: () => this.loadProduct(this.product!.id)
    });
  }

  toggleFeatured(): void {
    if (!this.product) return;
    this.catalogApi.setProductFeatured(this.product.id, !this.product.isFeatured).subscribe({
      next: () => this.loadProduct(this.product!.id)
    });
  }

  openAddSku(): void {
    this.editingSkuId = null;
    this.skuForm.reset({ code: '', barcode: '', weightG: null, isActive: true });
    this.formError = '';
    this.showSkuModal = true;
  }

  openEditSku(sku: SkuDto): void {
    this.editingSkuId = sku.id;
    this.skuForm.patchValue({ code: sku.code, barcode: sku.barcode, weightG: sku.weightG ?? null, isActive: sku.isActive });
    this.formError = '';
    this.showSkuModal = true;
  }

  saveSku(): void {
    if (!this.product || this.skuForm.invalid) return;
    this.saving = true;
    this.formError = '';
    const v = this.skuForm.value;

    if (this.editingSkuId) {
      const dto: SkuUpdateDto = { code: v.code!, barcode: v.barcode!, weightG: v.weightG ?? undefined, isActive: v.isActive! };
      this.catalogApi.updateSku(this.editingSkuId, dto).subscribe({
        next: res => { this.saving = false; if (res.isSuccess) { this.showSkuModal = false; this.loadProduct(this.product!.id); } else { this.formError = res.message; } },
        error: (err: any) => { this.saving = false; this.formError = err?.message ?? 'Error'; }
      });
    } else {
      const dto: SkuCreateDto = { productId: this.product.id, code: v.code!, barcode: v.barcode!, weightG: v.weightG ?? undefined };
      this.catalogApi.addSku(dto).subscribe({
        next: res => { this.saving = false; if (res.isSuccess) { this.showSkuModal = false; this.loadProduct(this.product!.id); } else { this.formError = res.message; } },
        error: (err: any) => { this.saving = false; this.formError = err?.message ?? 'Error'; }
      });
    }
  }

  removeSku(skuId: string): void {
    this.catalogApi.removeSku(skuId).subscribe({
      next: () => this.loadProduct(this.product!.id)
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.product) return;
    this.catalogApi.addMedia(this.product.id, file).subscribe({
      next: () => this.loadProduct(this.product!.id)
    });
  }

  removeMedia(mediaId: string): void {
    this.catalogApi.removeMedia(mediaId).subscribe({
      next: () => this.loadProduct(this.product!.id)
    });
  }
}
