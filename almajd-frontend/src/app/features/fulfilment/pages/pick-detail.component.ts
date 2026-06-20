import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {
  FulfilmentApiService,
  PickListDetailDto,
  PickListLineDto,
  PickLineInputDto,
  MarkShortInputDto
} from '../services/fulfilment-api.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-pick-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  styles: [`
    .pick-line-card {
      border-radius: 0.5rem;
      border: 1px solid var(--border);
      padding: 1rem;
      margin-bottom: 0.75rem;
      background: var(--bg-elev);
    }
    .pick-line-card.completed { border-color: var(--success); opacity: 0.75; }
    .pick-line-card.short { border-color: var(--warning); }
    .sku-badge { font-size: 1.1rem; font-family: monospace; font-weight: 700; }
    .location-badge { font-size: 1rem; background: var(--primary-soft); color: var(--primary); padding: 0.3rem 0.75rem; border-radius: 0.375rem; font-family: monospace; }
    .qty-display { font-size: 1.5rem; font-weight: 700; }
  `],
  template: `
    <div class="page-header d-flex align-items-center justify-content-between">
      <div>
        <a [routerLink]="['/admin/fulfilment/picklists']" class="btn btn-sm btn-outline-secondary me-2">
          <i class="fas fa-arrow-left"></i>
        </a>
        <span>{{ 'fulfilment.picklists.detail' | translate }}</span>
        <span *ngIf="pick" class="ms-2">
          <span class="badge" [class]="pickStatusClass(pick.status)">{{ pick.status }}</span>
        </span>
      </div>
      <div class="d-flex gap-2" *ngIf="pick">
        <button *ngIf="pick.status === 'InProgress' || pick.status === 'Pending'"
                class="btn btn-success btn-sm"
                [disabled]="actionLoading"
                (click)="completePickList()">
          <i class="fas fa-check me-1"></i>{{ 'fulfilment.picklists.complete' | translate }}
        </button>
        <button *ngIf="canCancel && pick.status !== 'Completed' && pick.status !== 'Cancelled'"
                class="btn btn-outline-danger btn-sm"
                [disabled]="actionLoading"
                (click)="cancelPickList()">
          {{ 'fulfilment.picklists.cancel' | translate }}
        </button>
      </div>
    </div>

    <div *ngIf="loading" class="text-center py-4">
      <div class="spinner-border" style="color: var(--primary);"></div>
    </div>

    <div *ngIf="error" class="alert alert-danger">{{ error }}</div>

    <div *ngIf="pick && !loading">
      <!-- Header summary -->
      <div class="card border-0 shadow-sm mb-3">
        <div class="card-body">
          <div class="row g-3">
            <div class="col-sm-3">
              <div class="small text-muted">{{ 'orders.number' | translate }}</div>
              <div class="fw-medium font-monospace">{{ pick.orderNumber }}</div>
            </div>
            <div class="col-sm-3">
              <div class="small text-muted">{{ 'orders.customer' | translate }}</div>
              <div>{{ pick.customerName }}</div>
            </div>
            <div class="col-sm-3">
              <div class="small text-muted">{{ 'fulfilment.picklists.progress' | translate }}</div>
              <div>
                <span class="fw-bold">{{ pick.completedLines }}/{{ pick.totalLines }}</span>
                <div class="progress mt-1" style="height:6px">
                  <div class="progress-bar bg-primary"
                       [style.width]="pick.totalLines > 0 ? (pick.completedLines / pick.totalLines * 100) + '%' : '0%'"></div>
                </div>
              </div>
            </div>
            <div class="col-sm-3">
              <div class="small text-muted">{{ 'fulfilment.picklists.picker' | translate }}</div>
              <div>{{ pick.pickedByName || '—' }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Lines - tablet-first card layout -->
      <div *ngFor="let line of pick.lines"
           class="pick-line-card"
           [class.completed]="line.isComplete"
           [class.short]="line.isShort">
        <div class="row g-3 align-items-center">
          <div class="col-md-5">
            <div class="sku-badge text-primary">{{ line.skuCode }}</div>
            <div class="small text-muted mt-1">{{ line.productName }}</div>
            <div class="small text-muted mt-1">{{ 'inventory.stock.barcode' | translate }}: {{ line.barcode }}</div>
            <div class="mt-2">
              <span class="location-badge">
                <i class="fas fa-location-dot me-1"></i>{{ line.locationAddress }}
              </span>
            </div>
          </div>
          <div class="col-md-3 text-center">
            <div class="small text-muted">{{ 'fulfilment.pick.requested' | translate }} / {{ 'fulfilment.pick.picked' | translate }}</div>
            <div class="qty-display">{{ line.pickedQty }}<span class="text-muted fs-5">/{{ line.requestedQty }}</span></div>
            <span *ngIf="line.isShort" class="badge badge-underreview mt-1">
              <i class="fas fa-exclamation-triangle me-1"></i>{{ 'fulfilment.pick.short' | translate }}
            </span>
            <span *ngIf="line.isComplete && !line.isShort" class="badge badge-delivered mt-1">
              <i class="fas fa-check me-1"></i>{{ 'fulfilment.pick.done' | translate }}
            </span>
          </div>
          <div class="col-md-4 d-flex gap-2 justify-content-end flex-wrap" *ngIf="pick.status !== 'Completed' && pick.status !== 'Cancelled'">
            <button *ngIf="!line.isComplete"
                    class="btn btn-primary"
                    (click)="openPickModal(line)"
                    [disabled]="actionLoading">
              <i class="fas fa-barcode me-1"></i>{{ 'fulfilment.pick.scan' | translate }}
            </button>
            <button *ngIf="!line.isShort && !line.isComplete"
                    class="btn btn-outline-warning"
                    (click)="openShortModal(line)"
                    [disabled]="actionLoading">
              {{ 'fulfilment.pick.markShort' | translate }}
            </button>
          </div>
        </div>
        <div *ngIf="line.shortReason" class="mt-2 small text-muted">
          <i class="fas fa-info-circle me-1"></i>{{ 'fulfilment.pick.shortReason' | translate }}: {{ line.shortReason }}
        </div>
      </div>
    </div>

    <!-- Scan & Pick Modal -->
    <div *ngIf="showPickModal && activeLine" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="fas fa-barcode me-2"></i>{{ 'fulfilment.pick.scan' | translate }} — {{ activeLine.skuCode }}
            </h5>
            <button type="button" class="btn-close" (click)="showPickModal = false"></button>
          </div>
          <div class="modal-body">
            <div *ngIf="pickModalError" class="alert alert-danger">
              <i class="fas fa-triangle-exclamation me-2"></i>{{ pickModalError }}
            </div>

            <!-- Expected values hint -->
            <div class="alert alert-info small mb-3">
              <strong>{{ 'fulfilment.pick.expected' | translate }}:</strong>
              {{ 'inventory.stock.sku' | translate }}: <code>{{ activeLine.skuCode }}</code> /
              {{ 'inventory.stock.barcode' | translate }}: <code>{{ activeLine.barcode }}</code> |
              {{ 'inventory.stock.location' | translate }}: <code>{{ activeLine.locationAddress }}</code>
            </div>

            <form [formGroup]="pickForm">
              <div class="mb-4">
                <label class="form-label fw-semibold">{{ 'fulfilment.pick.scannedSku' | translate }} *</label>
                <input type="text" class="form-control form-control-lg" formControlName="scannedSku"
                       [placeholder]="'fulfilment.pick.scanSkuPlaceholder' | translate"
                       autofocus>
                <small *ngIf="pickForm.get('scannedSku')?.invalid && pickForm.get('scannedSku')?.touched" class="text-danger">
                  {{ 'fulfilment.pick.scannedSkuRequired' | translate }}
                </small>
              </div>
              <div class="mb-4">
                <label class="form-label fw-semibold">{{ 'fulfilment.pick.scannedLocation' | translate }} *</label>
                <input type="text" class="form-control form-control-lg" formControlName="scannedLocation"
                       [placeholder]="'fulfilment.pick.scanLocationPlaceholder' | translate">
                <small *ngIf="pickForm.get('scannedLocation')?.invalid && pickForm.get('scannedLocation')?.touched" class="text-danger">
                  {{ 'fulfilment.pick.scannedLocationRequired' | translate }}
                </small>
              </div>
              <div class="mb-4">
                <label class="form-label fw-semibold">
                  {{ 'inventory.stock.quantity' | translate }} *
                  <small class="text-muted">({{ 'fulfilment.pick.max' | translate }}: {{ activeLine.requestedQty - activeLine.pickedQty }})</small>
                </label>
                <input type="number" class="form-control form-control-lg" formControlName="qty"
                       [min]="1" [max]="activeLine.requestedQty - activeLine.pickedQty">
                <small *ngIf="pickForm.get('qty')?.invalid && pickForm.get('qty')?.touched" class="text-danger">
                  {{ 'fulfilment.pick.qtyRequired' | translate }}
                </small>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" (click)="showPickModal = false">{{ 'common.cancel' | translate }}</button>
            <button type="button" class="btn btn-primary btn-lg" [disabled]="actionLoading" (click)="submitPick()">
              <span *ngIf="actionLoading" class="spinner-border spinner-border-sm me-1"></span>
              <i *ngIf="!actionLoading" class="fas fa-check me-1"></i>
              {{ 'fulfilment.pick.confirm' | translate }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Mark Short Modal -->
    <div *ngIf="showShortModal && activeLine" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ 'fulfilment.pick.markShort' | translate }} — {{ activeLine.skuCode }}</h5>
            <button type="button" class="btn-close" (click)="showShortModal = false"></button>
          </div>
          <div class="modal-body">
            <div *ngIf="shortModalError" class="alert alert-danger">{{ shortModalError }}</div>
            <form [formGroup]="shortForm">
              <div class="mb-3">
                <label class="form-label">{{ 'fulfilment.pick.shortReason' | translate }}</label>
                <textarea class="form-control" formControlName="reason" rows="3" maxlength="512"></textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" (click)="showShortModal = false">{{ 'common.cancel' | translate }}</button>
            <button type="button" class="btn btn-warning text-white" [disabled]="actionLoading" (click)="submitShort()">
              <span *ngIf="actionLoading" class="spinner-border spinner-border-sm me-1"></span>
              {{ 'fulfilment.pick.markShort' | translate }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class PickDetailComponent implements OnInit {
  pick: PickListDetailDto | null = null;
  loading = true;
  error = '';
  actionLoading = false;
  pickId = '';

  showPickModal = false;
  showShortModal = false;
  activeLine: PickListLineDto | null = null;
  pickModalError = '';
  shortModalError = '';

  pickForm = this.fb.group({
    scannedSku: ['', Validators.required],
    scannedLocation: ['', Validators.required],
    qty: [1, [Validators.required, Validators.min(1)]]
  });

  shortForm = this.fb.group({
    reason: ['']
  });

  constructor(
    private fb: FormBuilder,
    private fulfilmentApi: FulfilmentApiService,
    private route: ActivatedRoute,
    private auth: AuthService
  ) {}

  get canCancel(): boolean {
    return this.auth.hasRole('Admin', 'WarehouseManager');
  }

  ngOnInit(): void {
    this.pickId = this.route.snapshot.paramMap.get('id') ?? '';
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.fulfilmentApi.getPickList(this.pickId).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess && res.data) this.pick = res.data;
        else this.error = res.message;
      },
      error: (err) => { this.loading = false; this.error = err?.message ?? 'Error'; }
    });
  }

  openPickModal(line: PickListLineDto): void {
    this.activeLine = line;
    this.pickModalError = '';
    const remaining = line.requestedQty - line.pickedQty;
    this.pickForm.reset({ scannedSku: '', scannedLocation: '', qty: remaining });
    this.showPickModal = true;
  }

  submitPick(): void {
    if (this.pickForm.invalid) { this.pickForm.markAllAsTouched(); return; }
    if (!this.activeLine) return;
    this.actionLoading = true; this.pickModalError = '';
    const v = this.pickForm.value;
    const dto: PickLineInputDto = {
      qty: v.qty!,
      scannedSku: v.scannedSku!,
      scannedLocation: v.scannedLocation!
    };
    this.fulfilmentApi.pickLine(this.activeLine.id, dto).subscribe({
      next: res => {
        this.actionLoading = false;
        if (res.isSuccess) { this.showPickModal = false; this.load(); }
        else { this.pickModalError = res.message; }
      },
      error: (err) => {
        this.actionLoading = false;
        // Surface 409 (scan mismatch) errors prominently
        this.pickModalError = err?.message ?? 'Error. Check scanned SKU and location.';
      }
    });
  }

  openShortModal(line: PickListLineDto): void {
    this.activeLine = line;
    this.shortModalError = '';
    this.shortForm.reset({ reason: '' });
    this.showShortModal = true;
  }

  submitShort(): void {
    if (!this.activeLine) return;
    this.actionLoading = true; this.shortModalError = '';
    const dto: MarkShortInputDto = { reason: this.shortForm.value.reason || undefined };
    this.fulfilmentApi.markShort(this.activeLine.id, dto).subscribe({
      next: res => {
        this.actionLoading = false;
        if (res.isSuccess) { this.showShortModal = false; this.load(); }
        else { this.shortModalError = res.message; }
      },
      error: (err) => { this.actionLoading = false; this.shortModalError = err?.message ?? 'Error'; }
    });
  }

  completePickList(): void {
    if (!confirm('Complete this pick list?')) return;
    this.actionLoading = true; this.error = '';
    this.fulfilmentApi.completePickList(this.pickId).subscribe({
      next: res => {
        this.actionLoading = false;
        if (res.isSuccess) this.load();
        else this.error = res.message;
      },
      error: (err) => { this.actionLoading = false; this.error = err?.message ?? 'Error'; }
    });
  }

  cancelPickList(): void {
    if (!confirm('Cancel this pick list?')) return;
    this.actionLoading = true; this.error = '';
    this.fulfilmentApi.cancelPickList(this.pickId).subscribe({
      next: res => {
        this.actionLoading = false;
        if (res.isSuccess) this.load();
        else this.error = res.message;
      },
      error: (err) => { this.actionLoading = false; this.error = err?.message ?? 'Error'; }
    });
  }

  pickStatusClass(status: string): string {
    const map: Record<string, string> = {
      'Pending': 'badge-draft',
      'InProgress': 'badge-inpreparation',
      'Completed': 'badge-delivered',
      'ShortPicked': 'badge-underreview',
      'Cancelled': 'badge-cancelled'
    };
    return map[status] ?? 'badge-draft';
  }
}
