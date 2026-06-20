import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ShopApiService, Product, Brand } from '../services/shop-api.service';
import { CartService, CartItem } from '../services/cart.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-shop-browse',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, TranslateModule],
  styles: [`
    .product-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 1rem;
    }
    .product-card {
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      overflow: hidden;
      background: var(--bg-elev);
      transition: box-shadow 0.2s;
    }
    .product-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
    .product-img {
      width: 100%;
      height: 180px;
      object-fit: cover;
      background: var(--primary-soft);
    }
    .product-img-placeholder {
      width: 100%;
      height: 180px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--primary-soft);
      color: var(--primary);
      font-size: 2.5rem;
    }
    .add-btn { min-height: 44px; }
    .filter-panel {
      background: var(--bg-elev);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      padding: 1rem;
    }
    .toast-container-custom {
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      z-index: 9999;
    }
  `],
  template: `
    <!-- Toast -->
    <div class="toast-container-custom">
      <div *ngIf="toast" class="toast show align-items-center border-0"
           [class.text-bg-success]="toast.type === 'success'"
           [class.text-bg-warning]="toast.type === 'warning'"
           role="alert">
        <div class="d-flex">
          <div class="toast-body">{{ toast.message }}</div>
          <button type="button" class="btn-close me-2 m-auto" (click)="toast = null"></button>
        </div>
      </div>
    </div>

    <div class="row g-3">
      <!-- Filters sidebar -->
      <div class="col-12 col-md-3">
        <div class="filter-panel">
          <h6 class="fw-semibold mb-3">{{ 'shop.filters' | translate }}</h6>

          <!-- Sort -->
          <div class="mb-3">
            <label class="form-label small fw-medium">{{ 'shop.sortBy' | translate }}</label>
            <select class="form-select form-select-sm" [formControl]="sortCtrl">
              <option value="">{{ 'shop.sortDefault' | translate }}</option>
              <option value="name">{{ 'shop.sortName' | translate }}</option>
              <option value="recent">{{ 'shop.sortRecent' | translate }}</option>
              <option value="featured">{{ 'shop.sortFeatured' | translate }}</option>
            </select>
          </div>

          <!-- Featured toggle -->
          <div class="mb-3">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="featuredOnly" [formControl]="featuredCtrl">
              <label class="form-check-label small" for="featuredOnly">
                {{ 'shop.featuredOnly' | translate }}
              </label>
            </div>
          </div>

          <!-- Brands -->
          <div *ngIf="brands.length" class="mb-3">
            <label class="form-label small fw-medium">{{ 'shop.brand' | translate }}</label>
            <div class="d-flex flex-column gap-1" style="max-height:200px;overflow-y:auto;">
              <div class="form-check" *ngFor="let b of brands.slice(0,10)">
                <input class="form-check-input" type="checkbox"
                       [id]="'brand-' + b.id"
                       [checked]="selectedBrands.has(b.id)"
                       (change)="toggleBrand(b.id)">
                <label class="form-check-label small" [for]="'brand-' + b.id">{{ b.name }}</label>
              </div>
            </div>
          </div>

          <button class="btn btn-outline-secondary btn-sm w-100" (click)="resetFilters()">
            {{ 'shop.resetFilters' | translate }}
          </button>
        </div>
      </div>

      <!-- Product grid -->
      <div class="col-12 col-md-9">
        <!-- Header row -->
        <div class="d-flex justify-content-between align-items-center mb-3">
          <span class="text-muted small" *ngIf="totalCount >= 0">
            {{ totalCount }} {{ 'shop.productsFound' | translate }}
          </span>
          <span *ngIf="activeSearch" class="badge bg-primary">
            "{{ activeSearch }}"
            <button type="button" class="btn-close btn-close-white ms-1" style="font-size:0.6rem;" (click)="clearSearch()"></button>
          </span>
          <span *ngIf="activeCategory" class="badge bg-secondary">
            {{ activeCategory }}
            <button type="button" class="btn-close btn-close-white ms-1" style="font-size:0.6rem;" (click)="clearCategory()"></button>
          </span>
        </div>

        <div *ngIf="loading" class="text-center py-5">
          <div class="spinner-border text-primary"></div>
        </div>

        <div *ngIf="!loading && products.length === 0" class="text-center py-5 text-muted">
          <i class="fas fa-box-open fa-3x mb-3 d-block"></i>
          {{ 'shop.noProducts' | translate }}
        </div>

        <div *ngIf="!loading && products.length > 0" class="product-grid">
          <div *ngFor="let p of products" class="product-card">
            <!-- Image -->
            <a [routerLink]="['/shop/products', p.slug || p.id]">
              <img *ngIf="p.mediaUrls && p.mediaUrls.length; else imgPlaceholder"
                   [src]="p.mediaUrls[0]" [alt]="p.name" class="product-img">
              <ng-template #imgPlaceholder>
                <div class="product-img-placeholder">
                  <i class="fas fa-box"></i>
                </div>
              </ng-template>
            </a>

            <div class="p-3">
              <div class="text-muted small mb-1">{{ p.brandName }}</div>
              <a [routerLink]="['/shop/products', p.slug || p.id]"
                 class="text-decoration-none fw-semibold d-block mb-1"
                 style="color:var(--fg);font-size:0.9rem;line-height:1.3;">
                {{ p.name }}
              </a>
              <div class="small text-muted mb-2">{{ p.categoryName }}</div>
              <div class="d-flex justify-content-between align-items-center gap-1">
                <span *ngIf="p.skus && p.skus.length" class="text-muted small">
                  {{ p.skus.length }} {{ 'shop.skuCount' | translate }}
                </span>
                <button class="btn btn-primary btn-sm add-btn flex-shrink-0"
                        (click)="addFirstSkuToCart(p)">
                  <i class="fas fa-cart-plus me-1"></i>{{ 'shop.addToCart' | translate }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Load more -->
        <div *ngIf="!loading && hasMore" class="text-center mt-4">
          <button class="btn btn-outline-primary" (click)="loadMore()" [disabled]="loadingMore">
            <span *ngIf="loadingMore" class="spinner-border spinner-border-sm me-2"></span>
            {{ 'shop.loadMore' | translate }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class ShopBrowseComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  brands: Brand[] = [];
  loading = false;
  loadingMore = false;
  totalCount = 0;
  page = 1;
  pageSize = 12;

  activeSearch = '';
  activeCategory = '';
  activeCategoryId = '';

  selectedBrands = new Set<string>();
  sortCtrl = new FormControl('');
  featuredCtrl = new FormControl(false);

  toast: { message: string; type: 'success' | 'warning' } | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private shopApi: ShopApiService,
    private cartService: CartService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  get hasMore(): boolean {
    return this.products.length < this.totalCount;
  }

  ngOnInit(): void {
    this.shopApi.getBrands().subscribe(res => {
      if (res.isSuccess && res.data) {
        this.brands = Array.isArray(res.data) ? res.data : (res.data as any).items ?? [];
      }
    });

    combineLatest([
      this.route.queryParamMap,
      this.route.paramMap
    ]).pipe(takeUntil(this.destroy$)).subscribe(([qp, pm]) => {
      this.activeSearch = qp.get('search') ?? '';
      const slug = pm.get('slug') ?? '';
      this.activeCategory = slug;
      this.page = 1;
      this.products = [];
      this.loadProducts();
    });

    this.sortCtrl.valueChanges.pipe(takeUntil(this.destroy$), distinctUntilChanged()).subscribe(() => {
      this.page = 1;
      this.products = [];
      this.loadProducts();
    });

    this.featuredCtrl.valueChanges.pipe(takeUntil(this.destroy$), distinctUntilChanged()).subscribe(() => {
      this.page = 1;
      this.products = [];
      this.loadProducts();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProducts(): void {
    this.loading = this.page === 1;
    this.loadingMore = this.page > 1;

    const params: Record<string, unknown> = {
      page: this.page,
      pageSize: this.pageSize,
      search: this.activeSearch || undefined,
      sort: this.sortCtrl.value || undefined,
      isFeatured: this.featuredCtrl.value ? true : undefined,
    };

    if (this.selectedBrands.size === 1) {
      params['brandId'] = [...this.selectedBrands][0];
    }

    this.shopApi.getProducts(params).subscribe({
      next: res => {
        this.loading = false;
        this.loadingMore = false;
        if (res.isSuccess && res.data) {
          const data = res.data;
          const items = Array.isArray(data) ? data : data.items ?? [];
          const count = Array.isArray(data) ? items.length : data.totalCount ?? 0;
          if (this.page === 1) {
            this.products = items;
          } else {
            this.products = [...this.products, ...items];
          }
          this.totalCount = count;
        }
      },
      error: () => {
        this.loading = false;
        this.loadingMore = false;
      }
    });
  }

  loadMore(): void {
    this.page++;
    this.loadProducts();
  }

  toggleBrand(id: string): void {
    if (this.selectedBrands.has(id)) {
      this.selectedBrands.delete(id);
    } else {
      this.selectedBrands.add(id);
    }
    this.page = 1;
    this.products = [];
    this.loadProducts();
  }

  resetFilters(): void {
    this.selectedBrands.clear();
    this.sortCtrl.setValue('', { emitEvent: false });
    this.featuredCtrl.setValue(false, { emitEvent: false });
    this.page = 1;
    this.products = [];
    this.loadProducts();
  }

  clearSearch(): void {
    this.router.navigate(['/shop']);
  }

  clearCategory(): void {
    this.router.navigate(['/shop']);
  }

  addFirstSkuToCart(product: Product): void {
    if (!this.authService.isAuthenticated) {
      this.showToast('shop.signInToOrder', 'warning');
      setTimeout(() => this.router.navigate(['/login'], { queryParams: { returnUrl: '/shop/cart' } }), 1800);
      return;
    }
    const sku = product.skus && product.skus.length ? product.skus[0] : null;
    if (!sku) {
      this.showToast('shop.noSkuAvailable', 'warning');
      return;
    }
    const item: CartItem = {
      skuId: sku.id,
      skuCode: sku.code,
      productName: product.name,
      attributes: sku.attributes ? Object.entries(sku.attributes).map(([k, v]) => `${k}: ${v}`).join(', ') : '',
      unitPrice: sku.unitPrice ?? 0,
      qty: 1,
      imageUrl: product.mediaUrls?.[0]
    };
    this.cartService.add(item);
    this.showToast('shop.addedToCart', 'success');
  }

  private showToast(key: string, type: 'success' | 'warning'): void {
    this.toast = { message: key, type };
    setTimeout(() => { this.toast = null; }, 3000);
  }
}
