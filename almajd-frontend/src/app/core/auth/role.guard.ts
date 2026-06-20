import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from './auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated) {
    return router.createUrlTree(['/login']);
  }

  const roles: string[] = route.data['roles'] ?? [];
  if (roles.length === 0 || auth.hasRole(...roles)) {
    return true;
  }

  return router.createUrlTree(['/forbidden']);
};
