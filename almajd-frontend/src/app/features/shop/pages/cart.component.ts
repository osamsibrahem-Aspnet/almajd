import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { CartService, CartItem } from '../services/cart.service';
import { ShopApiService } from '../services/shop-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ApiService } from '../../../core/api/api.service';

interface CustomerAddress {
  id: string;
  label?: string;
  line1?: string;
  city?: string;
  kind?: string;
}

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, TranslateModule],
  styles: [`
    .cart-img {
      width: 56px;
      height: 56px;
      object-fit: cover;
      border-radius: 0.375rem;
      border: 1px solid var(--border);
      background: var(--primary-soft);
    }
    .img-placeholder-sm {
      width: 56px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--primary-soft);
      border-radius: 0.375rem;
      color: var(--primary);
    }
    .qty-stepper {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .qty-btn {
      width: 34px;
      height: 34px;
      min-width: 34px;
      padding: 0;
    }
    .cart-empty {
      min-height: 300px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      color: var(--fg-muted);
    }
    .total-card {
      background: var(--bg-elev);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      padding: 1.25rem;
      position: sticky;
      top: 70px;
    }
  `],
  template: `
    <div class="page-header">
      <h2>{{ 'shop.cart' | translate }}</h2>
    </div>

    <!-- Empty state -->
    <div *ngIf="(items$ | async) as items">
      <div *ngIf="items.length === 0" class="cart-empty">
        <i class="fas fa-shopping-cart fa-3x" style="color:var(--primary);opacity:.4;"></i>
        <div class="text-center">
          <div class="fw-semibold mb-1">{{ 'shop.cartEmpty' | translate }}</div>
          <small class="text-muted">{{ 'shop.cartEmptyHint' | translate }}</small>
        </div>
        <a routerLink="/shop" class="btn btn-primary">{{ 'shop.continueShopping' | translate }}</a>
      </div>

      <div *ngIf="items.length > 0">
        <div class="row g-4">
          <!-- Cart items -->
          <div class="col-12 col-lg-8">
            <div class="card">
              <div class="card-body p-0">
                <div *ngFor="let item of items; let last = last" class="p-3"
                     [class.border-bottom]="!last">
                  <div class="d-flex gap-3 align-items-start">
                    <!-- Image -->
                    <div>
                      <img *ngIf="item.imageUrl; else smPlaceholder"
                           [src]="item.imageUrl" [alt]="item.productName" class="cart-img">
                      <ng-template #smPlaceholder>
                        <div class="img-placeholder-sm"><i class="fas fa-box"></i></div>
                      </ng-template>
                    </div>

                    <!-- Info -->
                    <div class="flex-grow-1">
                      <div class="fw-semibold" style="font-size:0.9rem;">{{ item.productName }}</div>
                      <div class="text-muted" style="font-size:0.8rem;">{{ item.skuCode }}</div>
                      <div *ngIf="item.attributes" class="text-muted" style="font-size:0.78rem;">{{ item.attributes }}</div>
                      <div class="small fw-medium mt-1" style="color:var(--primary);" *ngIf="item.unitPrice">
                        {{ item.unitPrice | number:'1.2-2' }} {{ 'shop.currency' | translate }}
                      </div>
                    </div>

                    <!-- Qty stepper -->
                    <div class="d-flex flex-column align-items-end gap-2">
                      <div class="qty-stepper">
                        <button class="btn btn-outline-secondary qty-btn"
                                (click)="updateQty(item, item.qty - 1)"
                                [disabled]="item.qty <= 1">
                          <i class="fas fa-minus" style="font-size:0.7rem;"></i>
                        </button>
                        <span class="fw-bold" style="min-width:2rem;text-align:center;">{{ item.qty }}</span>
                        <button class="btn btn-outline-secondary qty-btn"
                                (click)="updateQty(item, item.qty + 1)">
                          <i class="fas fa-plus" style="font-size:0.7rem;"></i>
                        </button>
                      </div>
                      <button class="btn btn-link btn-sm text-danger p-0" (click)="remove(item)">
                        <i class="fas fa-trash me-1"></i>{{ 'common.delete' | translate }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Order options -->
            <div class="card mt-3" *ngIf="isLoggedIn">
              <div class="card-body">
                <form [formGroup]="orderForm">
                  <!-- Address -->
                  <div class="mb-3">
                    <label class="form-label small fw-medium">{{ 'shop.shipToAddress' | translate }}</label>
                    <select class="form-select form-select-sm" formControlName="shipToAddressId">
                      <option value="">{{ 'shop.selectAddress' | translate }}</option>
                      <option *ngFor="let addr of addresses" [value]="addr.id">
                        {{ addr.label || addr.line1 }} — {{ addr.city }} ({{ addr.kind }})
                      </option>
                    </select>
                    <small *ngIf="addresses.length === 0" class="text-muted">
                      {{ 'shop.noAddresses' | translate }}
                      <a routerLink="/account/addresses" class="ms-1">{{ 'shop.addAddressLink' | translate }}</a>
                    </small>
                  </div>

                  <!-- Coupon -->
                  <div class="mb-3">
                    <label class="form-label small fw-medium">{{ 'shop.coupon' | translate }}</label>
                    <input type="text" class="form-control form-control-sm"
                           style="font-size:14px;"
                           formControlName="couponCode"
                           [placeholder]="'shop.couponPlaceholder' | translate">
                  </div>

                  <!-- Notes -->
                  <div class="mb-0">
                    <label class="form-label small fw-medium">{{ 'shop.notes' | translate }}</label>
                    <textarea class="form-control form-control-sm" rows="2"
                              style="font-size:14px;"
                              formControlName="notes"
                              [placeholder]="'shop.notesPlaceholder' | translate"></textarea>
                  </div>
                </form>
              </div>
            </div>

            <div *ngIf="!isLoggedIn" class="alert alert-warning mt-3">
              <i class="fas fa-exclamation-triangle me-2"></i>
              {{ 'shop.signInToOrder' | translate }}
              <a routerLink="/login" [queryParams]="{ returnUrl: '/shop/cart' }" class="ms-2 alert-link">
                {{ 'auth.signIn' | translate }}
              </a>
            </div>
          </div>

          <!-- Summary -->
          <div class="col-12 col-lg-4">
            <div class="total-card">
              <h6 class="fw-semibold mb-3">{{ 'shop.orderSummary' | translate }}</h6>

              <div class="d-flex justify-content-between mb-2 small">
                <span>{{ 'shop.subtotal' | translate }}</span>
                <span>{{ (subTotal$ | async) | number:'1.2-2' }} {{ 'shop.currency' | translate }}</span>
              </div>
              <p class="text-muted small mb-3">{{ 'shop.taxDiscountNote' | translate }}</p>

              <hr>
              <button class="btn btn-primary w-100 mb-2"
                      style="min-height:44px;"
                      [disabled]="submitting || !isLoggedIn"
                      (click)="submitOrder(items)">
                <span *ngIf="submitting" class="spinner-border spinner-border-sm me-2"></span>
                {{ 'shop.submitOrder' | translate }}
              </button>
              <a routerLink="/shop" class="btn btn-outline-secondary w-100">
                {{ 'shop.continueShopping' | translate }}
              </a>

              <!-- Error -->
              <div *ngIf="errorMessage" class="alert alert-danger py-2 mt-3 small">
                {{ errorMessage }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class CartComponent implements OnInit {
  items$ = this.cartService.items$;
  subTotal$ = this.cartService.subTotal$;

  addresses: CustomerAddress[] = [];
  submitting = false;
  errorMessage = '';

  orderForm = this.fb.group({
    shipToAddressId: [''],
    couponCode: [''],
    notes: ['']
  });

  constructor(
    private cartService: CartService,
    private shopApi: ShopApiService,
    private authService: AuthService,
    private api: ApiService,
    private router: Router,
    private fb: FormBuilder
  ) {}

  get isLoggedIn(): boolean {
    return this.authService.isAuthenticated;
  }

  ngOnInit(): void {
    if (this.isLoggedIn) {
      const userId = this.authService.currentUser?.userId;
      if (userId) {
        this.api.get<any>(`/api/customers/${userId}`).subscribe((res: any) => {
          if (res.isSuccess && res.data?.addresses) {
            this.addresses = res.data.addresses;
          }
        });
      }
    }
  }

  updateQty(item: CartItem, qty: number): void {
    this.cartService.update(item.skuId, qty);
  }

  remove(item: CartItem): void {
    this.cartService.remove(item.skuId);
  }

  submitOrder(items: CartItem[]): void {
    if (!this.isLoggedIn) return;
    this.submitting = true;
    this.errorMessage = '';

    const formVal = this.orderForm.value;
    const dto = {
      lines: items.map(i => ({ skuId: i.skuId, qty: i.qty })),
      couponCode: formVal.couponCode || undefined,
      shipToAddressId: formVal.shipToAddressId || undefined,
      notes: formVal.notes || undefined
    };

    this.shopApi.createOrder(dto).subscribe({
      next: createRes => {
        if (createRes.isSuccess && createRes.data) {
          const orderId = createRes.data.id;
          this.shopApi.submitOrder(orderId).subscribe({
            next: submitRes => {
              this.submitting = false;
              if (submitRes.isSuccess) {
                this.cartService.clear();
                this.router.navigate(['/shop/orders', orderId, 'confirmation']);
              } else {
                this.errorMessage = submitRes.message;
              }
            },
            error: (err: any) => {
              this.submitting = false;
              this.errorMessage = err?.message ?? 'Submit failed.';
            }
          });
        } else {
          this.submitting = false;
          this.errorMessage = createRes.message;
        }
      },
      error: (err: any) => {
        this.submitting = false;
        this.errorMessage = err?.message ?? 'Order creation failed.';
      }
    });
  }
}
