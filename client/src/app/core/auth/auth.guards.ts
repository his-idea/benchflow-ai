import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MockAuthService } from './mock-auth.service';

/** Requires a signed-in user. With the mock identity everyone is signed in. */
export const authGuard: CanActivateFn = () => {
  return inject(MockAuthService).isAuthenticated()
    ? true
    : inject(Router).createUrlTree(['/dashboard']);
};

/** Admin routes. The server enforces roles too; this only hides screens that would be refused. */
export const adminGuard: CanActivateFn = () => {
  return inject(MockAuthService).isAdmin() ? true : inject(Router).createUrlTree(['/dashboard']);
};
