import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { OrdersApiService, OrderDto, CancelOrderDto } from '../services/orders-api.service';
import { AuthService } from '../../../core/auth/auth.service';

interface TimelineStep {
  labelKey: string;
  timestamp?: string;
  done: boolean;
  current: boolean;
}

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="page-header d-flex justify-content-between align-items-center">
      <div>
        <a routerLink="/admin/orders" class="text-muted text-decoration-none small">
          <i class="fas fa-arrow-left me-1"></i>{{ 'orders.title' | translate }}
        </a>
        <h2 class="mt-1">
          {{ order ? order.number : 'Loading...' }}
          <span *ngIf="order" class="badge ms-2 fs-6" [class]="statusBadgeClass(order.status)">
            {{ order.status }}
          </span>
          <span *ngIf="order?.isLate && order?.status !== 'Delivered' && order?.status !== 'Cancelled'"
                class="badge badge-cancelled ms-1 fs-6">LATE</span>
        </h2>
      </div>
    </div>

    <div *ngIf="loading" class="text-center py-5">
      <div class="spinner-border" style="color: var(--primary);"></div>
    </div>

    <div *ngIf="error" class="alert alert-danger">{{ error }}</div>
    <div *ngIf="successMsg" class="alert alert-success py-2">{{ successMsg }}</div>

    <div *ngIf="order && !loading" class="row g-3">
      <!-- Left column: order info + lines -->
      <div class="col-lg-8">
        <!-- Order summary card -->
        <div class="card border-0 shadow-sm mb-3">
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-6">
                <table class="table table-sm table-borderless mb-0">
                  <tr><td class="text-muted small fw-medium" style="width:160px;">Customer</td><td>{{ order.customerName }} <span class="text-muted small">({{ order.customerCode }})</span></td></tr>
                  <tr><td class="text-muted small fw-medium">Channel</td><td><span class="badge bg-secondary">{{ order.channel }}</span></td></tr>
                  <tr><td class="text-muted small fw-medium">Sales Rep</td><td>{{ order.salesRepName ?? '—' }}</td></tr>
                  <tr><td class="text-muted small fw-medium">Notes</td><td class="small">{{ order.notes ?? '—' }}</td></tr>
                </table>
              </div>
              <div class="col-md-6">
                <table class="table table-sm table-borderless mb-0">
                  <tr><td class="text-muted small fw-medium" style="width:160px;">Payment Terms</td><td>Net {{ order.paymentTermsNetDays }} days</td></tr>
                  <tr><td class="text-muted small fw-medium">Coupon</td><td>{{ order.couponCode ?? '—' }}</td></tr>
                  <tr><td class="text-muted small fw-medium">Expected Ship</td><td>{{ order.expectedShipAt ? (order.expectedShipAt | date:'mediumDate') : '—' }}</td></tr>
                  <tr *ngIf="order.cancellationReason"><td class="text-muted small fw-medium">Cancel Reason</td><td class="text-danger small">{{ order.cancellationReason }}</td></tr>
                </table>
              </div>
            </div>

            <!-- Totals -->
            <div class="border-top pt-3 mt-3">
              <div class="row justify-content-end">
                <div class="col-md-5">
                  <table class="table table-sm table-borderless mb-0">
                    <tr><td class="text-muted small">Subtotal</td><td class="text-end">{{ order.currency }} {{ order.subTotal | number:'1.2-2' }}</td></tr>
                    <tr *ngIf="order.lineDiscountTotal > 0"><td class="text-muted small">Discount</td><td class="text-end text-success">-{{ order.currency }} {{ order.lineDiscountTotal | number:'1.2-2' }}</td></tr>
                    <tr *ngIf="order.couponDiscountAmount > 0"><td class="text-muted small">Coupon</td><td class="text-end text-success">-{{ order.currency }} {{ order.couponDiscountAmount | number:'1.2-2' }}</td></tr>
                    <tr><td class="text-muted small">Tax</td><td class="text-end">{{ order.currency }} {{ order.taxTotal | number:'1.2-2' }}</td></tr>
                    <tr class="fw-bold"><td>Total</td><td class="text-end fs-5">{{ order.currency }} {{ order.total | number:'1.2-2' }}</td></tr>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Order Lines -->
        <div class="card border-0 shadow-sm mb-3">
          <div class="card-header bg-transparent fw-medium">
            {{ 'orders.detail.lines' | translate }} ({{ order.lines.length }})
          </div>
          <div class="table-responsive">
            <table class="table table-hover mb-0">
              <thead class="table-light">
                <tr>
                  <th>SKU</th><th>Product</th><th class="text-center">Qty</th>
                  <th class="text-end">Unit Price</th><th class="text-end">Discount</th>
                  <th class="text-end">Tax</th><th class="text-end">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngIf="order.lines.length === 0">
                  <td colspan="7" class="text-center text-muted py-3">No lines</td>
                </tr>
                <tr *ngFor="let line of order.lines">
                  <td class="font-monospace small">{{ line.skuCode }}</td>
                  <td class="small">{{ line.productName }}</td>
                  <td class="text-center">{{ line.qty }}</td>
                  <td class="text-end small">{{ line.unitPrice | number:'1.2-2' }}</td>
                  <td class="text-end small text-success">
                    {{ line.discountPct > 0 ? (line.discountPct + '%') : '—' }}
                  </td>
                  <td class="text-end small">{{ line.taxPct > 0 ? (line.taxPct + '%') : '—' }}</td>
                  <td class="text-end fw-medium">{{ line.lineTotal | number:'1.2-2' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="d-flex flex-wrap gap-2">
          <button
            *ngIf="order.status === 'UnderReview' && canApprove"
            class="btn btn-success"
            [disabled]="acting"
            (click)="approveOrder()">
            <span *ngIf="acting" class="spinner-border spinner-border-sm me-1"></span>
            <i class="fas fa-check me-1"></i>{{ 'orders.detail.approve' | translate }}
          </button>

          <button
            *ngIf="canCancel"
            class="btn btn-danger"
            [disabled]="acting"
            (click)="showCancelModal = true">
            <i class="fas fa-times me-1"></i>{{ 'orders.detail.cancel' | translate }}
          </button>

          <button
            *ngIf="order.status === 'Delivered' || order.status === 'Closed'"
            class="btn btn-outline-primary"
            [disabled]="acting"
            (click)="reorderOrder()">
            <span *ngIf="acting" class="spinner-border spinner-border-sm me-1"></span>
            <i class="fas fa-rotate-right me-1"></i>{{ 'orders.detail.reorder' | translate }}
          </button>
        </div>
      </div>

      <!-- Right column: timeline -->
      <div class="col-lg-4">
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-transparent fw-medium">
            {{ 'orders.detail.timeline' | translate }}
          </div>
          <div class="card-body">
            <div class="order-timeline">
              <div *ngFor="let step of timelineSteps; let last = last"
                   class="timeline-step"
                   [class.completed]="step.done">
                <div class="step-icon"
                     [class.done]="step.done && !step.current"
                     [class.current]="step.current">
                  <i *ngIf="step.done && !step.current" class="fas fa-check"></i>
                  <i *ngIf="step.current" class="fas fa-circle-dot"></i>
                </div>
                <div class="step-content">
                  <div class="step-label">{{ step.labelKey | translate }}</div>
                  <div *ngIf="step.timestamp" class="step-time">
                    {{ step.timestamp | date:'medium' }}
                  </div>
                  <div *ngIf="!step.timestamp && step.done" class="step-time text-muted">—</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Cancel Modal -->
    <div *ngIf="showCancelModal" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.4);">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ 'orders.detail.cancel' | translate }}</h5>
            <button type="button" class="btn-close" (click)="showCancelModal = false"></button>
          </div>
          <form [formGroup]="cancelForm" (ngSubmit)="doCancel()">
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label small fw-medium">{{ 'orders.detail.cancelReason' | translate }}</label>
                <textarea class="form-control" formControlName="reason" rows="3"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="showCancelModal = false">Cancel</button>
              <button type="submit" class="btn btn-danger" [disabled]="acting">
                <span *ngIf="acting" class="spinner-border spinner-border-sm me-1"></span>
                Confirm Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class OrderDetailComponent implements OnInit {
  order: OrderDto | null = null;
  loading = true;
  acting = false;
  error = '';
  successMsg = '';
  showCancelModal = false;
  timelineSteps: TimelineStep[] = [];

  cancelForm = this.fb.group({ reason: [''] });

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private ordersApi: OrdersApiService,
    private auth: AuthService
  ) {}

  get canApprove(): boolean {
    return this.auth.hasRole('Admin', 'OpsManager');
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.load(id);
  }

  load(id: string): void {
    this.loading = true;
    this.ordersApi.get(id).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess) {
          this.order = res.data;
          this.buildTimeline();
        } else {
          this.error = res.message;
        }
      },
      error: (err: any) => { this.loading = false; this.error = err?.message ?? 'Failed'; }
    });
  }

  buildTimeline(): void {
    if (!this.order) return;
    const o = this.order;
    const statusOrder = ['Draft','Submitted','UnderReview','Approved','InPreparation','ReadyToShip','Shipped','Delivered'];
    const currentIdx = statusOrder.indexOf(o.status);

    this.timelineSteps = [
      { labelKey: 'orders.detail.submitted',  timestamp: o.submittedAt,  done: !!o.submittedAt,  current: o.status === 'Submitted' },
      { labelKey: 'orders.detail.approved',   timestamp: o.approvedAt,   done: !!o.approvedAt,   current: o.status === 'Approved' || o.status === 'InPreparation' || o.status === 'ReadyToShip' },
      { labelKey: 'orders.detail.shipped',    timestamp: o.shippedAt,    done: !!o.shippedAt,    current: o.status === 'Shipped' },
      { labelKey: 'orders.detail.delivered',  timestamp: o.deliveredAt,  done: !!o.deliveredAt,  current: o.status === 'Delivered' },
    ];

    if (o.status === 'Cancelled') {
      this.timelineSteps.push({ labelKey: 'orders.detail.cancelled', timestamp: o.cancelledAt, done: true, current: true });
    }
  }

  get canCancel(): boolean {
    const cancellable = ['Draft','Submitted','UnderReview','Approved'];
    return !!this.order && cancellable.includes(this.order.status);
  }

  approveOrder(): void {
    if (!this.order) return;
    this.acting = true;
    this.ordersApi.approve(this.order.id).subscribe({
      next: res => {
        this.acting = false;
        if (res.isSuccess) {
          this.successMsg = 'orders.approveSuccess';
          setTimeout(() => this.successMsg = '', 3000);
          this.load(this.order!.id);
        } else {
          this.error = res.message;
        }
      },
      error: (err: any) => { this.acting = false; this.error = err?.message ?? 'Error'; }
    });
  }

  doCancel(): void {
    if (!this.order) return;
    this.acting = true;
    const dto: CancelOrderDto = { reason: this.cancelForm.value.reason ?? undefined };
    this.ordersApi.cancel(this.order.id, dto).subscribe({
      next: res => {
        this.acting = false;
        this.showCancelModal = false;
        if (res.isSuccess) {
          this.successMsg = 'orders.cancelSuccess';
          setTimeout(() => this.successMsg = '', 3000);
          this.load(this.order!.id);
        } else {
          this.error = res.message;
        }
      },
      error: (err: any) => { this.acting = false; this.showCancelModal = false; this.error = err?.message ?? 'Error'; }
    });
  }

  reorderOrder(): void {
    if (!this.order) return;
    this.acting = true;
    this.ordersApi.reorder(this.order.id).subscribe({
      next: res => {
        this.acting = false;
        if (res.isSuccess) {
          this.router.navigate(['/admin/orders', res.data.id]);
        } else {
          this.error = res.message;
        }
      },
      error: (err: any) => { this.acting = false; this.error = err?.message ?? 'Error'; }
    });
  }

  statusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      'Draft': 'badge-draft', 'Submitted': 'badge-submitted',
      'UnderReview': 'badge-underreview', 'Approved': 'badge-approved',
      'InPreparation': 'badge-inpreparation', 'ReadyToShip': 'badge-readytoship',
      'Shipped': 'badge-shipped', 'Delivered': 'badge-delivered',
      'Closed': 'badge-closed', 'Cancelled': 'badge-cancelled'
    };
    return map[status] ?? 'badge-draft';
  }
}
