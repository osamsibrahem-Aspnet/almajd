import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

interface RoleInfo {
  name: string;
  descKey: string;
  icon: string;
}

const ROLES: RoleInfo[] = [
  { name: 'Admin',             descKey: 'system.roles.admin',           icon: 'fa-shield-halved' },
  { name: 'SalesRep',          descKey: 'system.roles.salesRep',        icon: 'fa-user-tie' },
  { name: 'Accountant',        descKey: 'system.roles.accountant',      icon: 'fa-calculator' },
  { name: 'OpsManager',        descKey: 'system.roles.opsManager',      icon: 'fa-sitemap' },
  { name: 'WarehouseManager',  descKey: 'system.roles.warehouseManager',icon: 'fa-warehouse' },
  { name: 'WarehouseOperator', descKey: 'system.roles.warehouseOp',     icon: 'fa-forklift' },
  { name: 'Procurement',       descKey: 'system.roles.procurement',     icon: 'fa-basket-shopping' },
  { name: 'Customer',          descKey: 'system.roles.customer',        icon: 'fa-user' },
];

@Component({
  selector: 'app-roles-page',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="page-header">
      <h2>{{ 'system.roles.title' | translate }}</h2>
      <p class="text-muted small mb-0">{{ 'system.roles.subtitle' | translate }}</p>
    </div>

    <div class="row g-3">
      <div class="col-sm-6 col-xl-4" *ngFor="let role of roles">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body d-flex gap-3">
            <div class="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0 bg-primary"
                 style="width:48px;height:48px;">
              <i class="fas {{ role.icon }} text-white"></i>
            </div>
            <div>
              <div class="fw-semibold">{{ role.name }}</div>
              <div class="small text-muted mt-1">{{ role.descKey | translate }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="alert alert-info mt-4 small">
      <i class="fas fa-info-circle me-2"></i>{{ 'system.roles.phaseNote' | translate }}
    </div>
  `
})
export class RolesPageComponent {
  roles = ROLES;
}
