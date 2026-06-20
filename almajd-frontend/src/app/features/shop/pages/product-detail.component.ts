import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ShopApiService, Product, ProductSku } from '../services/shop-api.service';
import { CartService, CartItem } from '../services/cart.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, TranslateModule],
  styles: [`
    .main-img {
      width: 100%;
      max-height: 380px;
      object-fit: contain;
      border-radius: 0.5rem;
      border: 1px solid var(--border);
      background: var(--bg-elev);
    }
    .thumb-img {
      width: 64px;
      height: 64px;
      object-fit: cover;
      border-radius: 0.25rem;
      border: 2px solid transparent;
      cursor: pointer;
    }
    .thumb-img.active { border-color: var(--primary); }
    .sku-row {
      border: 1px solid var(--border);
      border-radius: 0.375rem;
      padding: 0.75rem;
      background: var(--bg-elev);
    }
    .sku-row:hover { border-color: var(--primary); }
    .qty-stepper {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .qty-btn {
      width: 36px;
      height: 36px;
      min-width: 36px;
      min-height: 36px;
      border-radius: 0.25rem;
    }
    .availability-badge {
      font-size: 0.75rem;
    }
    .img-placeholder {
      width: 100%;
      height: 280px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--primary-soft);
      border-radius: 0.5rem;
      color: var(--primary);
      font-size: 4rem;
    }
    .toast-container-custom {
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      z-index: 9999;
    }
  `],
  template: `
    <div class="toast-container-custom">
      <div *ngIf="toast" class="toast show align-items-center border-0"
           [class.text-bg-success]="toast.type === 'success'"
           [class.text-bg-warning]="toast.type === 'warning'"
           role="alert">
        <div class="d-flex">
          <div class="toast-body">{{ toast.message | translate }}</div>
          <button type="button" class="btn-close me-2 m-auto" (click)="toast = null"></button>
        </div>
      </div>
    </div>

    <div *ngIf="loading" class="text-center py-5">
      <div class="spinner-border text-primary"></div>
    </div>

    <div *ngIf="!loading && !product" class="text-center py-5 text-muted">
      <i class="fas fa-exclamation-circle fa-3x mb-3 d-block"></i>
      {{ 'shop.productNotFound' | translate }}
    </div>

    <div *ngIf="!loading && product">
      <!-- Breadcrumb -->
      <nav aria-label="breadcrumb" class="mb-3">
        <ol class="breadcrumb small">
          <li class="breadcrumb-item"><a routerLink="/shop" class="text-decoration-none">{{ 'shop.home' | translate }}</a></li>
          <li *ngIf="product.categoryName" class="breadcrumb-item text-muted">{{ product.categoryName }}</li>
          <li class="breadcrumb-item active">{{ product.name }}</li>
        </ol>
      </nav>

      <div class="row g-4">
        <!-- Image carousel -->
        <div class="col-12 col-md-5">
          <div *ngIf="product.mediaUrls && product.mediaUrls.length; else noImg">
            <img [src]="activeImageUrl" [alt]="product.name" class="main-img mb-2">
            <div class="d-flex gap-2 flex-wrap">
              <img *ngFor="let url of product.mediaUrls"
                   [src]="url" [alt]="product.name"
                   class="thumb-img"
                   [class.active]="url === activeImageUrl"
                   (click)="activeImageUrl = url">
            </div>
          </div>
          <ng-template #noImg>
            <div class="img-placeholder"><i class="fas fa-box"></i></div>
          </ng-template>
        </div>

        <!-- Product info -->
        <div class="col-12 col-md-7">
          <div class="text-muted small mb-1">{{ product.brandName }}</div>
          <h1 class="h3 fw-bold mb-2" style="color:var(--fg);">{{ product.name }}</h1>

          <div class="mb-3 d-flex flex-wrap gap-2">
            <span class="badge bg-primary">{{ product.categoryName }}</span>
            <span *ngIf="product.isFeatured" class="badge bg-warning text-dark">
              <i class="fas fa-star me-1"></i>{{ 'shop.featured' | translate }}
            </span>
          </div>

          <p *ngIf="product.description" class="text-muted mb-4" style="font-size:0.9rem;">
            {{ product.description }}
          </p>

          <!-- SKU list -->
          <h6 class="fw-semibold mb-2">{{ 'shop.availableSkus' | translate }}</h6>
          <div class="d-flex flex-column gap-2 mb-4">
            <div *ngFor="let sku of product.skus" class="sku-row">
              <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
                <div>
                  <div class="fw-semibold small">{{ sku.code }}</div>
                  <div *ngIf="sku.attributes" class="text-muted" style="font-size:0.8rem;">
                    <span *ngFor="let attr of getAttrEntries(sku)" class="me-2">
                      {{ attr.key }}: <strong>{{ attr.value }}</strong>
                    </span>
                  </div>
                  <span class="badge availability-badge"
                        [class.bg-success]="sku.isActive"
                        [class.bg-secondary]="!sku.isActive">
                    {{ sku.isActive ? ('shop.available' | translate) : ('shop.unavailable' | translate) }}
                  </span>
                </div>

                <div class="d-flex align-items-center gap-2" *ngIf="sku.isActive">
                  <!-- Qty stepper -->
                  <div class="qty-stepper">
                    <button class="btn btn-outline-secondary qty-btn"
                            (click)="decrement(sku.id)"
                            [disabled]="getQty(sku.id) <= 1">
                      <i class="fas fa-minus"></i>
                    </button>
                    <span class="fw-bold" style="min-width:2rem;text-align:center;">{{ getQty(sku.id) }}</span>
                    <button class="btn btn-outline-secondary qty-btn"
                            (click)="increment(sku.id)">
                      <i class="fas fa-plus"></i>
                    </button>
                  </div>
                  <button class="btn btn-primary btn-sm"
                          style="min-height:44px;"
                          (click)="addToCart(sku)">
                    <i class="fas fa-cart-plus me-1"></i>{{ 'shop.addToCart' | translate }}
                  </button>
                </div>
              </div>
            </div>

            <div *ngIf="!product.skus || product.skus.length === 0" class="text-muted small">
              {{ 'shop.noSkuAvailable' | translate }}
            </div>
          </div>

          <a routerLink="/shop/cart" class="btn btn-outline-primary">
            <i class="fas fa-shopping-cart me-1"></i>{{ 'shop.viewCart' | translate }}
          </a>
        </div>
      </div>
    </div>
  `
})
export class ProductDetailComponent implements OnInit {
  product: Product | null = null;
  loading = true;
  activeImageUrl = '';
  qtys: Record<string, number> = {};
  toast: { message: string; type: 'success' | 'warning' } | null = null;

  constructor(
    private shopApi: ShopApiService,
    private cartService: CartService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('slug') ?? '';
    this.shopApi.getProduct(id).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess && res.data) {
          this.product = res.data;
          this.activeImageUrl = res.data.mediaUrls?.[0] ?? '';
        }
      },
      error: () => { this.loading = false; }
    });
  }

  getAttrEntries(sku: ProductSku): { key: string; value: string }[] {
    if (!sku.attributes) return [];
    return Object.entries(sku.attributes).map(([key, value]) => ({ key, value }));
  }

  getQty(skuId: string): number {
    return this.qtys[skuId] ?? 1;
  }

  increment(skuId: string): void {
    this.qtys[skuId] = (this.qtys[skuId] ?? 1) + 1;
  }

  decrement(skuId: string): void {
    const current = this.qtys[skuId] ?? 1;
    if (current > 1) {
      this.qtys[skuId] = current - 1;
    }
  }

  addToCart(sku: ProductSku): void {
    if (!this.authService.isAuthenticated) {
      this.showToast('shop.signInToOrder', 'warning');
      setTimeout(() => this.router.navigate(['/login'], { queryParams: { returnUrl: '/shop/cart' } }), 1800);
      return;
    }
    const item: CartItem = {
      skuId: sku.id,
      skuCode: sku.code,
      productName: this.product?.name ?? '',
      attributes: sku.attributes
        ? Object.entries(sku.attributes).map(([k, v]) => `${k}: ${v}`).join(', ')
        : '',
      unitPrice: sku.unitPrice ?? 0,
      qty: this.getQty(sku.id),
      imageUrl: this.product?.mediaUrls?.[0]
    };
    this.cartService.add(item);
    this.showToast('shop.addedToCart', 'success');
  }

  private showToast(key: string, type: 'success' | 'warning'): void {
    this.toast = { message: key, type };
    setTimeout(() => { this.toast = null; }, 3000);
  }
}
