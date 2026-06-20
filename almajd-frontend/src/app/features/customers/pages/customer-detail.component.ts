import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  CustomersApiService, CustomerDto, CustomerContactCreateDto,
  CustomerAddressCreateDto, CustomerNoteCreateDto
} from '../services/customers-api.service';
import { AuthService } from '../../../core/auth/auth.service';

type CustomerTab = 'profile' | 'contacts' | 'addresses' | 'notes' | 'ar';

@Component({
  selector: 'app-customer-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, TranslateModule],
  template: `
    <div class="page-header d-flex justify-content-between align-items-center">
      <div>
        <a routerLink="/admin/customers" class="text-muted text-decoration-none small">
          <i class="fas fa-arrow-left me-1"></i>{{ 'customers.title' | translate }}
        </a>
        <h2 class="mt-1">{{ customer?.legalName ?? 'Loading...' }}</h2>
      </div>
    </div>

    <div *ngIf="loading" class="text-center py-5">
      <div class="spinner-border" style="color: var(--primary);"></div>
    </div>

    <div *ngIf="error" class="alert alert-danger">{{ error }}</div>

    <div *ngIf="customer && !loading">
      <!-- Status/Tier actions -->
      <div class="card border-0 shadow-sm mb-3">
        <div class="card-body py-2 d-flex flex-wrap gap-2 align-items-center">
          <span class="badge fs-6"
            [class.badge-active]="customer.status === 'Active'"
            [class.badge-suspended]="customer.status === 'Suspended'"
            [class.badge-followup]="customer.status === 'FollowUp'">
            {{ customer.status }}
          </span>
          <span class="badge fs-6"
            [class.badge-vip]="customer.tier === 'VIP'"
            [class.badge-mid]="customer.tier === 'Mid'"
            [class.badge-small]="customer.tier === 'Small'">
            {{ customer.tier }}
          </span>
          <div class="ms-auto d-flex gap-2" *ngIf="canChangeStatusOrTier">
            <div class="d-flex gap-1 align-items-center">
              <select class="form-select form-select-sm" style="width: 130px;" [(ngModel)]="newStatus">
                <option value="Active">Active</option>
                <option value="Suspended">Suspended</option>
                <option value="FollowUp">Follow-Up</option>
              </select>
              <button class="btn btn-sm btn-outline-secondary" (click)="setStatus()">Set Status</button>
            </div>
            <div class="d-flex gap-1 align-items-center">
              <select class="form-select form-select-sm" style="width: 110px;" [(ngModel)]="newTier">
                <option value="VIP">VIP</option>
                <option value="Mid">Mid</option>
                <option value="Small">Small</option>
              </select>
              <button class="btn btn-sm btn-outline-secondary" (click)="setTier()">Set Tier</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <ul class="nav nav-tabs mb-3">
        <li class="nav-item" *ngFor="let t of tabs">
          <button class="nav-link" [class.active]="activeTab === t.key" (click)="activeTab = t.key">
            {{ t.labelKey | translate }}
          </button>
        </li>
      </ul>

      <!-- Profile Tab -->
      <div *ngIf="activeTab === 'profile'" class="card border-0 shadow-sm">
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-6">
              <table class="table table-sm table-borderless mb-0">
                <tr><td class="text-muted small fw-medium" style="width:160px;">Code</td><td class="font-monospace">{{ customer.code }}</td></tr>
                <tr><td class="text-muted small fw-medium">Legal Name</td><td>{{ customer.legalName }}</td></tr>
                <tr><td class="text-muted small fw-medium">Trade Name</td><td>{{ customer.tradeName ?? '—' }}</td></tr>
                <tr><td class="text-muted small fw-medium">Tax ID</td><td>{{ customer.taxId ?? '—' }}</td></tr>
                <tr><td class="text-muted small fw-medium">Phone</td><td>{{ customer.phone ?? '—' }}</td></tr>
                <tr><td class="text-muted small fw-medium">Email</td><td>{{ customer.email ?? '—' }}</td></tr>
              </table>
            </div>
            <div class="col-md-6">
              <table class="table table-sm table-borderless mb-0">
                <tr><td class="text-muted small fw-medium" style="width:160px;">Payment Terms</td><td>Net {{ customer.paymentTermsNetDays }} days</td></tr>
                <tr><td class="text-muted small fw-medium">Credit Limit</td><td>{{ customer.creditLimit | number:'1.2-2' }}</td></tr>
                <tr><td class="text-muted small fw-medium">Current AR</td>
                    <td [class.text-danger]="customer.currentAr > customer.creditLimit * 0.9">
                      {{ customer.currentAr | number:'1.2-2' }}
                    </td>
                </tr>
                <tr><td class="text-muted small fw-medium">Sales Rep</td><td>{{ customer.salesRepName ?? '—' }}</td></tr>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Contacts Tab -->
      <div *ngIf="activeTab === 'contacts'" class="card border-0 shadow-sm">
        <div class="card-header d-flex justify-content-between align-items-center bg-transparent">
          <span class="fw-medium">{{ 'customers.contacts' | translate }}</span>
          <button class="btn btn-sm btn-primary" (click)="showContactModal = true; contactForm.reset()">
            <i class="fas fa-plus me-1"></i>{{ 'customers.addContact' | translate }}
          </button>
        </div>
        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th>Name</th><th>Role</th><th>Phone</th><th>Email</th><th class="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="customer.contacts.length === 0">
                <td colspan="5" class="text-center text-muted py-3">No contacts</td>
              </tr>
              <tr *ngFor="let ct of customer.contacts">
                <td class="fw-medium">{{ ct.name }}</td>
                <td class="small text-muted">{{ ct.role ?? '—' }}</td>
                <td class="small">{{ ct.phone ?? '—' }}</td>
                <td class="small">{{ ct.email ?? '—' }}</td>
                <td class="text-end">
                  <button class="btn btn-sm btn-outline-danger" (click)="removeContact(ct.id)">
                    <i class="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Addresses Tab -->
      <div *ngIf="activeTab === 'addresses'" class="card border-0 shadow-sm">
        <div class="card-header d-flex justify-content-between align-items-center bg-transparent">
          <span class="fw-medium">{{ 'customers.addresses' | translate }}</span>
          <button class="btn btn-sm btn-primary" (click)="showAddressModal = true; addressForm.reset()">
            <i class="fas fa-plus me-1"></i>{{ 'customers.addAddress' | translate }}
          </button>
        </div>
        <div class="card-body">
          <div *ngIf="customer.addresses.length === 0" class="text-muted text-center py-3">No addresses</div>
          <div class="row g-3">
            <div class="col-md-6" *ngFor="let addr of customer.addresses">
              <div class="card border">
                <div class="card-body py-2">
                  <div class="d-flex justify-content-between align-items-start">
                    <span class="badge bg-secondary mb-1">{{ addr.kind }}</span>
                    <button class="btn btn-sm btn-outline-danger" (click)="removeAddress(addr.id)">
                      <i class="fas fa-trash fa-sm"></i>
                    </button>
                  </div>
                  <div class="small">{{ addr.line1 }}</div>
                  <div class="small" *ngIf="addr.line2">{{ addr.line2 }}</div>
                  <div class="small text-muted">{{ addr.city }}, {{ addr.region }}, {{ addr.country }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Notes Tab -->
      <div *ngIf="activeTab === 'notes'" class="card border-0 shadow-sm">
        <div class="card-header d-flex justify-content-between align-items-center bg-transparent">
          <span class="fw-medium">{{ 'customers.notes' | translate }}</span>
          <button class="btn btn-sm btn-primary" (click)="showNoteModal = true; noteForm.reset()">
            <i class="fas fa-plus me-1"></i>{{ 'customers.addNote' | translate }}
          </button>
        </div>
        <div class="card-body">
          <div *ngIf="customer.notes.length === 0" class="text-muted text-center py-3">No notes</div>
          <div *ngFor="let note of customer.notes" class="border rounded p-3 mb-2">
            <div class="d-flex justify-content-between align-items-start mb-1">
              <small class="text-muted fw-medium">{{ note.authorName ?? 'System' }}</small>
              <small class="text-muted">{{ note.createdAt | date:'medium' }}</small>
            </div>
            <p class="mb-0 small">{{ note.body }}</p>
          </div>
        </div>
      </div>

      <!-- AR Tab -->
      <div *ngIf="activeTab === 'ar'" class="card border-0 shadow-sm">
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-4">
              <div class="card border-0 bg-light text-center p-3">
                <div class="fs-3 fw-bold" style="color: var(--primary);">
                  {{ customer.currentAr | number:'1.2-2' }}
                </div>
                <div class="small text-muted">{{ 'customers.currentAr' | translate }}</div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="card border-0 bg-light text-center p-3">
                <div class="fs-3 fw-bold">{{ customer.creditLimit | number:'1.2-2' }}</div>
                <div class="small text-muted">{{ 'customers.creditLimit' | translate }}</div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="card border-0 bg-light text-center p-3">
                <div class="fs-3 fw-bold"
                     [class.text-danger]="(customer.creditLimit - customer.currentAr) < 0"
                     [class.text-success]="(customer.creditLimit - customer.currentAr) >= 0">
                  {{ (customer.creditLimit - customer.currentAr) | number:'1.2-2' }}
                </div>
                <div class="small text-muted">Available Headroom</div>
              </div>
            </div>
          </div>
          <p class="text-muted small mt-3">
            Full AR aging dashboard — available in the Billing module (next slice).
          </p>
        </div>
      </div>
    </div>

    <!-- Contact Modal -->
    <div *ngIf="showContactModal" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.4);">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ 'customers.addContact' | translate }}</h5>
            <button type="button" class="btn-close" (click)="showContactModal = false"></button>
          </div>
          <form [formGroup]="contactForm" (ngSubmit)="saveContact()">
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label small fw-medium">Name *</label>
                <input type="text" class="form-control" formControlName="name">
              </div>
              <div class="mb-3">
                <label class="form-label small fw-medium">Role</label>
                <input type="text" class="form-control" formControlName="role">
              </div>
              <div class="mb-3">
                <label class="form-label small fw-medium">Phone</label>
                <input type="tel" class="form-control" formControlName="phone">
              </div>
              <div class="mb-3">
                <label class="form-label small fw-medium">Email</label>
                <input type="email" class="form-control" formControlName="email">
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="showContactModal = false">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="saving">
                <span *ngIf="saving" class="spinner-border spinner-border-sm me-1"></span>
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Address Modal -->
    <div *ngIf="showAddressModal" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.4);">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ 'customers.addAddress' | translate }}</h5>
            <button type="button" class="btn-close" (click)="showAddressModal = false"></button>
          </div>
          <form [formGroup]="addressForm" (ngSubmit)="saveAddress()">
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label small fw-medium">Kind</label>
                <select class="form-select" formControlName="kind">
                  <option value="ShipTo">Ship To</option>
                  <option value="BillTo">Bill To</option>
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label small fw-medium">Address Line 1 *</label>
                <input type="text" class="form-control" formControlName="line1">
              </div>
              <div class="mb-3">
                <label class="form-label small fw-medium">Address Line 2</label>
                <input type="text" class="form-control" formControlName="line2">
              </div>
              <div class="row g-2">
                <div class="col">
                  <label class="form-label small fw-medium">City</label>
                  <input type="text" class="form-control" formControlName="city">
                </div>
                <div class="col">
                  <label class="form-label small fw-medium">Region</label>
                  <input type="text" class="form-control" formControlName="region">
                </div>
                <div class="col">
                  <label class="form-label small fw-medium">Country</label>
                  <input type="text" class="form-control" formControlName="country">
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="showAddressModal = false">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="saving">
                <span *ngIf="saving" class="spinner-border spinner-border-sm me-1"></span>
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Note Modal -->
    <div *ngIf="showNoteModal" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.4);">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ 'customers.addNote' | translate }}</h5>
            <button type="button" class="btn-close" (click)="showNoteModal = false"></button>
          </div>
          <form [formGroup]="noteForm" (ngSubmit)="saveNote()">
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label small fw-medium">Note *</label>
                <textarea class="form-control" formControlName="body" rows="4"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="showNoteModal = false">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="saving">
                <span *ngIf="saving" class="spinner-border spinner-border-sm me-1"></span>
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class CustomerDetailComponent implements OnInit {
  customer: CustomerDto | null = null;
  loading = true;
  saving = false;
  error = '';
  activeTab: CustomerTab = 'profile';
  newStatus = 'Active';
  newTier = 'Small';
  showContactModal = false;
  showAddressModal = false;
  showNoteModal = false;

  tabs: { key: CustomerTab; labelKey: string }[] = [
    { key: 'profile',   labelKey: 'customers.profile' },
    { key: 'contacts',  labelKey: 'customers.contacts' },
    { key: 'addresses', labelKey: 'customers.addresses' },
    { key: 'notes',     labelKey: 'customers.notes' },
    { key: 'ar',        labelKey: 'customers.ar' },
  ];

  contactForm = this.fb.group({
    name:  ['', Validators.required],
    role:  [''],
    phone: [''],
    email: ['']
  });

  addressForm = this.fb.group({
    kind:    ['ShipTo'],
    line1:   ['', Validators.required],
    line2:   [''],
    city:    [''],
    region:  [''],
    country: ['']
  });

  noteForm = this.fb.group({
    body: ['', Validators.required]
  });

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private customersApi: CustomersApiService,
    private auth: AuthService
  ) {}

  get canChangeStatusOrTier(): boolean {
    return this.auth.hasRole('Admin', 'OpsManager');
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.load(id);
  }

  load(id: string): void {
    this.loading = true;
    this.customersApi.get(id).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess) {
          this.customer = res.data;
          this.newStatus = res.data.status;
          this.newTier = res.data.tier;
        } else {
          this.error = res.message;
        }
      },
      error: (err: any) => { this.loading = false; this.error = err?.message ?? 'Failed'; }
    });
  }

  setStatus(): void {
    if (!this.customer) return;
    this.customersApi.setStatus(this.customer.id, this.newStatus).subscribe({
      next: () => this.load(this.customer!.id)
    });
  }

  setTier(): void {
    if (!this.customer) return;
    this.customersApi.setTier(this.customer.id, this.newTier).subscribe({
      next: () => this.load(this.customer!.id)
    });
  }

  saveContact(): void {
    if (!this.customer || this.contactForm.invalid) return;
    this.saving = true;
    const v = this.contactForm.value;
    const dto: CustomerContactCreateDto = { name: v.name!, role: v.role ?? undefined, phone: v.phone ?? undefined, email: v.email ?? undefined };
    this.customersApi.addContact(this.customer.id, dto).subscribe({
      next: () => { this.saving = false; this.showContactModal = false; this.load(this.customer!.id); },
      error: () => { this.saving = false; }
    });
  }

  removeContact(contactId: string): void {
    this.customersApi.removeContact(contactId).subscribe({ next: () => this.load(this.customer!.id) });
  }

  saveAddress(): void {
    if (!this.customer || this.addressForm.invalid) return;
    this.saving = true;
    const v = this.addressForm.value;
    const dto: CustomerAddressCreateDto = {
      kind: v.kind!, line1: v.line1!, line2: v.line2 ?? undefined,
      city: v.city ?? undefined, region: v.region ?? undefined, country: v.country ?? undefined
    };
    this.customersApi.addAddress(this.customer.id, dto).subscribe({
      next: () => { this.saving = false; this.showAddressModal = false; this.load(this.customer!.id); },
      error: () => { this.saving = false; }
    });
  }

  removeAddress(addressId: string): void {
    this.customersApi.removeAddress(addressId).subscribe({ next: () => this.load(this.customer!.id) });
  }

  saveNote(): void {
    if (!this.customer || this.noteForm.invalid) return;
    this.saving = true;
    const dto: CustomerNoteCreateDto = { body: this.noteForm.value.body! };
    this.customersApi.addNote(this.customer.id, dto).subscribe({
      next: () => { this.saving = false; this.showNoteModal = false; this.load(this.customer!.id); },
      error: () => { this.saving = false; }
    });
  }
}
