import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    const requiredRole = route.data?.['roles'] || route.data?.['role'];
    if (requiredRole) {
      const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      const currentRole = auth.userRole();
      if (!currentRole || !allowedRoles.includes(currentRole)) {
        auth.redirectAfterLogin(currentRole || 'paciente');
        return false;
      }
    }
    return true;
  }

  router.navigate(['/login']);
  return false;
};
