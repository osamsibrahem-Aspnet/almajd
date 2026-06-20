import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Inverse of staffGuard / customerGuard. Gates routes that should only render for anonymous
 * visitors (e.g. /login). If the visitor is already authenticated, redirect to the landing page
 * appropriate for their role — staff → admin dashboard, customer → /shop.
 */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated) {
    return true;
  }

  const STAFF_ROLES = [
    'Admin',
    'SalesRep',
    'WarehouseOperator',
    'WarehouseManager',
    'Procurement',
    'Accountant',
    'OpsManager'
  ];

  if (auth.hasRole(...STAFF_ROLES)) {
    return router.createUrlTree(['/admin/dashboard']);
  }
  if (auth.hasRole('Customer')) {
    return router.createUrlTree(['/shop']);
  }

  return router.createUrlTree(['/forbidden']);
};
