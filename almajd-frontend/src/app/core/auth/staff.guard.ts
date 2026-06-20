import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Gates the /admin/* tree to users that hold at least one staff role.
 * A pure Customer (OTP-only B2B account) is authenticated but has no staff role —
 * sending them to /admin/* would expose internal screens. Block at the perimeter.
 */
export const staffGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated) {
    return router.createUrlTree(['/login']);
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
    return true;
  }

  return router.createUrlTree(['/forbidden']);
};
