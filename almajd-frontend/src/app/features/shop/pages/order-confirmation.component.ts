import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ShopApiService, Order } from '../services/shop-api.service';

@Component({
  selector: 'app-order-confirmation',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  styles: [`
    .confirmation-hero {
      text-align: center;
      padding: 3rem 1rem;
    }
    .check-circle {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background-color: var(--success);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.5rem;
      margin: 0 auto 1.5rem;
    }
  `],
  template: `
    <div class="confirmation-hero">
      <div class="check-circle">
        <i class="fas fa-check"></i>
      </div>
      <h2 class="fw-bold mb-2" style="color:var(--success);">
        {{ 'shop.orderConfirmed' | translate }}
      </h2>
      <p class="text-muted mb-1">{{ 'shop.orderConfirmedSubtitle' | translate }}</p>
      <div *ngIf="order" class="mt-3 mb-4">
        <div class="fw-semibold fs-5 mb-1">
          {{ 'orders.number' | translate }}: #{{ order.orderNumber }}
        </div>
        <div *ngIf="order.expectedShipAt" class="text-muted small">
          {{ 'shop.estimatedShipping' | translate }}: {{ order.expectedShipAt | date:'mediumDate' }}
        </div>
        <div *ngIf="!order.expectedShipAt" class="text-muted small">
          {{ 'shop.etaWillBeNotified' | translate }}
        </div>
      </div>

      <div *ngIf="loading" class="text-center mb-4">
        <div class="spinner-border text-primary spinner-border-sm"></div>
      </div>

      <div class="d-flex flex-wrap justify-content-center gap-3 mt-2">
        <a *ngIf="orderId"
           [routerLink]="['/my-orders', orderId]"
           class="btn btn-primary"
           style="min-height:44px;">
          <i class="fas fa-box me-2"></i>{{ 'shop.trackOrder' | translate }}
        </a>
        <a routerLink="/shop" class="btn btn-outline-secondary" style="min-height:44px;">
          <i class="fas fa-arrow-left me-2"></i>{{ 'shop.continueShopping' | translate }}
        </a>
      </div>
    </div>
  `
})
export class OrderConfirmationComponent implements OnInit {
  order: Order | null = null;
  orderId = '';
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private shopApi: ShopApiService
  ) {}

  ngOnInit(): void {
    this.orderId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.orderId) {
      this.shopApi.getOrder(this.orderId).subscribe({
        next: res => {
          this.loading = false;
          if (res.isSuccess && res.data) {
            this.order = res.data;
          }
        },
        error: () => { this.loading = false; }
      });
    } else {
      this.loading = false;
    }
  }
}
