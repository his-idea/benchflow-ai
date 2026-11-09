import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { adminGuard, authGuard } from './auth.guards';
import { MockAuthService } from './mock-auth.service';

describe('route guards', () => {
  const run = (guard: typeof adminGuard) =>
    TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('lets signed-in users through authGuard', () => {
    expect(run(authGuard)).toBe(true);
  });

  it('redirects employees away from admin routes', () => {
    const result = run(adminGuard);
    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/dashboard');
  });

  it('lets admins through adminGuard', () => {
    TestBed.inject(MockAuthService).setRole('admin');
    expect(run(adminGuard)).toBe(true);
  });

  it('remembers the chosen mock role', () => {
    TestBed.inject(MockAuthService).setRole('admin');
    TestBed.resetTestingModule();
    expect(TestBed.inject(MockAuthService).role()).toBe('admin');
  });
});
