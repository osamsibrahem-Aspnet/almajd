import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {
  FulfilmentApiService,
  ShipmentDto,
  AssignDriverDto,
  DeliverDto,
  CancelShipmentDto
} from '../services/fulfilment-api.service';

@Component({
  selector: 'app-shipment-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="page-header d-flex align-items-center justify-content-between">
      <div>
        <a [routerLink]="['/admin/fulfilment/shipments']" class="btn btn-sm btn-outline-secondary me-2">
          <i class="fas fa-arrow-left"></i>
        </a>
        <span>{{ 'fulfilment.shipments.detail' | translate }}</span>
        <span *ngIf="shipment" class="ms-2">
          <span class="badge" [class]="statusClass(shipment.status)">{{ shipment.status }}</span>
        </span>
      </div>
      <div class="d-flex gap-2" *ngIf="shipment">
        <button *ngIf="shipment.status === 'Pending' && shipment.driverName"
                class="btn btn-sm btn-primary"
                [disabled]="actionLoading"
                (click)="dispatch()">
          <i class="fas fa-truck me-1"></i>{{ 'fulfilment.shipments.dispatch' | translate }}
        </button>
        <button *ngIf="shipment.status === 'Dispatched'"
                class="btn btn-sm btn-success"
                [disabled]="actionLoading"
                (click)="openDeliverModal()">
          <i class="fas fa-check me-1"></i>{{ 'fulfilment.shipments.deliver' | translate }}
        </button>
        <button *ngIf="shipment.status === 'Pending'"
                class="btn btn-sm btn-outline-danger"
                [disabled]="actionLoading"
                (click)="openCancelModal()">
          {{ 'fulfilment.shipments.cancel' | translate }}
        </button>
      </div>
    </div>

    <div *ngIf="loading" class="text-center py-4">
      <div class="spinner-border" style="color: var(--primary);"></div>
    </div>

    <div *ngIf="error" class="alert alert-danger">{{ error }}</div>
    <div *ngIf="successMsg" class="alert alert-success">{{ successMsg }}</div>

    <div *ngIf="shipment && !loading">
      <div class="row g-3">
        <!-- Shipment Info -->
        <div class="col-md-6">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent fw-semibold">{{ 'fulfilment.shipments.info' | translate }}</div>
            <div class="card-body">
              <dl class="row mb-0">
                <dt class="col-5 small text-muted">{{ 'fulfilment.shipments.number' | translate }}</dt>
                <dd class="col-7 fw-medium font-monospace">{{ shipment.number }}</dd>
                <dt class="col-5 small text-muted">{{ 'orders.number' | translate }}</dt>
                <dd class="col-7">{{ shipment.orderNumber }}</dd>
                <dt class="col-5 small text-muted">{{ 'orders.customer' | translate }}</dt>
                <dd class="col-7">{{ shipment.customerName }}</dd>
                <dt class="col-5 small text-muted">{{ 'fulfilment.shipments.carrier' | translate }}</dt>
                <dd class="col-7">{{ shipment.carrier || '—' }}</dd>
                <dt class="col-5 small text-muted">{{ 'fulfilment.shipments.waybill' | translate }}</dt>
                <dd class="col-7 font-monospace small">{{ shipment.waybill || '—' }}</dd>
                <dt class="col-5 small text-muted">{{ 'fulfilment.shipments.dispatchedAt' | translate }}</dt>
                <dd class="col-7">{{ shipment.dispatchedAt ? (shipment.dispatchedAt | date:'medium') : '—' }}</dd>
                <dt class="col-5 small text-muted">{{ 'fulfilment.shipments.deliveredAt' | translate }}</dt>
                <dd class="col-7">{{ shipment.deliveredAt ? (shipment.deliveredAt | date:'medium') : '—' }}</dd>
              </dl>
            </div>
          </div>
        </div>

        <!-- Driver & POD -->
        <div class="col-md-6">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent fw-semibold d-flex justify-content-between align-items-center">
              {{ 'fulfilment.shipments.driverInfo' | translate }}
              <button *ngIf="shipment.status === 'Pending'"
                      class="btn btn-sm btn-outline-primary"
                      (click)="openDriverModal()">
                <i class="fas fa-pen me-1"></i>{{ 'fulfilment.shipments.assignDriver' | translate }}
              </button>
            </div>
            <div class="card-body">
              <dl class="row mb-0">
                <dt class="col-5 small text-muted">{{ 'fulfilment.shipments.driver' | translate }}</dt>
                <dd class="col-7">{{ shipment.driverName || '—' }}</dd>
                <dt class="col-5 small text-muted">{{ 'fulfilment.shipments.driverPhone' | translate }}</dt>
                <dd class="col-7">{{ shipment.driverPhone || '—' }}</dd>
              </dl>
              <div *ngIf="shipment.status === 'Delivered'" class="mt-3 pt-3 border-top">
                <div class="small text-muted mb-1">{{ 'fulfilment.shipments.podSigner' | translate }}</div>
                <div class="fw-medium">{{ shipment.podSignerName }}</div>
                <div *ngIf="shipment.podUrl" class="mt-2">
                  <a [href]="shipment.podUrl" target="_blank" class="btn btn-sm btn-outline-secondary">
                    <i class="fas fa-file me-1"></i>{{ 'fulfilment.shipments.viewPod' | translate }}
                  </a>
                </div>
              </div>
              <div *ngIf="shipment.notes" class="mt-3 pt-3 border-top">
                <div class="small text-muted">{{ 'inventory.stock.notes' | translate }}</div>
                <div class="small">{{ shipment.notes }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Assign Driver Modal -->
    <div *ngIf="showDriverModal" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ 'fulfilment.shipments.assignDriver' | translate }}</h5>
            <button type="button" class="btn-close" (click)="showDriverModal = false"></button>
          </div>
          <div class="modal-body">
            <div *ngIf="modalError" class="alert alert-danger">{{ modalError }}</div>
            <form [formGroup]="driverForm">
              <div class="mb-3">
                <label class="form-label">{{ 'fulfilment.shipments.driver' | translate }} *</label>
                <input type="text" class="form-control" formControlName="driverName" maxlength="128">
                <small *ngIf="driverForm.get('driverName')?.invalid && driverForm.get('driverName')?.touched" class="text-danger">
                  {{ 'fulfilment.shipments.driverRequired' | translate }}
                </small>
              </div>
              <div class="mb-3">
                <label class="form-label">{{ 'fulfilment.shipments.driverPhone' | translate }}</label>
                <input type="tel" class="form-control" formControlName="driverPhone" maxlength="32">
              </div>
              <div class="mb-3">
                <label class="form-label">{{ 'fulfilment.shipments.carrier' | translate }}</label>
                <input type="text" class="form-control" formControlName="carrier" maxlength="128">
              </div>
              <div class="mb-3">
                <label class="form-label">{{ 'fulfilment.shipments.waybill' | translate }}</label>
                <input type="text" class="form-control" formControlName="waybill" maxlength="128">
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" (click)="showDriverModal = false">{{ 'common.cancel' | translate }}</button>
            <button type="button" class="btn btn-primary" [disabled]="actionLoading" (click)="submitDriver()">
              <span *ngIf="actionLoading" class="spinner-border spinner-border-sm me-1"></span>
              {{ 'common.save' | translate }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Deliver Modal -->
    <div *ngIf="showDeliverModal" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ 'fulfilment.shipments.deliver' | translate }}</h5>
            <button type="button" class="btn-close" (click)="showDeliverModal = false"></button>
          </div>
          <div class="modal-body">
            <div *ngIf="modalError" class="alert alert-danger">{{ modalError }}</div>
            <form [formGroup]="deliverForm">
              <div class="mb-3">
                <label class="form-label">{{ 'fulfilment.shipments.podSigner' | translate }} *</label>
                <input type="text" class="form-control" formControlName="podSignerName" maxlength="128">
                <small *ngIf="deliverForm.get('podSignerName')?.invalid && deliverForm.get('podSignerName')?.touched" class="text-danger">
                  {{ 'fulfilment.shipments.podSignerRequired' | translate }}
                </small>
              </div>
              <div class="mb-3">
                <label class="form-label">{{ 'fulfilment.shipments.podUrl' | translate }}</label>
                <input type="url" class="form-control" formControlName="podUrl" maxlength="1024">
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" (click)="showDeliverModal = false">{{ 'common.cancel' | translate }}</button>
            <button type="button" class="btn btn-success" [disabled]="actionLoading" (click)="submitDeliver()">
              <span *ngIf="actionLoading" class="spinner-border spinner-border-sm me-1"></span>
              {{ 'fulfilment.shipments.confirmDelivery' | translate }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Cancel Modal -->
    <div *ngIf="showCancelModal" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ 'fulfilment.shipments.cancel' | translate }}</h5>
            <button type="button" class="btn-close" (click)="showCancelModal = false"></button>
          </div>
          <div class="modal-body">
            <div *ngIf="modalError" class="alert alert-danger">{{ modalError }}</div>
            <form [formGroup]="cancelForm">
              <div class="mb-3">
                <label class="form-label">{{ 'fulfilment.shipments.cancelReason' | translate }}</label>
                <textarea class="form-control" formControlName="reason" rows="3" maxlength="512"></textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" (click)="showCancelModal = false">{{ 'common.cancel' | translate }}</button>
            <button type="button" class="btn btn-danger" [disabled]="actionLoading" (click)="submitCancel()">
              <span *ngIf="actionLoading" class="spinner-border spinner-border-sm me-1"></span>
              {{ 'fulfilment.shipments.cancel' | translate }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ShipmentDetailComponent implements OnInit {
  shipment: ShipmentDto | null = null;
  loading = true;
  error = '';
  successMsg = '';
  actionLoading = false;
  shipmentId = '';

  showDriverModal = false;
  showDeliverModal = false;
  showCancelModal = false;
  modalError = '';

  driverForm = this.fb.group({
    driverName: ['', Validators.required],
    driverPhone: [''],
    carrier: [''],
    waybill: ['']
  });

  deliverForm = this.fb.group({
    podSignerName: ['', Validators.required],
    podUrl: ['']
  });

  cancelForm = this.fb.group({
    reason: ['']
  });

  constructor(
    private fb: FormBuilder,
    private fulfilmentApi: FulfilmentApiService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.shipmentId = this.route.snapshot.paramMap.get('id') ?? '';
    this.load();
  }

  load(): void {
    this.loading = true; this.error = '';
    this.fulfilmentApi.getShipment(this.shipmentId).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess && res.data) this.shipment = res.data;
        else this.error = res.message;
      },
      error: (err) => { this.loading = false; this.error = err?.message ?? 'Error'; }
    });
  }

  openDriverModal(): void {
    if (!this.shipment) return;
    this.modalError = '';
    this.driverForm.patchValue({
      driverName: this.shipment.driverName ?? '',
      driverPhone: this.shipment.driverPhone ?? '',
      carrier: this.shipment.carrier ?? '',
      waybill: this.shipment.waybill ?? ''
    });
    this.showDriverModal = true;
  }

  submitDriver(): void {
    if (this.driverForm.invalid) { this.driverForm.markAllAsTouched(); return; }
    this.actionLoading = true; this.modalError = '';
    const v = this.driverForm.value;
    const dto: AssignDriverDto = {
      driverName: v.driverName!,
      driverPhone: v.driverPhone || undefined,
      carrier: v.carrier || undefined,
      waybill: v.waybill || undefined
    };
    this.fulfilmentApi.assignDriver(this.shipmentId, dto).subscribe({
      next: res => {
        this.actionLoading = false;
        if (res.isSuccess) { this.showDriverModal = false; this.load(); }
        else { this.modalError = res.message; }
      },
      error: (err) => { this.actionLoading = false; this.modalError = err?.message ?? 'Error'; }
    });
  }

  dispatch(): void {
    if (!confirm('Dispatch this shipment?')) return;
    this.actionLoading = true; this.error = '';
    this.fulfilmentApi.dispatch(this.shipmentId).subscribe({
      next: res => {
        this.actionLoading = false;
        if (res.isSuccess) { this.successMsg = 'Shipment dispatched.'; this.load(); }
        else { this.error = res.message; }
      },
      error: (err) => { this.actionLoading = false; this.error = err?.message ?? 'Error'; }
    });
  }

  openDeliverModal(): void {
    this.modalError = '';
    this.deliverForm.reset();
    this.showDeliverModal = true;
  }

  submitDeliver(): void {
    if (this.deliverForm.invalid) { this.deliverForm.markAllAsTouched(); return; }
    this.actionLoading = true; this.modalError = '';
    const v = this.deliverForm.value;
    const dto: DeliverDto = { podSignerName: v.podSignerName!, podUrl: v.podUrl || undefined };
    this.fulfilmentApi.deliver(this.shipmentId, dto).subscribe({
      next: res => {
        this.actionLoading = false;
        if (res.isSuccess) { this.showDeliverModal = false; this.successMsg = 'Delivery confirmed.'; this.load(); }
        else { this.modalError = res.message; }
      },
      error: (err) => { this.actionLoading = false; this.modalError = err?.message ?? 'Error'; }
    });
  }

  openCancelModal(): void {
    this.modalError = '';
    this.cancelForm.reset();
    this.showCancelModal = true;
  }

  submitCancel(): void {
    this.actionLoading = true; this.modalError = '';
    const dto: CancelShipmentDto = { reason: this.cancelForm.value.reason || undefined };
    this.fulfilmentApi.cancelShipment(this.shipmentId, dto).subscribe({
      next: res => {
        this.actionLoading = false;
        if (res.isSuccess) { this.showCancelModal = false; this.load(); }
        else { this.modalError = res.message; }
      },
      error: (err) => { this.actionLoading = false; this.modalError = err?.message ?? 'Error'; }
    });
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      'Pending': 'badge-draft',
      'Dispatched': 'badge-shipped',
      'Delivered': 'badge-delivered',
      'Cancelled': 'badge-cancelled'
    };
    return map[status] ?? 'badge-draft';
  }
}
