import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AccountApiService, CustomerAddress } from '../services/account-api.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-addresses',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  styles: [`
    .address-card {
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      padding: 1rem;
      background: var(--bg-elev);
    }
    .address-card.default-addr { border-color: var(--primary); }
    .kind-badge { font-size: 0.75rem; }
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.45);
      z-index: 1050;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .modal-box {
      background: var(--bg-elev);
      border-radius: 0.5rem;
      padding: 1.5rem;
      width: 100%;
      max-width: 480px;
    }
  `],
  template: `
    <div class="page-header d-flex justify-content-between align-items-center">
      <h2>{{ 'account.addresses' | translate }}</h2>
      <button class="btn btn-primary btn-sm" style="min-height:44px;" (click)="openCreate()">
        <i class="fas fa-plus me-1"></i>{{ 'customers.addAddress' | translate }}
      </button>
    </div>

    <div *ngIf="loading" class="text-center py-5">
      <div class="spinner-border text-primary"></div>
    </div>

    <div *ngIf="errorMsg" class="alert alert-danger py-2 small">{{ errorMsg }}</div>

    <div *ngIf="!loading && addresses.length === 0" class="text-center py-5 text-muted">
      <i class="fas fa-map-marker-alt fa-3x mb-3 d-block"></i>
      {{ 'account.noAddresses' | translate }}
    </div>

    <!-- Address grid -->
    <div *ngIf="!loading && addresses.length > 0" class="row g-3">
      <div *ngFor="let addr of addresses" class="col-12 col-sm-6 col-lg-4">
        <div class="address-card" [class.default-addr]="addr.isDefault">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <span class="badge kind-badge bg-secondary">{{ addr.kind }}</span>
            <span *ngIf="addr.isDefault" class="badge bg-primary kind-badge">{{ 'account.default' | translate }}</span>
          </div>
          <div class="fw-semibold small mb-1">{{ addr.label ?? addr.line1 }}</div>
          <div class="text-muted small">
            {{ addr.line1 }}
            <span *ngIf="addr.line2">, {{ addr.line2 }}</span>
          </div>
          <div class="text-muted small">{{ addr.city }} {{ addr.country }}</div>
          <div class="d-flex gap-2 mt-3">
            <button class="btn btn-outline-secondary btn-sm" (click)="openEdit(addr)">
              <i class="fas fa-edit me-1"></i>{{ 'common.edit' | translate }}
            </button>
            <button class="btn btn-outline-danger btn-sm" (click)="delete(addr.id)">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div class="modal-overlay" *ngIf="modalOpen" (click)="closeModal($event)">
      <div class="modal-box" (click)="$event.stopPropagation()">
        <h5 class="fw-bold mb-3">
          {{ (editingId ? 'common.edit' : 'customers.addAddress') | translate }}
        </h5>
        <form [formGroup]="addrForm" (ngSubmit)="saveAddress()">
          <div class="row g-2">
            <div class="col-12 col-sm-6">
              <label class="form-label small fw-medium">{{ 'account.addressKind' | translate }}</label>
              <select class="form-select form-select-sm" formControlName="kind">
                <option value="ShipTo">ShipTo</option>
                <option value="BillTo">BillTo</option>
                <option value="Office">Office</option>
              </select>
            </div>
            <div class="col-12 col-sm-6">
              <label class="form-label small fw-medium">{{ 'account.addressLabel' | translate }}</label>
              <input type="text" class="form-control form-control-sm" style="font-size:14px;" formControlName="label">
            </div>
            <div class="col-12">
              <label class="form-label small fw-medium">{{ 'account.line1' | translate }}</label>
              <input type="text" class="form-control form-control-sm" style="font-size:14px;" formControlName="line1"
                     [class.is-invalid]="addrForm.controls['line1'].touched && addrForm.controls['line1'].invalid">
              <small class="text-danger" *ngIf="addrForm.controls['line1'].touched && addrForm.controls['line1'].invalid">
                {{ 'account.line1Required' | translate }}
              </small>
            </div>
            <div class="col-12">
              <label class="form-label small fw-medium">{{ 'account.line2' | translate }}</label>
              <input type="text" class="form-control form-control-sm" style="font-size:14px;" formControlName="line2">
            </div>
            <div class="col-12 col-sm-6">
              <label class="form-label small fw-medium">{{ 'account.city' | translate }}</label>
              <input type="text" class="form-control form-control-sm" style="font-size:14px;" formControlName="city">
            </div>
            <div class="col-12 col-sm-6">
              <label class="form-label small fw-medium">{{ 'account.country' | translate }}</label>
              <input type="text" class="form-control form-control-sm" style="font-size:14px;" formControlName="country">
            </div>
            <div class="col-12">
              <div class="form-check">
                <input class="form-check-input" type="checkbox" id="isDefault" formControlName="isDefault">
                <label class="form-check-label small" for="isDefault">{{ 'account.setDefault' | translate }}</label>
              </div>
            </div>
          </div>
          <div class="d-flex gap-2 mt-3">
            <button type="submit" class="btn btn-primary btn-sm flex-grow-1" style="min-height:44px;" [disabled]="savingAddr">
              <span *ngIf="savingAddr" class="spinner-border spinner-border-sm me-1"></span>
              {{ 'common.save' | translate }}
            </button>
            <button type="button" class="btn btn-outline-secondary btn-sm" (click)="modalOpen = false">
              {{ 'common.cancel' | translate }}
            </button>
          </div>
          <div *ngIf="saveAddrMsg" class="alert py-2 mt-2 small"
               [class.alert-danger]="!saveAddrSuccess"
               [class.alert-success]="saveAddrSuccess">
            {{ saveAddrMsg }}
          </div>
        </form>
      </div>
    </div>
  `
})
export class AddressesComponent implements OnInit {
  addresses: CustomerAddress[] = [];
  loading = true;
  errorMsg = '';
  modalOpen = false;
  editingId = '';
  savingAddr = false;
  saveAddrMsg = '';
  saveAddrSuccess = false;

  addrForm = this.fb.group({
    kind: ['ShipTo', Validators.required],
    label: [''],
    line1: ['', Validators.required],
    line2: [''],
    city: [''],
    country: [''],
    isDefault: [false]
  });

  constructor(
    private accountApi: AccountApiService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {}

  private get customerId(): string {
    return this.authService.currentUser?.userId ?? '';
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.accountApi.getProfile(this.customerId).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess && res.data?.addresses) {
          this.addresses = res.data.addresses;
        }
      },
      error: () => { this.loading = false; }
    });
  }

  openCreate(): void {
    this.editingId = '';
    this.addrForm.reset({ kind: 'ShipTo', isDefault: false });
    this.saveAddrMsg = '';
    this.modalOpen = true;
  }

  openEdit(addr: CustomerAddress): void {
    this.editingId = addr.id;
    this.addrForm.patchValue({
      kind: addr.kind,
      label: addr.label ?? '',
      line1: addr.line1 ?? '',
      line2: addr.line2 ?? '',
      city: addr.city ?? '',
      country: addr.country ?? '',
      isDefault: addr.isDefault ?? false
    });
    this.saveAddrMsg = '';
    this.modalOpen = true;
  }

  saveAddress(): void {
    if (this.addrForm.invalid) {
      this.addrForm.markAllAsTouched();
      return;
    }
    this.savingAddr = true;
    this.saveAddrMsg = '';
    const v = this.addrForm.value;
    const dto: Partial<import('../services/account-api.service').CustomerAddress> = {
      kind: v.kind ?? undefined,
      label: v.label ?? undefined,
      line1: v.line1 ?? undefined,
      line2: v.line2 ?? undefined,
      city: v.city ?? undefined,
      country: v.country ?? undefined,
      isDefault: v.isDefault ?? false
    };

    const obs = this.editingId
      ? this.accountApi.updateAddress(this.editingId, dto)
      : this.accountApi.createAddress(this.customerId, dto);

    obs.subscribe({
      next: res => {
        this.savingAddr = false;
        if (res.isSuccess) {
          this.modalOpen = false;
          this.load();
        } else {
          this.saveAddrMsg = res.message;
          this.saveAddrSuccess = false;
        }
      },
      error: (err: any) => {
        this.savingAddr = false;
        this.saveAddrMsg = err?.message ?? 'Save failed.';
        this.saveAddrSuccess = false;
      }
    });
  }

  delete(addressId: string): void {
    if (!confirm('Delete this address?')) return;
    this.accountApi.deleteAddress(addressId).subscribe({
      next: () => { this.load(); },
      error: (err: any) => { this.errorMsg = err?.message ?? 'Delete failed.'; }
    });
  }

  closeModal(event: MouseEvent): void {
    this.modalOpen = false;
  }
}
