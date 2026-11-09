import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { mockRoleInterceptor } from '../app/core/auth/mock-role.interceptor';
import { errorInterceptor } from '../app/core/http/error.interceptor';

/** The app's real HTTP pipeline (interceptors included) backed by HttpTestingController. */
export const provideTestHttp = () => [
  provideHttpClient(withInterceptors([mockRoleInterceptor, errorInterceptor])),
  provideHttpClientTesting(),
];
