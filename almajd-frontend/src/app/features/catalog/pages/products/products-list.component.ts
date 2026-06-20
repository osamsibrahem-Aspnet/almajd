import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { RouterLink } from '@angular/router';
import { CatalogApiService, ProductListItemDto, BrandDto, CategoryDto } from '../../services/catalog-api.service';
import { PagedResult } from '../../../../core/api/paged-result';

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, RouterLink],
  template: `
    <div class="page-header d-flex justify-content-between align-items-center">
      <h2>{{ 'catalog.products.title' | translate }}</h2>
      <a routerLink="/admin/catalog/products/new" class="btn btn-primary btn-sm">
        <i class="fas fa-plus me-1"></i>{{ 'common.create' | translate }}
      </a>
    </div>

    <!-- Filters -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-body py-2">
        <form [formGroup]="filterForm" (ngSubmit)="applyFilters()" class="row g-2 align-items-end">
          <div class="col-sm-4 col-md-3">
            <input type="text" class="form-control form-control-sm" formControlName="search"
                   [placeholder]="'common.search' | translate">
          </div>
          <div class="col-sm-3 col-md-2">
            <select class="form-select form-select-sm" formControlName="brandId">
              <option value="">{{ 'catalog.products.brand' | translate }}</option>
              <option *ngFor="let b of brands" [value]="b.id">{{ b.name }}</option>
            </select>
          </div>
          <div class="col-sm-3 col-md-2">
            <select class="form-select form-select-sm" formControlName="categoryId">
              <option value="">{{ 'catalog.products.category' | translate }}</option>
              <option *ngFor="let c of categories" [value]="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div class="col-sm-3 col-md-2">
            <select class="form-select form-select-sm" formControlName="status">
              <option value="">{{ 'catalog.products.status' | translate }}</option>
              <option value="Draft">{{ 'catalog.products.draft' | translate }}</option>
              <option value="Published">{{ 'catalog.products.published' | translate }}</option>
              <option value="Discontinued">{{ 'catalog.products.discontinued' | translate }}</option>
            </select>
          </div>
          <div class="col-sm-2 col-md-1">
            <div class="form-check">
              <input type="checkbox" class="form-check-input" formControlName="isFeatured" id="featured">
              <label class="form-check-label small" for="featured">{{ 'catalog.products.featured' | translate }}</label>
            </div>
          </div>
          <div class="col-auto">
            <button type="submit" class="btn btn-primary btn-sm">
              <i class="fas fa-search me-1"></i>{{ 'common.filter' | translate }}
            </button>
            <button type="button" class="btn btn-outline-secondary btn-sm ms-1" (click)="resetFilters()">
              {{ 'common.cancel' | translate }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div *ngIf="loading" class="text-center py-4">
      <div class="spinner-border" style="color: var(--primary);"></div>
    </div>

    <div *ngIf="!loading" class="card border-0 shadow-sm">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th>{{ 'catalog.products.name' | translate }}</th>
                <th>{{ 'catalog.products.brand' | translate }}</th>
                <th>{{ 'catalog.products.category' | translate }}</th>
                <th>{{ 'catalog.products.status' | translate }}</th>
                <th>SKUs</th>
                <th class="text-end">{{ 'common.actions' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="products.length === 0">
                <td colspan="6" class="text-center text-muted py-4">{{ 'common.noData' | translate }}</td>
              </tr>
              <tr *ngFor="let p of products">
                <td>
                  <div class="fw-medium">{{ p.name }}</div>
                  <small class="text-muted">{{ p.slug }}</small>
                </td>
                <td class="small">{{ p.brandName }}</td>
                <td class="small text-muted">{{ p.categoryName ?? '—' }}</td>
                <td>
                  <span class="badge"
                    [class.badge-approved]="p.status === 'Published'"
                    [class.badge-draft]="p.status === 'Draft'"
                    [class.badge-cancelled]="p.status === 'Discontinued'">
                    {{ p.status }}
                  </span>
                  <span *ngIf="p.isFeatured" class="badge bg-warning text-dark ms-1">
                    <i class="fas fa-star fa-xs"></i>
                  </span>
                </td>
                <td class="small">{{ p.skuCount }}</td>
                <td class="text-end">
                  <a [routerLink]="['/admin/catalog/products', p.id]" class="btn btn-sm btn-outline-primary">
                    <i class="fas fa-eye"></i>
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Pagination -->
      <div *ngIf="pagedResult" class="card-footer d-flex align-items-center justify-content-between bg-transparent">
        <small class="text-muted">
          {{ 'common.total' | translate }}: {{ pagedResult.total }}
        </small>
        <div class="d-flex gap-2 align-items-center">
          <button class="btn btn-sm btn-outline-secondary"
                  [disabled]="currentPage <= 1"
                  (click)="changePage(currentPage - 1)">
            <i class="fas fa-chevron-left"></i>
          </button>
          <small>{{ 'common.page' | translate }} {{ currentPage }} {{ 'common.of' | translate }} {{ totalPages }}</small>
          <button class="btn btn-sm btn-outline-secondary"
                  [disabled]="currentPage >= totalPages"
                  (click)="changePage(currentPage + 1)">
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>
  `
})
export class ProductsListComponent implements OnInit {
  products: ProductListItemDto[] = [];
  brands: BrandDto[] = [];
  categories: CategoryDto[] = [];
  pagedResult: PagedResult<ProductListItemDto> | null = null;
  loading = true;
  currentPage = 1;
  pageSize = 20;

  filterForm = this.fb.group({
    search:     [''],
    brandId:    [''],
    categoryId: [''],
    status:     [''],
    isFeatured: [false]
  });

  get totalPages(): number {
    return this.pagedResult ? Math.ceil(this.pagedResult.total / this.pageSize) : 1;
  }

  constructor(private fb: FormBuilder, private catalogApi: CatalogApiService) {}

  ngOnInit(): void {
    this.loadBrands();
    this.loadCategories();
    this.loadProducts();
  }

  loadBrands(): void {
    this.catalogApi.listBrands(false).subscribe({
      next: res => this.brands = res.data ?? []
    });
  }

  loadCategories(): void {
    this.catalogApi.listCategories(false).subscribe({
      next: res => this.categories = res.data ?? []
    });
  }

  loadProducts(): void {
    this.loading = true;
    const v = this.filterForm.value;
    const params: any = { page: this.currentPage, pageSize: this.pageSize };
    if (v.search)     params.search     = v.search;
    if (v.brandId)    params.brandId    = v.brandId;
    if (v.categoryId) params.categoryId = v.categoryId;
    if (v.status)     params.status     = v.status;
    if (v.isFeatured) params.isFeatured = true;

    this.catalogApi.searchProducts(params).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess && res.data) {
          this.pagedResult = res.data;
          this.products = res.data.items ?? [];
        }
      },
      error: () => { this.loading = false; }
    });
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadProducts();
  }

  resetFilters(): void {
    this.filterForm.reset({ search: '', brandId: '', categoryId: '', status: '', isFeatured: false });
    this.currentPage = 1;
    this.loadProducts();
  }

  changePage(page: number): void {
    this.currentPage = page;
    this.loadProducts();
  }
}
