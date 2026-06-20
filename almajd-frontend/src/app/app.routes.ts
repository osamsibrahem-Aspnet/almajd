import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';
import { customerGuard } from './core/auth/customer.guard';
import { staffGuard } from './core/auth/staff.guard';
import { guestGuard } from './core/auth/guest.guard';
import { AdminShellComponent } from './shared/layout/admin-shell.component';
import { CustomerShellComponent } from './shared/layout/customer-shell.component';

export const routes: Routes = [
  // Root redirect
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // Public routes
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'forbidden',
    loadComponent: () => import('./pages/forbidden.component').then(m => m.ForbiddenComponent)
  },

  // Customer shop shell (anonymous-allowed for browsing)
  {
    path: 'shop',
    component: CustomerShellComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/shop/pages/shop-browse.component').then(m => m.ShopBrowseComponent)
      },
      {
        path: 'category/:slug',
        loadComponent: () =>
          import('./features/shop/pages/shop-browse.component').then(m => m.ShopBrowseComponent)
      },
      {
        path: 'products/:slug',
        loadComponent: () =>
          import('./features/shop/pages/product-detail.component').then(m => m.ProductDetailComponent)
      },
      {
        path: 'cart',
        loadComponent: () =>
          import('./features/shop/pages/cart.component').then(m => m.CartComponent)
      },
      {
        path: 'orders/:id/confirmation',
        loadComponent: () =>
          import('./features/shop/pages/order-confirmation.component').then(m => m.OrderConfirmationComponent)
      },
    ]
  },

  // My orders (requires Customer role)
  {
    path: 'my-orders',
    component: CustomerShellComponent,
    canActivate: [customerGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/my-orders/pages/my-orders-list.component').then(m => m.MyOrdersListComponent)
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./features/my-orders/pages/my-order-detail.component').then(m => m.MyOrderDetailComponent)
      },
    ]
  },

  // Account (requires Customer role)
  {
    path: 'account',
    component: CustomerShellComponent,
    canActivate: [customerGuard],
    children: [
      { path: '', redirectTo: 'profile', pathMatch: 'full' },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/account/pages/profile.component').then(m => m.ProfileComponent)
      },
      {
        path: 'addresses',
        loadComponent: () =>
          import('./features/account/pages/addresses.component').then(m => m.AddressesComponent)
      },
      {
        path: 'statements',
        loadComponent: () =>
          import('./features/account/pages/statements.component').then(m => m.StatementsComponent)
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/account/pages/notifications-inbox.component').then(m => m.NotificationsInboxComponent)
      },
    ]
  },

  // Admin shell — staff-only. Customers (OTP) are authenticated but have no staff role
  // and would otherwise slip through `authGuard`. `staffGuard` rejects them at the perimeter.
  {
    path: 'admin',
    component: AdminShellComponent,
    canActivate: [staffGuard],
    children: [
      // Dashboard
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard.component').then(m => m.DashboardComponent)
      },

      // Catalog
      {
        path: 'catalog',
        children: [
          { path: '', redirectTo: 'products', pathMatch: 'full' },
          {
            path: 'brands',
            loadComponent: () =>
              import('./features/catalog/pages/brands/brands.component').then(m => m.BrandsComponent),
            canActivate: [roleGuard],
            data: { roles: ['Admin', 'SalesRep'] }
          },
          {
            path: 'categories',
            loadComponent: () =>
              import('./features/catalog/pages/categories/categories.component').then(m => m.CategoriesComponent),
            canActivate: [roleGuard],
            data: { roles: ['Admin', 'SalesRep'] }
          },
          {
            path: 'products',
            loadComponent: () =>
              import('./features/catalog/pages/products/products-list.component').then(m => m.ProductsListComponent)
          },
          {
            path: 'products/:id',
            loadComponent: () =>
              import('./features/catalog/pages/products/product-detail.component').then(m => m.ProductDetailComponent)
          },
        ]
      },

      // Customers
      {
        path: 'customers',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/customers/pages/customers-list.component').then(m => m.CustomersListComponent),
            canActivate: [roleGuard],
            data: { roles: ['Admin', 'SalesRep', 'Accountant', 'OpsManager'] }
          },
          {
            path: 'new',
            loadComponent: () =>
              import('./features/customers/pages/customer-create.component').then(m => m.CustomerCreateComponent),
            canActivate: [roleGuard],
            data: { roles: ['Admin', 'SalesRep'] }
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./features/customers/pages/customer-detail.component').then(m => m.CustomerDetailComponent)
          },
        ]
      },

      // Orders
      {
        path: 'orders',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/orders/pages/orders-list.component').then(m => m.OrdersListComponent)
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./features/orders/pages/order-detail.component').then(m => m.OrderDetailComponent)
          },
        ]
      },

      // Inventory
      {
        path: 'inventory',
        canActivate: [roleGuard],
        data: { roles: ['Admin', 'WarehouseOperator', 'WarehouseManager', 'Procurement'] },
        children: [
          { path: '', redirectTo: 'stock', pathMatch: 'full' },
          {
            path: 'stock',
            loadComponent: () =>
              import('./features/inventory/pages/stock-list.component').then(m => m.StockListComponent)
          },
          {
            path: 'movements',
            loadComponent: () =>
              import('./features/inventory/pages/movements-list.component').then(m => m.MovementsListComponent)
          },
          {
            path: 'warehouses',
            loadComponent: () =>
              import('./features/inventory/pages/warehouses.component').then(m => m.WarehousesComponent)
          },
          {
            path: 'warehouses/:warehouseId/locations',
            loadComponent: () =>
              import('./features/inventory/pages/locations.component').then(m => m.LocationsComponent)
          },
          {
            path: 'counts',
            loadComponent: () =>
              import('./features/inventory/pages/inventory-counts.component').then(m => m.InventoryCountsComponent)
          },
          {
            path: 'counts/:id',
            loadComponent: () =>
              import('./features/inventory/pages/inventory-count-detail.component').then(m => m.InventoryCountDetailComponent)
          },
        ]
      },

      // Fulfilment
      {
        path: 'fulfilment',
        canActivate: [roleGuard],
        data: { roles: ['Admin', 'WarehouseOperator', 'WarehouseManager', 'OpsManager'] },
        children: [
          { path: '', redirectTo: 'picklists', pathMatch: 'full' },
          {
            path: 'picklists',
            loadComponent: () =>
              import('./features/fulfilment/pages/picklists-list.component').then(m => m.PicklistsListComponent)
          },
          {
            path: 'picklists/:id',
            loadComponent: () =>
              import('./features/fulfilment/pages/pick-detail.component').then(m => m.PickDetailComponent)
          },
          {
            path: 'shipments',
            loadComponent: () =>
              import('./features/fulfilment/pages/shipments-list.component').then(m => m.ShipmentsListComponent)
          },
          {
            path: 'shipments/:id',
            loadComponent: () =>
              import('./features/fulfilment/pages/shipment-detail.component').then(m => m.ShipmentDetailComponent)
          },
        ]
      },

      // Purchasing
      {
        path: 'purchasing',
        canActivate: [roleGuard],
        data: { roles: ['Admin', 'Procurement', 'OpsManager', 'WarehouseManager', 'Accountant'] },
        children: [
          { path: '', redirectTo: 'suppliers', pathMatch: 'full' },
          {
            path: 'suppliers',
            loadComponent: () =>
              import('./features/purchasing/pages/suppliers-list.component').then(m => m.SuppliersListComponent)
          },
          {
            path: 'suppliers/:id',
            loadComponent: () =>
              import('./features/purchasing/pages/supplier-detail.component').then(m => m.SupplierDetailComponent)
          },
          {
            path: 'compare',
            loadComponent: () =>
              import('./features/purchasing/pages/supplier-compare.component').then(m => m.SupplierCompareComponent)
          },
          {
            path: 'purchase-orders',
            loadComponent: () =>
              import('./features/purchasing/pages/po-list.component').then(m => m.PoListComponent)
          },
          {
            path: 'purchase-orders/new',
            loadComponent: () =>
              import('./features/purchasing/pages/po-create.component').then(m => m.PoCreateComponent)
          },
          {
            path: 'purchase-orders/:id',
            loadComponent: () =>
              import('./features/purchasing/pages/po-detail.component').then(m => m.PoDetailComponent)
          },
          {
            path: 'purchase-orders/:id/edit',
            loadComponent: () =>
              import('./features/purchasing/pages/po-edit.component').then(m => m.PoEditComponent)
          },
          {
            path: 'goods-receipts',
            loadComponent: () =>
              import('./features/purchasing/pages/gr-list.component').then(m => m.GrListComponent)
          },
          {
            path: 'goods-receipts/new',
            loadComponent: () =>
              import('./features/purchasing/pages/gr-create.component').then(m => m.GrCreateComponent)
          },
          {
            path: 'goods-receipts/:id',
            loadComponent: () =>
              import('./features/purchasing/pages/gr-detail.component').then(m => m.GrDetailComponent)
          },
          {
            path: 'replenishment',
            loadComponent: () =>
              import('./features/purchasing/pages/replenishment.component').then(m => m.ReplenishmentComponent)
          },
        ]
      },

      // Billing
      {
        path: 'billing',
        canActivate: [roleGuard],
        data: { roles: ['Admin', 'Accountant', 'OpsManager', 'SalesRep'] },
        children: [
          { path: '', redirectTo: 'invoices', pathMatch: 'full' },
          {
            path: 'invoices',
            loadComponent: () =>
              import('./features/billing/pages/invoices-list.component').then(m => m.InvoicesListComponent)
          },
          {
            path: 'invoices/issue',
            loadComponent: () =>
              import('./features/billing/pages/issue-invoice.component').then(m => m.IssueInvoiceComponent)
          },
          {
            path: 'invoices/:id',
            loadComponent: () =>
              import('./features/billing/pages/invoice-detail.component').then(m => m.InvoiceDetailComponent)
          },
          {
            path: 'payments',
            loadComponent: () =>
              import('./features/billing/pages/payments-list.component').then(m => m.PaymentsListComponent),
            canActivate: [roleGuard],
            data: { roles: ['Admin', 'Accountant', 'OpsManager'] }
          },
          {
            path: 'payments/new',
            loadComponent: () =>
              import('./features/billing/pages/record-payment.component').then(m => m.RecordPaymentComponent),
            canActivate: [roleGuard],
            data: { roles: ['Admin', 'Accountant'] }
          },
          {
            path: 'payments/:id',
            loadComponent: () =>
              import('./features/billing/pages/payment-detail.component').then(m => m.PaymentDetailComponent),
            canActivate: [roleGuard],
            data: { roles: ['Admin', 'Accountant', 'OpsManager'] }
          },
          {
            path: 'ar',
            loadComponent: () =>
              import('./features/billing/pages/ar-aging.component').then(m => m.ArAgingComponent),
            canActivate: [roleGuard],
            data: { roles: ['Admin', 'Accountant', 'OpsManager'] }
          },
          {
            path: 'ar/:id',
            loadComponent: () =>
              import('./features/billing/pages/customer-ar.component').then(m => m.CustomerArComponent),
            canActivate: [roleGuard],
            data: { roles: ['Admin', 'Accountant', 'OpsManager'] }
          },
        ]
      },

      // Reports
      {
        path: 'reports',
        canActivate: [roleGuard],
        data: { roles: ['Admin', 'OpsManager', 'Accountant', 'SalesRep'] },
        children: [
          { path: '', redirectTo: 'sales', pathMatch: 'full' },
          {
            path: 'sales',
            loadComponent: () =>
              import('./features/reports/pages/sales-report.component').then(m => m.SalesReportComponent)
          },
          {
            path: 'profit',
            loadComponent: () =>
              import('./features/reports/pages/profit-report.component').then(m => m.ProfitReportComponent)
          },
          {
            path: 'top-customers',
            loadComponent: () =>
              import('./features/reports/pages/top-customers-report.component').then(m => m.TopCustomersReportComponent)
          },
          {
            path: 'supplier-spend',
            loadComponent: () =>
              import('./features/reports/pages/supplier-spend-report.component').then(m => m.SupplierSpendReportComponent)
          },
          {
            path: 'kpis',
            loadComponent: () =>
              import('./features/reports/pages/kpis-report.component').then(m => m.KpisReportComponent)
          },
        ]
      },

      // System
      {
        path: 'system',
        canActivate: [roleGuard],
        data: { roles: ['Admin'] },
        children: [
          { path: '', redirectTo: 'users', pathMatch: 'full' },
          {
            path: 'users',
            loadComponent: () =>
              import('./features/system/pages/users-list.component').then(m => m.UsersListComponent)
          },
          {
            path: 'users/new',
            loadComponent: () =>
              import('./features/system/pages/user-create.component').then(m => m.UserCreateComponent)
          },
          {
            path: 'users/:id',
            loadComponent: () =>
              import('./features/system/pages/user-detail.component').then(m => m.UserDetailComponent)
          },
          {
            path: 'templates',
            loadComponent: () =>
              import('./features/system/pages/notification-templates.component').then(m => m.NotificationTemplatesComponent)
          },
          {
            path: 'roles',
            loadComponent: () =>
              import('./features/system/pages/roles-page.component').then(m => m.RolesPageComponent)
          },
          {
            path: 'audit',
            loadComponent: () =>
              import('./features/system/pages/audit-placeholder.component').then(m => m.AuditPlaceholderComponent)
          },
        ]
      },

      // Default admin redirect
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ]
  },

  // Catch-all
  { path: '**', redirectTo: 'login' }
];
