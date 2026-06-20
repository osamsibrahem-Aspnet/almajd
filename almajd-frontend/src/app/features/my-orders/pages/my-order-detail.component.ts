import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ShopApiService, Order } from '../../shop/services/shop-api.service';
import { ApiService } from '../../../core/api/api.service';

interface TimelineStep {
  key: string;
  label: string;
  timestamp?: string;
  done: boolean;
  current: boolean;
}

@Component({
  selector: 'app-my-order-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, TranslateModule],
  styles: [`
    .order-timeline { display: flex; flex-direction: column; }
    .timeline-step {
      display: flex;
      gap: 1rem;
      padding-bottom: 1.5rem;
      position: relative;
    }
    .timeline-step:not(:last-child)::before {
      content: '';
      position: absolute;
      left: 11px;
      top: 28px;
      bottom: 0;
      width: 2px;
      background-color: var(--border);
    }
    .timeline-step.completed::before { background-color: var(--success); }
    .step-icon {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 0.65rem;
    }
    .step-icon.done { background: var(--success); color: #fff; }
    .step-icon.current { background: var(--primary); color: #fff; }
    .step-label { font-weight: 600; font-size: 0.9rem; }
    .step-time { font-size: 0.78rem; color: var(--fg-muted); }
  `],
  template: `
    <div *ngIf="loading" class="text-center py-5">
      <div class="spinner-border text-primary"></div>
    </div>

    <div *ngIf="!loading && !order" class="text-center py-5 text-muted">
      {{ 'shop.orderNotFound' | translate }}
    </div>

    <div *ngIf="!loading && order">
      <!-- Back + header -->
      <div class="d-flex align-items-center gap-2 mb-3">
        <a routerLink="/my-orders" class="btn btn-outline-secondary btn-sm">
          <i class="fas fa-arrow-left me-1"></i>{{ 'common.back' | translate }}
        </a>
        <h2 class="mb-0 fw-bold flex-grow-1">#{{ order.orderNumber }}</h2>
        <span class="badge fs-6 px-3 py-2" [ngClass]="statusClass(order.status)">
          {{ 'orders.statuses.' + order.status | translate }}
        </span>
      </div>

      <div class="row g-4">
        <!-- Left: timeline + lines -->
        <div class="col-12 col-lg-7">
          <!-- Timeline -->
          <div class="card mb-3">
            <div class="card-header fw-semibold">{{ 'orders.detail.timeline' | translate }}</div>
            <div class="card-body">
              <div class="order-timeline">
                <div *ngFor="let step of timeline; let last = last"
                     class="timeline-step"
                     [class.completed]="step.done">
                  <div class="step-icon"
                       [class.done]="step.done"
                       [class.current]="step.current">
                    <i class="fas fa-check" *ngIf="step.done"></i>
                    <i class="fas fa-circle-half-stroke" *ngIf="step.current && !step.done"></i>
                  </div>
                  <div class="step-content">
                    <div class="step-label">{{ step.label | translate }}</div>
                    <div class="step-time" *ngIf="step.timestamp">
                      {{ step.timestamp | date:'medium' }}
                    </div>
                    <div class="step-time text-muted" *ngIf="!step.timestamp && !step.done">
                      {{ 'shop.pending' | translate }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Lines -->
          <div class="card">
            <div class="card-header fw-semibold">{{ 'orders.detail.lines' | translate }}</div>
            <div class="table-responsive">
              <table class="table mb-0">
                <thead class="table-light">
                  <tr>
                    <th>{{ 'catalog.products.name' | translate }}</th>
                    <th>{{ 'catalog.products.skuCode' | translate }}</th>
                    <th class="text-end">{{ 'common.total' | translate }}</th>
                    <th class="text-end">{{ 'orders.lines' | translate }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let line of order.lines">
                    <td>{{ line.productName }}</td>
                    <td class="text-muted small">{{ line.skuCode }}</td>
                    <td class="text-end">{{ line.qty }}</td>
                    <td class="text-end fw-medium">{{ line.lineTotal | number:'1.2-2' }}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="3" class="text-end fw-semibold">{{ 'shop.orderTotal' | translate }}</td>
                    <td class="text-end fw-bold">{{ order.totalAmount | number:'1.2-2' }} {{ 'shop.currency' | translate }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <!-- Right: info + actions -->
        <div class="col-12 col-lg-5">
          <!-- Order info -->
          <div class="card mb-3">
            <div class="card-header fw-semibold">{{ 'orders.detail.title' | translate }}</div>
            <div class="card-body">
              <dl class="row small mb-0">
                <dt class="col-5 text-muted">{{ 'orders.submittedAt' | translate }}</dt>
                <dd class="col-7">{{ order.submittedAt | date:'medium' }}</dd>
                <dt class="col-5 text-muted" *ngIf="order.expectedShipAt">{{ 'orders.expectedShipAt' | translate }}</dt>
                <dd class="col-7" *ngIf="order.expectedShipAt">{{ order.expectedShipAt | date:'shortDate' }}</dd>
                <dt class="col-5 text-muted" *ngIf="order.driverName">{{ 'fulfilment.shipments.driver' | translate }}</dt>
                <dd class="col-7" *ngIf="order.driverName">{{ order.driverName }}</dd>
                <dt class="col-5 text-muted" *ngIf="order.shipmentWaybill">{{ 'fulfilment.shipments.waybill' | translate }}</dt>
                <dd class="col-7" *ngIf="order.shipmentWaybill">{{ order.shipmentWaybill }}</dd>
                <dt class="col-5 text-muted" *ngIf="order.notes">{{ 'shop.notes' | translate }}</dt>
                <dd class="col-7" *ngIf="order.notes">{{ order.notes }}</dd>
              </dl>
            </div>
          </div>

          <!-- Actions -->
          <div class="card">
            <div class="card-body d-flex flex-column gap-2">
              <!-- PDF invoice -->
              <a *ngIf="isShipped(order.status)"
                 [href]="invoicePdfUrl" target="_blank"
                 class="btn btn-outline-primary btn-sm">
                <i class="fas fa-file-pdf me-1"></i>{{ 'billing.invoices.downloadPdf' | translate }}
              </a>

              <!-- Cancel -->
              <div *ngIf="isCancellable(order.status)">
                <div class="mb-2" *ngIf="!showCancelForm">
                  <button class="btn btn-outline-danger btn-sm w-100"
                          (click)="showCancelForm = true">
                    <i class="fas fa-ban me-1"></i>{{ 'orders.detail.cancel' | translate }}
                  </button>
                </div>
                <div *ngIf="showCancelForm">
                  <input type="text" class="form-control form-control-sm mb-2"
                         style="font-size:14px;"
                         [formControl]="cancelReasonCtrl"
                         [placeholder]="'orders.detail.cancelReason' | translate">
                  <small class="text-danger d-block mb-2" *ngIf="cancelReasonCtrl.touched && cancelReasonCtrl.invalid">
                    {{ 'orders.detail.cancelReason' | translate }}
                  </small>
                  <div class="d-flex gap-2">
                    <button class="btn btn-danger btn-sm flex-grow-1"
                            [disabled]="cancelling"
                            (click)="cancelOrder()">
                      <span *ngIf="cancelling" class="spinner-border spinner-border-sm me-1"></span>
                      {{ 'common.confirm' | translate }}
                    </button>
                    <button class="btn btn-outline-secondary btn-sm" (click)="showCancelForm = false">
                      {{ 'common.cancel' | translate }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- Reorder -->
              <button *ngIf="isReorderable(order.status)"
                      class="btn btn-outline-secondary btn-sm"
                      (click)="reorder()">
                <i class="fas fa-rotate-right me-1"></i>{{ 'orders.detail.reorder' | translate }}
              </button>

              <div *ngIf="actionMessage" class="alert py-2 mt-2 small"
                   [class.alert-success]="actionSuccess"
                   [class.alert-danger]="!actionSuccess">
                {{ actionMessage }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class MyOrderDetailComponent implements OnInit {
  order: Order | null = null;
  loading = true;
  timeline: TimelineStep[] = [];
  showCancelForm = false;
  cancelling = false;
  cancelReasonCtrl = new FormControl('', Validators.required);
  actionMessage = '';
  actionSuccess = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private shopApi: ShopApiService,
    private api: ApiService
  ) {}

  get invoicePdfUrl(): string {
    return `/api/invoices/by-order/${this.order?.id}/pdf`;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.shopApi.getOrder(id).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess && res.data) {
          this.order = res.data;
          this.buildTimeline(res.data);
        }
      },
      error: () => { this.loading = false; }
    });
  }

  buildTimeline(o: Order): void {
    const allStatuses = [
      { key: 'Submitted', label: 'orders.detail.submitted', timestamp: o.submittedAt },
      { key: 'Approved',  label: 'orders.detail.approved',  timestamp: o.approvedAt },
      { key: 'Shipped',   label: 'orders.detail.shipped',   timestamp: o.shippedAt },
      { key: 'Delivered', label: 'orders.detail.delivered', timestamp: o.deliveredAt },
    ];

    const orderedStatuses = ['Draft','Submitted','UnderReview','Approved','InPreparation','ReadyToShip','Shipped','Delivered','Closed'];
    const currentIdx = orderedStatuses.indexOf(o.status);

    this.timeline = allStatuses.map(s => {
      const stepIdx = orderedStatuses.indexOf(s.key);
      return {
        key: s.key,
        label: s.label,
        timestamp: s.timestamp,
        done: stepIdx < currentIdx || (stepIdx === currentIdx && !!s.timestamp),
        current: stepIdx === currentIdx
      };
    });
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      Draft: 'badge-draft', Submitted: 'badge-submitted', UnderReview: 'badge-underreview',
      Approved: 'badge-approved', InPreparation: 'badge-inpreparation',
      ReadyToShip: 'badge-readytoship', Shipped: 'badge-shipped',
      Delivered: 'badge-delivered', Closed: 'badge-closed', Cancelled: 'badge-cancelled'
    };
    return map[status] ?? 'bg-secondary';
  }

  isCancellable(status: string): boolean {
    return status === 'Draft' || status === 'Submitted';
  }

  isShipped(status: string): boolean {
    return ['Shipped','Delivered','Closed'].includes(status);
  }

  isReorderable(status: string): boolean {
    return status === 'Delivered' || status === 'Closed';
  }

  cancelOrder(): void {
    if (this.cancelReasonCtrl.invalid) {
      this.cancelReasonCtrl.markAsTouched();
      return;
    }
    this.cancelling = true;
    this.shopApi.cancelOrder(this.order!.id, this.cancelReasonCtrl.value!).subscribe({
      next: res => {
        this.cancelling = false;
        if (res.isSuccess) {
          this.order = res.data;
          this.actionMessage = 'orders.cancelSuccess';
          this.actionSuccess = true;
          this.showCancelForm = false;
          if (res.data) this.buildTimeline(res.data);
        } else {
          this.actionMessage = res.message;
          this.actionSuccess = false;
        }
      },
      error: (err: any) => {
        this.cancelling = false;
        this.actionMessage = err?.message ?? 'Cancel failed.';
        this.actionSuccess = false;
      }
    });
  }

  reorder(): void {
    this.shopApi.reorder(this.order!.id).subscribe({
      next: res => {
        if (res.isSuccess && res.data) {
          this.router.navigate(['/my-orders', res.data.id]);
        }
      }
    });
  }
}
