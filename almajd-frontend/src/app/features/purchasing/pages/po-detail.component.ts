import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  PurchasingApiService,
  PurchaseOrderDto,
  PurchaseOrderUpdateDto,
  PoLineInputDto,
  CancelPoDto
} from '../services/purchasing-api.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-po-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="page-header d-flex justify-content-between align-items-center">
      <div>
        <a routerLink="/admin/purchasing/purchase-orders" class="text-muted text-decoration-none small">
          <i class="fas fa-arrow-left me-1"></i>{{ 'purchasing.po.title' | translate }}
        </a>
        <h2 class="mt-1">
          {{ po?.number ?? ('common.loading' | translate) }}
          <span *ngIf="po" class="badge ms-2 fs-6" [class]="poStatusBadge(po.status)">{{ po.status }}</span>
        </h2>
      </div>
    </div>

    <div *ngIf="loading" class="text-center py-5">
      <div class="spinner-border" style="color: var(--primary);"></div>
    </div>
    <div *ngIf="error" class="alert alert-danger">{{ error }}</div>
    <div *ngIf="successMsg" class="alert alert-success py-2">{{ successMsg }}</div>

    <div *ngIf="po && !loading" class="row g-3">
      <div class="col-lg-8">
        <!-- Header card -->
        <div class="card border-0 shadow-sm mb-3">
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-6">
                <table class="table table-sm table-borderless mb-0">
                  <tr><td class="text-muted small fw-medium" style="width:140px;">{{ 'purchasing.suppliers.name' | translate }}</td><td class="fw-medium">{{ po.supplierName }}</td></tr>
                  <tr><td class="text-muted small fw-medium">{{ 'purchasing.po.currency' | translate }}</td><td>{{ po.currency }}</td></tr>
                  <tr><td class="text-muted small fw-medium">{{ 'purchasing.po.expectedAt' | translate }}</td><td>{{ po.expectedAt ? (po.expectedAt | date:'mediumDate') : '—' }}</td></tr>
                </table>
              </div>
              <div class="col-md-6">
                <table class="table table-sm table-borderless mb-0">
                  <tr><td class="text-muted small fw-medium" style="width:140px;">{{ 'common.createdAt' | translate }}</td><td class="small">{{ po.createdAt | date:'medium' }}</td></tr>
                  <tr *ngIf="po.submittedAt"><td class="text-muted small fw-medium">{{ 'purchasing.po.submittedAt' | translate }}</td><td class="small">{{ po.submittedAt | date:'medium' }}</td></tr>
                  <tr *ngIf="po.approvedAt"><td class="text-muted small fw-medium">{{ 'purchasing.po.approvedAt' | translate }}</td><td class="small">{{ po.approvedAt | date:'medium' }}</td></tr>
                  <tr *ngIf="po.cancellationReason"><td class="text-muted small fw-medium">{{ 'purchasing.po.cancelReason' | translate }}</td><td class="small text-danger">{{ po.cancellationReason }}</td></tr>
                </table>
              </div>
              <div class="col-12" *ngIf="po.notes">
                <label class="text-muted small fw-medium">{{ 'inventory.counts.notes' | translate }}</label>
                <p class="mb-0 small">{{ po.notes }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Lines -->
        <div class="card border-0 shadow-sm mb-3">
          <div class="card-header bg-transparent d-flex justify-content-between align-items-center">
            <span class="fw-medium">{{ 'purchasing.po.lines' | translate }} ({{ po.lines.length }})</span>
            <span class="fw-bold">{{ po.currency }} {{ po.total | number:'1.2-2' }}</span>
          </div>
          <div class="table-responsive">
            <table class="table table-hover mb-0">
              <thead class="table-light">
                <tr>
                  <th>{{ 'purchasing.suppliers.skuCode' | translate }}</th>
                  <th>{{ 'catalog.products.name' | translate }}</th>
                  <th class="text-center">{{ 'purchasing.po.orderedQty' | translate }}</th>
                  <th class="text-center">{{ 'purchasing.po.receivedQty' | translate }}</th>
                  <th class="text-end">{{ 'purchasing.suppliers.costPrice' | translate }}</th>
                  <th class="text-end">{{ 'purchasing.po.lineTotal' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngIf="po.lines.length === 0">
                  <td colspan="6" class="text-center text-muted py-3">{{ 'common.noData' | translate }}</td>
                </tr>
                <tr *ngFor="let line of po.lines">
                  <td class="font-monospace small">{{ line.skuCode }}</td>
                  <td class="small">{{ line.productName }}</td>
                  <td class="text-center">{{ line.qty }}</td>
                  <td class="text-center">
                    <span [class.text-success]="line.receivedQty >= line.qty"
                          [class.text-warning]="line.receivedQty > 0 && line.receivedQty < line.qty">
                      {{ line.receivedQty }}
                    </span>
                  </td>
                  <td class="text-end small">{{ po.currency }} {{ line.costPrice | number:'1.2-2' }}</td>
                  <td class="text-end fw-medium">{{ line.lineTotal | number:'1.2-2' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="d-flex flex-wrap gap-2">
          <a *ngIf="po.status === 'Draft' && canEdit"
             [routerLink]="['/admin/purchasing/purchase-orders', po.id, 'edit']"
             class="btn btn-outline-primary">
            <i class="fas fa-edit me-1"></i>{{ 'common.edit' | translate }}
          </a>

          <button *ngIf="po.status === 'Draft' && canSubmit"
                  class="btn btn-warning"
                  [disabled]="acting"
                  (click)="submitPO()">
            <span *ngIf="acting" class="spinner-border spinner-border-sm me-1"></span>
            <i class="fas fa-paper-plane me-1"></i>{{ 'purchasing.po.submit' | translate }}
          </button>

          <button *ngIf="po.status === 'Submitted' && canApprove"
                  class="btn btn-success"
                  [disabled]="acting"
                  (click)="approvePO()">
            <span *ngIf="acting" class="spinner-border spinner-border-sm me-1"></span>
            <i class="fas fa-check me-1"></i>{{ 'purchasing.po.approve' | translate }}
          </button>

          <a *ngIf="(po.status === 'Approved' || po.status === 'PartiallyReceived') && canReceive"
             [routerLink]="['/admin/purchasing/goods-receipts/new']"
             [queryParams]="{ poId: po.id }"
             class="btn btn-primary">
            <i class="fas fa-truck-ramp-box me-1"></i>{{ 'purchasing.gr.receive' | translate }}
          </a>

          <button *ngIf="canCancel"
                  class="btn btn-danger"
                  [disabled]="acting"
                  (click)="showCancelModal = true">
            <i class="fas fa-times me-1"></i>{{ 'purchasing.po.cancel' | translate }}
          </button>
        </div>
      </div>

      <!-- Right sidebar summary -->
      <div class="col-lg-4">
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-transparent fw-medium">{{ 'purchasing.po.summary' | translate }}</div>
          <div class="card-body">
            <div class="d-flex justify-content-between mb-2">
              <span class="text-muted small">{{ 'purchasing.po.lines' | translate }}</span>
              <span>{{ po.lineCount }}</span>
            </div>
            <div class="d-flex justify-content-between border-top pt-2">
              <span class="fw-semibold">{{ 'purchasing.po.total' | translate }}</span>
              <span class="fw-bold fs-5">{{ po.currency }} {{ po.total | number:'1.2-2' }}</span>
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
            <h5 class="modal-title">{{ 'purchasing.po.cancel' | translate }}</h5>
            <button type="button" class="btn-close" (click)="showCancelModal = false"></button>
          </div>
          <form [formGroup]="cancelForm" (ngSubmit)="doCancelPO()">
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label small fw-medium">{{ 'purchasing.po.cancelReason' | translate }}</label>
                <textarea class="form-control" formControlName="reason" rows="3"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary btn-sm" (click)="showCancelModal = false">{{ 'common.cancel' | translate }}</button>
              <button type="submit" class="btn btn-danger btn-sm" [disabled]="acting">
                <span *ngIf="acting" class="spinner-border spinner-border-sm me-1"></span>
                {{ 'common.confirm' | translate }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class PoDetailComponent implements OnInit {
  po: PurchaseOrderDto | null = null;
  loading = true;
  acting = false;
  error = '';
  successMsg = '';
  showCancelModal = false;

  cancelForm = this.fb.group({ reason: [''] });

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private purchasingApi: PurchasingApiService,
    private auth: AuthService
  ) {}

  get canEdit(): boolean       { return this.auth.hasRole('Admin', 'Procurement'); }
  get canSubmit(): boolean     { return this.auth.hasRole('Admin', 'Procurement'); }
  get canApprove(): boolean    { return this.auth.hasRole('Admin', 'OpsManager'); }
  get canReceive(): boolean    { return this.auth.hasRole('Admin', 'Procurement', 'WarehouseManager', 'WarehouseOperator'); }
  get canCancelRole(): boolean { return this.auth.hasRole('Admin', 'Procurement', 'OpsManager'); }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.load(id);
  }

  load(id: string): void {
    this.loading = true;
    this.purchasingApi.getPO(id).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess) this.po = res.data;
        else this.error = res.message;
      },
      error: (err: any) => { this.loading = false; this.error = err?.message ?? 'Error'; }
    });
  }

  get canCancel(): boolean {
    return !!this.po && this.canCancelRole && ['Draft', 'Submitted', 'Approved'].includes(this.po.status);
  }

  submitPO(): void {
    if (!this.po) return;
    this.acting = true;
    this.purchasingApi.submitPO(this.po.id).subscribe({
      next: res => {
        this.acting = false;
        if (res.isSuccess) { this.successMsg = 'purchasing.po.submitSuccess'; setTimeout(() => this.successMsg = '', 3000); this.load(this.po!.id); }
        else this.error = res.message;
      },
      error: (err: any) => { this.acting = false; this.error = err?.message ?? 'Error'; }
    });
  }

  approvePO(): void {
    if (!this.po) return;
    this.acting = true;
    this.purchasingApi.approvePO(this.po.id).subscribe({
      next: res => {
        this.acting = false;
        if (res.isSuccess) { this.successMsg = 'purchasing.po.approveSuccess'; setTimeout(() => this.successMsg = '', 3000); this.load(this.po!.id); }
        else this.error = res.message;
      },
      error: (err: any) => { this.acting = false; this.error = err?.message ?? 'Error'; }
    });
  }

  doCancelPO(): void {
    if (!this.po) return;
    this.acting = true;
    const dto: CancelPoDto = { reason: this.cancelForm.value.reason ?? undefined };
    this.purchasingApi.cancelPO(this.po.id, dto).subscribe({
      next: res => {
        this.acting = false;
        this.showCancelModal = false;
        if (res.isSuccess) { this.successMsg = 'purchasing.po.cancelSuccess'; setTimeout(() => this.successMsg = '', 3000); this.load(this.po!.id); }
        else this.error = res.message;
      },
      error: (err: any) => { this.acting = false; this.showCancelModal = false; this.error = err?.message ?? 'Error'; }
    });
  }

  poStatusBadge(status: string): string {
    const map: Record<string, string> = {
      'Draft': 'badge-draft', 'Submitted': 'badge-submitted', 'Approved': 'badge-approved',
      'PartiallyReceived': 'badge-inpreparation', 'FullyReceived': 'badge-delivered', 'Cancelled': 'badge-cancelled'
    };
    return map[status] ?? 'badge-draft';
  }
}
