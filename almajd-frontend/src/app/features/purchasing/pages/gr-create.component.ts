import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import {
  PurchasingApiService,
  PurchaseOrderDto,
  PurchaseOrderListItemDto,
  GoodsReceiptCreateDto,
  GrLineInputDto
} from '../services/purchasing-api.service';
import { InventoryApiService, LocationDto } from '../../inventory/services/inventory-api.service';

@Component({
  selector: 'app-gr-create',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="page-header d-flex justify-content-between align-items-center">
      <div>
        <a routerLink="/admin/purchasing/goods-receipts" class="text-muted text-decoration-none small">
          <i class="fas fa-arrow-left me-1"></i>{{ 'purchasing.gr.title' | translate }}
        </a>
        <h2 class="mt-1">{{ 'purchasing.gr.create' | translate }}</h2>
      </div>
    </div>

    <div *ngIf="error" class="alert alert-danger">{{ error }}</div>

    <!-- PO Picker -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-body">
        <div class="row g-3 align-items-end">
          <div class="col-md-5">
            <label class="form-label small fw-medium">{{ 'purchasing.gr.pickPO' | translate }}</label>
            <input type="text" class="form-control form-control-sm" [(ngModel)]="poSearch"
                   [ngModelOptions]="{standalone: true}"
                   placeholder="Filter by PO number or supplier…">
          </div>
          <div class="col-md-5">
            <label class="form-label small fw-medium">Receivable PO</label>
            <select class="form-select form-select-sm"
                    [ngModel]="selectedPoId" [ngModelOptions]="{standalone: true}"
                    (ngModelChange)="onPoSelected($event)">
              <option [ngValue]="null">— Select PO —</option>
              <option *ngFor="let p of filteredPoOptions" [ngValue]="p.id">
                {{ p.number }} — {{ p.supplierName }}
                <span *ngIf="p.status === 'PartiallyReceived'"> (partial)</span>
              </option>
            </select>
            <small *ngIf="poListLoading" class="text-muted">Loading receivable POs…</small>
            <small *ngIf="!poListLoading && receivablePos.length === 0" class="text-muted">
              No POs are awaiting receipt right now.
            </small>
          </div>
          <div class="col-auto" *ngIf="poLoading">
            <span class="spinner-border spinner-border-sm"></span>
          </div>
        </div>
      </div>
    </div>

    <form *ngIf="po" [formGroup]="form" (ngSubmit)="doCreate()">
      <!-- PO Summary -->
      <div class="card border-0 shadow-sm mb-3">
        <div class="card-header bg-transparent fw-medium">
          {{ 'purchasing.gr.poSummary' | translate }}: {{ po.number }}
          <span class="badge ms-2" [class]="poStatusBadge(po.status)">{{ po.status }}</span>
        </div>
        <div class="card-body pb-0">
          <div class="row g-2 mb-2">
            <div class="col-auto">
              <small class="text-muted">{{ 'purchasing.suppliers.name' | translate }}:</small>
              <span class="ms-1 fw-medium small">{{ po.supplierName }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Notes -->
      <div class="card border-0 shadow-sm mb-3">
        <div class="card-body py-2">
          <label class="form-label small fw-medium">{{ 'inventory.counts.notes' | translate }}</label>
          <textarea class="form-control form-control-sm" formControlName="notes" rows="2"></textarea>
        </div>
      </div>

      <!-- Lines -->
      <div class="card border-0 shadow-sm mb-3">
        <div class="card-header bg-transparent fw-medium">{{ 'purchasing.gr.receiveLines' | translate }}</div>
        <div class="table-responsive">
          <table class="table table-sm mb-0">
            <thead class="table-light">
              <tr>
                <th>{{ 'purchasing.suppliers.skuCode' | translate }}</th>
                <th>{{ 'catalog.products.name' | translate }}</th>
                <th class="text-center">{{ 'purchasing.po.qty' | translate }}</th>
                <th class="text-center">{{ 'purchasing.po.qty' | translate }}</th>
                <th class="text-center">{{ 'purchasing.gr.outstanding' | translate }}</th>
                <th>{{ 'purchasing.gr.receivingQty' | translate }}</th>
                <th>{{ 'purchasing.gr.location' | translate }}</th>
              </tr>
            </thead>
            <tbody formArrayName="lines">
              <tr *ngFor="let line of lines.controls; let i = index" [formGroupName]="i">
                <td class="font-monospace small">{{ po.lines[i] ? po.lines[i].skuCode : '' }}</td>
                <td class="small">{{ po.lines[i] ? po.lines[i].productName : '' }}</td>
                <td class="text-center small">{{ po.lines[i] ? po.lines[i].qty : '' }}</td>
                <td class="text-center small">{{ po.lines[i] ? po.lines[i].qty : '' }}</td>
                <td class="text-center small fw-medium text-warning">{{ po.lines[i] ? po.lines[i].outstandingQty : 0 }}</td>
                <td>
                  <input type="number" class="form-control form-control-sm" formControlName="qty"
                         min="0" [attr.max]="po.lines[i] ? po.lines[i].outstandingQty : null" style="width:80px">
                  <small *ngIf="line.get('qty')?.invalid && line.get('qty')?.touched" class="text-danger">{{ 'purchasing.gr.qtyInvalid' | translate }}</small>
                </td>
                <td>
                  <select class="form-select form-select-sm" formControlName="locationId" style="min-width:150px">
                    <option value="">{{ 'purchasing.gr.selectLocation' | translate }}</option>
                    <option *ngFor="let loc of locations" [value]="loc.id">{{ loc.address }}</option>
                  </select>
                  <small *ngIf="line.get('locationId')?.invalid && line.get('locationId')?.touched" class="text-danger">{{ 'purchasing.gr.locationRequired' | translate }}</small>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="d-flex gap-2">
        <button type="submit" class="btn btn-primary" [disabled]="saving">
          <span *ngIf="saving" class="spinner-border spinner-border-sm me-1"></span>
          <i class="fas fa-truck-ramp-box me-1"></i>{{ 'purchasing.gr.confirm' | translate }}
        </button>
        <a routerLink="/admin/purchasing/goods-receipts" class="btn btn-outline-secondary">{{ 'common.cancel' | translate }}</a>
      </div>
    </form>
  `
})
export class GrCreateComponent implements OnInit {
  po: PurchaseOrderDto | null = null;
  receivablePos: PurchaseOrderListItemDto[] = [];
  selectedPoId: string | null = null;
  poSearch = '';
  poLoading = false;
  poListLoading = false;
  locations: LocationDto[] = [];
  saving = false;
  error = '';

  get filteredPoOptions(): PurchaseOrderListItemDto[] {
    const q = this.poSearch.trim().toLowerCase();
    if (!q) return this.receivablePos;
    return this.receivablePos.filter(p =>
      p.number.toLowerCase().includes(q) || p.supplierName.toLowerCase().includes(q));
  }

  form = this.fb.group({
    notes: [''],
    lines: this.fb.array([])
  });

  get lines(): FormArray {
    return this.form.get('lines') as FormArray;
  }

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private purchasingApi: PurchasingApiService,
    private inventoryApi: InventoryApiService
  ) {}

  ngOnInit(): void {
    this.loadReceivablePos();

    const poId = this.route.snapshot.queryParamMap.get('poId');
    if (poId) { this.selectedPoId = poId; this.loadPO(poId); }

    // Load all locations for receiving
    this.inventoryApi.listWarehouses().subscribe({
      next: res => {
        if (res.isSuccess && res.data.length > 0) {
          this.inventoryApi.listLocations(res.data[0].id).subscribe({
            next: r => { if (r.isSuccess) this.locations = r.data ?? []; }
          });
        }
      }
    });
  }

  private loadReceivablePos(): void {
    this.poListLoading = true;
    forkJoin({
      approved: this.purchasingApi.searchPOs({ status: 'Approved',          pageSize: 200 }),
      partial:  this.purchasingApi.searchPOs({ status: 'PartiallyReceived', pageSize: 200 })
    }).subscribe({
      next: ({ approved, partial }) => {
        this.poListLoading = false;
        const a = approved.data?.items ?? [];
        const p = partial.data?.items  ?? [];
        this.receivablePos = [...a, ...p].sort((x, y) =>
          (x.expectedAt ?? '').localeCompare(y.expectedAt ?? ''));
      },
      error: () => { this.poListLoading = false; }
    });
  }

  onPoSelected(poId: string | null): void {
    this.selectedPoId = poId;
    if (!poId) { this.po = null; while (this.lines.length) this.lines.removeAt(0); return; }
    this.loadPO(poId);
  }

  loadPO(poId: string): void {
    this.poLoading = true;
    this.error = '';
    this.purchasingApi.getPO(poId).subscribe({
      next: res => {
        this.poLoading = false;
        if (res.isSuccess) {
          this.po = res.data;
          if (!['Approved', 'PartiallyReceived'].includes(this.po.status)) {
            this.error = 'purchasing.gr.poNotReceivable';
            this.po = null;
            return;
          }
          while (this.lines.length) this.lines.removeAt(0);
          this.po.lines.forEach(l => {
            this.lines.push(this.fb.group({
              purchaseOrderLineId: [l.id],
              skuId: [l.skuId],
              qty: [l.outstandingQty, [Validators.required, Validators.min(0), Validators.max(l.outstandingQty)]],
              locationId: ['', Validators.required]
            }));
          });
        } else {
          this.error = res.message;
        }
      },
      error: (err: any) => { this.poLoading = false; this.error = err?.message ?? 'Error'; }
    });
  }

  doCreate(): void {
    if (this.form.invalid || !this.po) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const v = this.form.value;
    const dto: GoodsReceiptCreateDto = {
      purchaseOrderId: this.po.id,
      notes: v.notes || undefined,
      lines: (v.lines as any[])
        .filter(l => l.qty > 0)
        .map((l): GrLineInputDto => ({
          purchaseOrderLineId: l.purchaseOrderLineId,
          qty: l.qty,
          locationId: l.locationId
        }))
    };
    this.purchasingApi.createGR(dto).subscribe({
      next: res => {
        this.saving = false;
        if (res.isSuccess) {
          this.router.navigate(['/admin/purchasing/goods-receipts', res.data.id]);
        } else {
          this.error = res.message;
        }
      },
      error: (err: any) => { this.saving = false; this.error = err?.message ?? 'Error'; }
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
