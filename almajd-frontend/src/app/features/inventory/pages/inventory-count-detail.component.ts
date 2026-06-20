import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { InventoryApiService, InventoryCountDetailDto, CountLineInputDto } from '../services/inventory-api.service';

@Component({
  selector: 'app-inventory-count-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="page-header d-flex align-items-center justify-content-between">
      <div>
        <a [routerLink]="['/admin/inventory/counts']" class="btn btn-sm btn-outline-secondary me-2">
          <i class="fas fa-arrow-left"></i>
        </a>
        <span>{{ 'inventory.counts.detail' | translate }}</span>
        <span *ngIf="count" class="ms-2">
          <span class="badge" [class]="countStatusClass(count.status)">{{ count.status }}</span>
        </span>
      </div>
      <div class="d-flex gap-2" *ngIf="count">
        <button *ngIf="count.status === 'Draft'" class="btn btn-sm btn-primary" [disabled]="submitting" (click)="start()">
          <i class="fas fa-play me-1"></i>{{ 'inventory.counts.start' | translate }}
        </button>
        <button *ngIf="count.status === 'InProgress'" class="btn btn-sm btn-success" [disabled]="submitting" (click)="saveLines()">
          <i class="fas fa-floppy-disk me-1"></i>{{ 'inventory.counts.saveLines' | translate }}
        </button>
        <button *ngIf="count.status === 'InProgress'" class="btn btn-sm btn-warning text-white" [disabled]="submitting" (click)="post()">
          <i class="fas fa-check me-1"></i>{{ 'inventory.counts.post' | translate }}
        </button>
        <button *ngIf="count.status === 'Draft' || count.status === 'InProgress'" class="btn btn-sm btn-outline-danger" [disabled]="submitting" (click)="cancel()">
          {{ 'inventory.counts.cancel' | translate }}
        </button>
      </div>
    </div>

    <div *ngIf="loading" class="text-center py-4">
      <div class="spinner-border" style="color: var(--primary);"></div>
    </div>

    <div *ngIf="error" class="alert alert-danger">{{ error }}</div>
    <div *ngIf="successMsg" class="alert alert-success">{{ successMsg }}</div>

    <div *ngIf="count && !loading">
      <!-- Header info -->
      <div class="card border-0 shadow-sm mb-3">
        <div class="card-body">
          <div class="row g-3">
            <div class="col-sm-3">
              <div class="small text-muted">{{ 'inventory.warehouse.title' | translate }}</div>
              <div class="fw-medium">{{ count.warehouseCode }}</div>
            </div>
            <div class="col-sm-2">
              <div class="small text-muted">{{ 'inventory.counts.startedAt' | translate }}</div>
              <div>{{ count.startedAt ? (count.startedAt | date:'medium') : '—' }}</div>
            </div>
            <div class="col-sm-2">
              <div class="small text-muted">{{ 'inventory.counts.postedAt' | translate }}</div>
              <div>{{ count.postedAt ? (count.postedAt | date:'medium') : '—' }}</div>
            </div>
            <div class="col-sm-2">
              <div class="small text-muted">{{ 'inventory.counts.totalVariance' | translate }}</div>
              <div class="fw-bold" [class.text-danger]="count.totalVariance !== 0">
                {{ count.totalVariance > 0 ? '+' : '' }}{{ count.totalVariance }}
              </div>
            </div>
            <div class="col-sm-3" *ngIf="count.notes">
              <div class="small text-muted">{{ 'inventory.counts.notes' | translate }}</div>
              <div class="small">{{ count.notes }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Lines -->
      <div class="card border-0 shadow-sm">
        <div class="card-header bg-transparent fw-semibold">
          {{ 'inventory.counts.lines' | translate }} ({{ count.lines.length }})
        </div>
        <div class="card-body p-0">
          <div *ngIf="count.lines.length === 0" class="text-center text-muted py-4">
            {{ 'inventory.counts.noLines' | translate }}
          </div>
          <form *ngIf="count.lines.length > 0" [formGroup]="linesForm">
            <div class="table-responsive">
              <table class="table table-hover mb-0">
                <thead class="table-light">
                  <tr>
                    <th>{{ 'inventory.stock.sku' | translate }}</th>
                    <th>{{ 'inventory.stock.product' | translate }}</th>
                    <th>{{ 'inventory.stock.location' | translate }}</th>
                    <th class="text-end">{{ 'inventory.counts.systemQty' | translate }}</th>
                    <th class="text-end" style="width:120px">{{ 'inventory.counts.countedQty' | translate }}</th>
                    <th class="text-end">{{ 'inventory.counts.variance' | translate }}</th>
                  </tr>
                </thead>
                <tbody formArrayName="lines">
                  <tr *ngFor="let line of count.lines; let i = index" [formGroupName]="i">
                    <td class="font-monospace fw-medium">{{ line.skuCode }}</td>
                    <td class="small">{{ line.productName }}</td>
                    <td><span class="badge bg-secondary font-monospace">{{ line.locationAddress }}</span></td>
                    <td class="text-end">{{ line.systemQty }}</td>
                    <td class="text-end">
                      <input *ngIf="count.status === 'InProgress'" type="number" class="form-control form-control-sm text-end"
                             formControlName="countedQty" min="0" style="width:90px; display:inline-block;">
                      <span *ngIf="count.status !== 'InProgress'">{{ line.countedQty }}</span>
                    </td>
                    <td class="text-end fw-medium" [class.text-danger]="line.variance !== 0" [class.text-success]="line.variance === 0">
                      {{ line.variance > 0 ? '+' : '' }}{{ line.variance }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class InventoryCountDetailComponent implements OnInit {
  count: InventoryCountDetailDto | null = null;
  loading = true;
  error = '';
  successMsg = '';
  submitting = false;
  countId = '';

  linesForm = this.fb.group({
    lines: this.fb.array([])
  });

  get linesArray(): FormArray {
    return this.linesForm.get('lines') as FormArray;
  }

  constructor(
    private fb: FormBuilder,
    private inventoryApi: InventoryApiService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.countId = this.route.snapshot.paramMap.get('id') ?? '';
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.inventoryApi.getCount(this.countId).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess && res.data) {
          this.count = res.data;
          this.buildLinesForm();
        } else {
          this.error = res.message;
        }
      },
      error: (err) => { this.loading = false; this.error = err?.message ?? 'Error'; }
    });
  }

  buildLinesForm(): void {
    this.linesArray.clear();
    (this.count?.lines ?? []).forEach(line => {
      this.linesArray.push(this.fb.group({
        skuId: [line.skuId],
        locationId: [line.locationId],
        countedQty: [line.countedQty, [Validators.required, Validators.min(0)]]
      }));
    });
  }

  start(): void {
    this.submitting = true; this.error = ''; this.successMsg = '';
    this.inventoryApi.startCount(this.countId).subscribe({
      next: res => {
        this.submitting = false;
        if (res.isSuccess) this.load();
        else this.error = res.message;
      },
      error: (err) => { this.submitting = false; this.error = err?.message ?? 'Error'; }
    });
  }

  saveLines(): void {
    if (this.linesForm.invalid) { this.linesForm.markAllAsTouched(); return; }
    this.submitting = true; this.error = ''; this.successMsg = '';
    const lines: CountLineInputDto[] = this.linesArray.value.map((v: any) => ({
      skuId: v.skuId,
      locationId: v.locationId,
      countedQty: v.countedQty
    }));
    this.inventoryApi.setCountLines(this.countId, lines).subscribe({
      next: res => {
        this.submitting = false;
        if (res.isSuccess) { this.successMsg = 'Lines saved.'; this.load(); }
        else this.error = res.message;
      },
      error: (err) => { this.submitting = false; this.error = err?.message ?? 'Error'; }
    });
  }

  post(): void {
    if (!confirm('Post this count? This will adjust stock and cannot be undone.')) return;
    this.submitting = true; this.error = ''; this.successMsg = '';
    this.inventoryApi.postCount(this.countId).subscribe({
      next: res => {
        this.submitting = false;
        if (res.isSuccess) this.load();
        else this.error = res.message;
      },
      error: (err) => { this.submitting = false; this.error = err?.message ?? 'Error'; }
    });
  }

  cancel(): void {
    if (!confirm('Cancel this count?')) return;
    this.submitting = true; this.error = '';
    this.inventoryApi.cancelCount(this.countId).subscribe({
      next: res => {
        this.submitting = false;
        if (res.isSuccess) this.load();
        else this.error = res.message;
      },
      error: (err) => { this.submitting = false; this.error = err?.message ?? 'Error'; }
    });
  }

  countStatusClass(status: string): string {
    const map: Record<string, string> = {
      'Draft': 'badge-draft',
      'InProgress': 'badge-inpreparation',
      'Posted': 'badge-delivered',
      'Cancelled': 'badge-cancelled'
    };
    return map[status] ?? 'badge-draft';
  }
}
