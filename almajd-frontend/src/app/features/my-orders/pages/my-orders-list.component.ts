import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ShopApiService, Order } from '../../shop/services/shop-api.service';

@Component({
  selector: 'app-my-orders-list',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  styles: [`
    .order-card {
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      background: var(--bg-elev);
      padding: 1rem 1.25rem;
      transition: box-shadow 0.2s;
    }
    .order-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .status-badge {
      font-size: 0.78rem;
      padding: 0.25em 0.6em;
    }
  `],
  template: `
    <div class="page-header d-flex justify-content-between align-items-center">
      <h2>{{ 'shop.myOrders' | translate }}</h2>
    </div>

    <div *ngIf="loading" class="text-center py-5">
      <div class="spinner-border text-primary"></div>
    </div>

    <div *ngIf="!loading && orders.length === 0" class="text-center py-5 text-muted">
      <i class="fas fa-box-open fa-3x mb-3 d-block"></i>
      {{ 'shop.noOrdersYet' | translate }}
      <div class="mt-3">
        <a routerLink="/shop" class="btn btn-primary">{{ 'shop.startShopping' | translate }}</a>
      </div>
    </div>

    <!-- Desktop table -->
    <div *ngIf="!loading && orders.length > 0" class="d-none d-md-block">
      <div class="card">
        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th>{{ 'orders.number' | translate }}</th>
                <th>{{ 'orders.status' | translate }}</th>
                <th>{{ 'orders.total' | translate }}</th>
                <th>{{ 'orders.submittedAt' | translate }}</th>
                <th>{{ 'orders.expectedShipAt' | translate }}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let o of orders">
                <td><a [routerLink]="['/my-orders', o.id]" class="fw-semibold text-decoration-none">#{{ o.orderNumber }}</a></td>
                <td>
                  <span class="badge status-badge" [ngClass]="statusClass(o.status)">
                    {{ 'orders.statuses.' + o.status | translate }}
                  </span>
                </td>
                <td>{{ o.totalAmount | number:'1.2-2' }} {{ 'shop.currency' | translate }}</td>
                <td>{{ o.submittedAt | date:'shortDate' }}</td>
                <td>{{ o.expectedShipAt ? (o.expectedShipAt | date:'shortDate') : '—' }}</td>
                <td class="text-end">
                  <a [routerLink]="['/my-orders', o.id]" class="btn btn-sm btn-outline-primary">
                    {{ 'common.actions' | translate }}
                  </a>
                  <button *ngIf="isReorderable(o)" class="btn btn-sm btn-outline-secondary ms-1"
                          (click)="reorder(o.id)">
                    <i class="fas fa-rotate-right me-1"></i>{{ 'orders.detail.reorder' | translate }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Mobile cards -->
    <div *ngIf="!loading && orders.length > 0" class="d-md-none d-flex flex-column gap-3">
      <div *ngFor="let o of orders" class="order-card">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <a [routerLink]="['/my-orders', o.id]" class="fw-semibold text-decoration-none">#{{ o.orderNumber }}</a>
          <span class="badge status-badge" [ngClass]="statusClass(o.status)">
            {{ 'orders.statuses.' + o.status | translate }}
          </span>
        </div>
        <div class="small text-muted mb-1">{{ o.submittedAt | date:'shortDate' }}</div>
        <div class="fw-medium" style="color:var(--primary);">
          {{ o.totalAmount | number:'1.2-2' }} {{ 'shop.currency' | translate }}
        </div>
        <div class="d-flex gap-2 mt-2">
          <a [routerLink]="['/my-orders', o.id]" class="btn btn-sm btn-outline-primary">{{ 'common.actions' | translate }}</a>
          <button *ngIf="isReorderable(o)" class="btn btn-sm btn-outline-secondary"
                  (click)="reorder(o.id)">
            <i class="fas fa-rotate-right me-1"></i>{{ 'orders.detail.reorder' | translate }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class MyOrdersListComponent implements OnInit {
  orders: Order[] = [];
  loading = true;

  constructor(private shopApi: ShopApiService) {}

  ngOnInit(): void {
    this.shopApi.getOrders({ page: 1, pageSize: 50 }).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess && res.data) {
          const data = res.data as any;
          this.orders = Array.isArray(data) ? data : (data.items ?? []);
        }
      },
      error: () => { this.loading = false; }
    });
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      Draft: 'badge-draft',
      Submitted: 'badge-submitted',
      UnderReview: 'badge-underreview',
      Approved: 'badge-approved',
      InPreparation: 'badge-inpreparation',
      ReadyToShip: 'badge-readytoship',
      Shipped: 'badge-shipped',
      Delivered: 'badge-delivered',
      Closed: 'badge-closed',
      Cancelled: 'badge-cancelled'
    };
    return map[status] ?? 'bg-secondary';
  }

  isReorderable(o: Order): boolean {
    return o.status === 'Delivered' || o.status === 'Closed';
  }

  reorder(id: string): void {
    this.shopApi.reorder(id).subscribe();
  }
}
