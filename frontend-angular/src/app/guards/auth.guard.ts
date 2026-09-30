import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    const requiredRole = route.data?.['role'];
    if (requiredRole && auth.userRole() !== requiredRole && auth.userRole() !== 'admin') {
      auth.redirectAfterLogin(auth.userRole() || 'paciente');
      return false;
    }
    return true;
  }

  router.navigate(['/login']);
  return false;
};
