import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { APP_CONFIG } from '../config/app-config';
import { MockAuthService } from './mock-auth.service';

/** Adds the mock role header to API calls in development only. */
export const mockRoleInterceptor: HttpInterceptorFn = (req, next) => {
  const config = inject(APP_CONFIG);
  if (!config.enableMockAuth || !req.url.startsWith(config.apiBaseUrl)) return next(req);
  return next(req.clone({ setHeaders: { 'x-mock-role': inject(MockAuthService).role() } }));
};
