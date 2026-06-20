import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { PurchasingApiService, GoodsReceiptDto } from '../services/purchasing-api.service';

@Component({
  selector: 'app-gr-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <div class="page-header">
      <a routerLink="/admin/purchasing/goods-receipts" class="text-muted text-decoration-none small">
        <i class="fas fa-arrow-left me-1"></i>{{ 'purchasing.gr.title' | translate }}
      </a>
      <h2 class="mt-1">{{ gr?.number ?? ('common.loading' | translate) }}</h2>
    </div>

    <div *ngIf="loading" class="text-center py-5">
      <div class="spinner-border" style="color: var(--primary);"></div>
    </div>
    <div *ngIf="error" class="alert alert-danger">{{ error }}</div>

    <div *ngIf="gr && !loading" class="row g-3">
      <div class="col-12">
        <div class="card border-0 shadow-sm mb-3">
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-6">
                <table class="table table-sm table-borderless mb-0">
                  <tr><td class="text-muted small fw-medium" style="width:140px;">{{ 'purchasing.po.number' | translate }}</td>
                    <td><a [routerLink]="['/admin/purchasing/purchase-orders', gr.purchaseOrderId]" class="fw-medium">{{ gr.purchaseOrderNumber }}</a></td></tr>
                  <tr><td class="text-muted small fw-medium">{{ 'purchasing.suppliers.name' | translate }}</td><td>{{ gr.supplierName }}</td></tr>
                  <tr><td class="text-muted small fw-medium">{{ 'purchasing.gr.receivedBy' | translate }}</td><td>{{ gr.receivedByName }}</td></tr>
                  <tr><td class="text-muted small fw-medium">{{ 'purchasing.gr.receivedAt' | translate }}</td><td class="small">{{ gr.receivedAt | date:'medium' }}</td></tr>
                  <tr *ngIf="gr.notes"><td class="text-muted small fw-medium">{{ 'inventory.counts.notes' | translate }}</td><td class="small">{{ gr.notes }}</td></tr>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div class="card border-0 shadow-sm">
          <div class="card-header bg-transparent fw-medium">
            {{ 'purchasing.gr.lines' | translate }} ({{ gr.lines.length }})
          </div>
          <div class="table-responsive">
            <table class="table table-hover mb-0">
              <thead class="table-light">
                <tr>
                  <th>{{ 'purchasing.suppliers.skuCode' | translate }}</th>
                  <th>{{ 'catalog.products.name' | translate }}</th>
                  <th class="text-center">{{ 'purchasing.gr.receivingQty' | translate }}</th>
                  <th>{{ 'purchasing.gr.location' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngIf="gr.lines.length === 0">
                  <td colspan="4" class="text-center text-muted py-3">{{ 'common.noData' | translate }}</td>
                </tr>
                <tr *ngFor="let line of gr.lines">
                  <td class="font-monospace small">{{ line.skuCode }}</td>
                  <td class="small">{{ line.productName }}</td>
                  <td class="text-center fw-medium">{{ line.qty }}</td>
                  <td class="small">{{ line.locationAddress }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `
})
export class GrDetailComponent implements OnInit {
  gr: GoodsReceiptDto | null = null;
  loading = true;
  error = '';

  constructor(private route: ActivatedRoute, private purchasingApi: PurchasingApiService) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.purchasingApi.getGR(id).subscribe({
        next: res => {
          this.loading = false;
          if (res.isSuccess) this.gr = res.data;
          else this.error = res.message;
        },
        error: (err: any) => { this.loading = false; this.error = err?.message ?? 'Error'; }
      });
    }
  }
}
