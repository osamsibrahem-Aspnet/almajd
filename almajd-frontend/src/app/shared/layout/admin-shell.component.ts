import { Component, OnInit, HostListener } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';

interface NavItem {
  labelKey: string;
  icon: string;
  route: string;
  roles?: string[];
  children?: NavItem[];
}

const ALL_NAV_ITEMS: NavItem[] = [
  { labelKey: 'nav.dashboard',    icon: 'fa-gauge-high',          route: '/admin/dashboard' },
  {
    labelKey: 'nav.catalog', icon: 'fa-box', route: '/admin/catalog',
    roles: ['Admin','SalesRep'],
    children: [
      { labelKey: 'nav.products',   icon: 'fa-boxes-stacked', route: '/admin/catalog/products' },
      { labelKey: 'nav.categories', icon: 'fa-sitemap',       route: '/admin/catalog/categories', roles: ['Admin','SalesRep'] },
      { labelKey: 'nav.brands',     icon: 'fa-tag',           route: '/admin/catalog/brands',     roles: ['Admin','SalesRep'] },
    ]
  },
  { labelKey: 'nav.inventory',    icon: 'fa-warehouse',           route: '/admin/inventory',  roles: ['Admin','WarehouseOperator','WarehouseManager','Procurement'] },
  { labelKey: 'nav.customers',    icon: 'fa-users',               route: '/admin/customers',  roles: ['Admin','SalesRep','Accountant','OpsManager'] },
  { labelKey: 'nav.orders',       icon: 'fa-cart-shopping',       route: '/admin/orders',     roles: ['Admin','SalesRep','Accountant','OpsManager','WarehouseManager','WarehouseOperator'] },
  { labelKey: 'nav.fulfilment',   icon: 'fa-truck',               route: '/admin/fulfilment', roles: ['Admin','WarehouseOperator','WarehouseManager','OpsManager'] },
  {
    labelKey: 'nav.purchasing', icon: 'fa-basket-shopping', route: '/admin/purchasing',
    roles: ['Admin','Procurement','OpsManager','WarehouseManager','Accountant'],
    children: [
      { labelKey: 'nav.suppliers',      icon: 'fa-building',          route: '/admin/purchasing/suppliers' },
      { labelKey: 'nav.purchaseOrders', icon: 'fa-file-invoice',      route: '/admin/purchasing/purchase-orders' },
      { labelKey: 'nav.goodsReceipts',  icon: 'fa-truck-ramp-box',    route: '/admin/purchasing/goods-receipts' },
      { labelKey: 'nav.replenishment',  icon: 'fa-arrows-rotate',     route: '/admin/purchasing/replenishment' },
    ]
  },
  {
    labelKey: 'nav.billing', icon: 'fa-file-invoice-dollar', route: '/admin/billing',
    roles: ['Admin','Accountant','OpsManager','SalesRep'],
    children: [
      { labelKey: 'nav.invoices', icon: 'fa-file-invoice', route: '/admin/billing/invoices' },
      { labelKey: 'nav.payments', icon: 'fa-money-check',  route: '/admin/billing/payments', roles: ['Admin','Accountant','OpsManager'] },
      { labelKey: 'nav.arAging',  icon: 'fa-chart-column', route: '/admin/billing/ar',       roles: ['Admin','Accountant','OpsManager'] },
    ]
  },
  {
    labelKey: 'nav.reports', icon: 'fa-chart-bar', route: '/admin/reports',
    roles: ['Admin','Accountant','OpsManager','SalesRep'],
    children: [
      { labelKey: 'nav.reportsSales',         icon: 'fa-chart-line',    route: '/admin/reports/sales' },
      { labelKey: 'nav.reportsProfit',        icon: 'fa-sack-dollar',   route: '/admin/reports/profit' },
      { labelKey: 'nav.reportsTopCustomers',  icon: 'fa-trophy',        route: '/admin/reports/top-customers' },
      { labelKey: 'nav.reportsSupplierSpend', icon: 'fa-truck-field',   route: '/admin/reports/supplier-spend' },
      { labelKey: 'nav.reportsKpis',          icon: 'fa-gauge-high',    route: '/admin/reports/kpis' },
    ]
  },
  {
    labelKey: 'nav.system', icon: 'fa-gear', route: '/admin/system',
    roles: ['Admin'],
    children: [
      { labelKey: 'nav.systemUsers',     icon: 'fa-users-gear',  route: '/admin/system/users' },
      { labelKey: 'nav.systemTemplates', icon: 'fa-bell',        route: '/admin/system/templates' },
      { labelKey: 'nav.systemRoles',     icon: 'fa-key',         route: '/admin/system/roles' },
      { labelKey: 'nav.systemAudit',     icon: 'fa-scroll',      route: '/admin/system/audit' },
    ]
  },
];

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, TranslateModule],
  template: `
    <div class="admin-shell">
      <!-- Sidebar overlay for mobile -->
      <div
        *ngIf="sidebarOpen"
        class="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-md-none"
        style="z-index: 1040;"
        (click)="sidebarOpen = false">
      </div>

      <!-- Sidebar -->
      <nav class="sidebar d-flex flex-column" [class.open]="sidebarOpen">
        <div class="sidebar-brand">
          <i class="fas fa-store-alt"></i>
          <span>{{ 'app.title' | translate }}</span>
        </div>

        <div class="p-2 flex-grow-1 overflow-auto">
          <ul class="nav flex-column gap-1">
            <li class="nav-item" *ngFor="let item of visibleNavItems">
              <!-- Parent with children: toggle expand -->
              <ng-container *ngIf="item.children && item.children.length > 0; else simpleLink">
                <button
                  class="nav-link w-100 text-start d-flex align-items-center"
                  [class.active]="isGroupActive(item)"
                  (click)="toggleGroup(item.route)">
                  <i class="fas {{ item.icon }}"></i>
                  <span class="flex-grow-1">{{ item.labelKey | translate }}</span>
                  <i class="fas fa-chevron-down small" [class.fa-rotate-180]="expandedGroups.has(item.route)" style="transition: transform 0.2s;"></i>
                </button>
                <ul class="nav flex-column ms-3 gap-1 mt-1" *ngIf="expandedGroups.has(item.route) || isGroupActive(item)">
                  <li class="nav-item" *ngFor="let child of visibleChildren(item)">
                    <a
                      class="nav-link py-1"
                      [routerLink]="child.route"
                      routerLinkActive="active"
                      style="font-size: 0.875rem;"
                      (click)="sidebarOpen = false">
                      <i class="fas {{ child.icon }}"></i>
                      <span>{{ child.labelKey | translate }}</span>
                    </a>
                  </li>
                </ul>
              </ng-container>
              <ng-template #simpleLink>
                <a
                  class="nav-link"
                  [routerLink]="item.route"
                  routerLinkActive="active"
                  (click)="sidebarOpen = false">
                  <i class="fas {{ item.icon }}"></i>
                  <span>{{ item.labelKey | translate }}</span>
                </a>
              </ng-template>
            </li>
          </ul>
        </div>

        <!-- Language switcher -->
        <div class="p-3 border-top" style="border-color: var(--border) !important;">
          <div class="d-flex gap-2">
            <button
              class="btn btn-sm"
              [class.btn-primary]="currentLang === 'en'"
              [class.btn-outline-secondary]="currentLang !== 'en'"
              (click)="setLang('en')">EN</button>
            <button
              class="btn btn-sm"
              [class.btn-primary]="currentLang === 'ar'"
              [class.btn-outline-secondary]="currentLang !== 'ar'"
              (click)="setLang('ar')">AR</button>
          </div>
        </div>
      </nav>

      <!-- Main area -->
      <div class="shell-body">
        <!-- Topbar -->
        <header class="topbar">
          <button
            class="btn btn-sm btn-outline-secondary d-md-none me-2"
            (click)="sidebarOpen = !sidebarOpen">
            <i class="fas fa-bars"></i>
          </button>

          <div class="flex-grow-1">
            <input
              type="search"
              class="form-control form-control-sm"
              style="max-width: 320px;"
              [placeholder]="'common.search' | translate">
          </div>

          <!-- User dropdown -->
          <div class="dropdown">
            <div class="avatar" data-bs-toggle="dropdown" aria-expanded="false">
              {{ userInitials }}
            </div>
            <ul class="dropdown-menu dropdown-menu-end">
              <li>
                <span class="dropdown-item-text fw-semibold">{{ currentUser?.fullName }}</span>
              </li>
              <li>
                <span class="dropdown-item-text text-muted small">{{ currentUser?.email }}</span>
              </li>
              <li><hr class="dropdown-divider"></li>
              <li>
                <button class="dropdown-item text-danger" (click)="logout()">
                  <i class="fas fa-right-from-bracket me-2"></i>
                  {{ 'auth.logout' | translate }}
                </button>
              </li>
            </ul>
          </div>
        </header>

        <!-- Page content -->
        <main class="page-content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `
})
export class AdminShellComponent implements OnInit {
  sidebarOpen = false;
  currentLang = 'en';
  expandedGroups = new Set<string>();

  constructor(
    public authService: AuthService,
    private translate: TranslateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentLang = this.translate.currentLang ?? 'en';
  }

  get currentUser() {
    return this.authService.currentUser;
  }

  get userInitials(): string {
    const name = this.currentUser?.fullName ?? this.currentUser?.email ?? '?';
    return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  }

  get visibleNavItems(): NavItem[] {
    const roles = this.authService.roles;
    const isAdmin = roles.includes('Admin');

    return ALL_NAV_ITEMS.filter(item => {
      if (!item.roles || item.roles.length === 0) return true;
      if (isAdmin) return true;
      return item.roles.some(r => roles.includes(r));
    });
  }

  visibleChildren(item: NavItem): NavItem[] {
    if (!item.children) return [];
    const roles = this.authService.roles;
    const isAdmin = roles.includes('Admin');
    return item.children.filter(c => {
      if (!c.roles || c.roles.length === 0) return true;
      if (isAdmin) return true;
      return c.roles.some(r => roles.includes(r));
    });
  }

  toggleGroup(route: string): void {
    if (this.expandedGroups.has(route)) {
      this.expandedGroups.delete(route);
    } else {
      this.expandedGroups.add(route);
    }
  }

  isGroupActive(item: NavItem): boolean {
    const currentUrl = this.router.url;
    if (item.children) {
      return item.children.some(c => currentUrl.startsWith(c.route));
    }
    return currentUrl.startsWith(item.route);
  }

  setLang(lang: string): void {
    this.currentLang = lang;
    this.translate.use(lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
  }

  logout(): void {
    this.authService.logout();
  }
}
