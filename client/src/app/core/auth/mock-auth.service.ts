import { Injectable, computed, inject, signal } from '@angular/core';
import { APP_CONFIG } from '../config/app-config';
import type { Role } from '../../shared/models/api.models';

const STORAGE_KEY = 'benchflow.mockRole';

/**
 * DEVELOPMENT-ONLY identity. The role is a public UI setting stored in the browser; the server
 * trusts it only while AUTH_MODE=mock, and refuses to run that way in production.
 *
 * Replace this service with an MSAL-backed implementation exposing the same `role`,
 * `isAdmin`, and `isAuthenticated` signals when adopting Microsoft Entra ID.
 */
@Injectable({ providedIn: 'root' })
export class MockAuthService {
  private readonly config = inject(APP_CONFIG);
  private readonly _role = signal<Role>(this.readStoredRole());

  readonly role = this._role.asReadonly();
  readonly isAdmin = computed(() => this._role() === 'admin');
  readonly isAuthenticated = computed(() => true);
  readonly canSwitchRole = this.config.enableMockAuth;

  setRole(role: Role): void {
    if (!this.config.enableMockAuth) return;
    this._role.set(role);
    try {
      localStorage.setItem(STORAGE_KEY, role);
    } catch {
      // Storage can be unavailable (private mode); the in-memory role still works.
    }
  }

  private readStoredRole(): Role {
    if (!this.config.enableMockAuth) return 'employee';
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'admin' ? 'admin' : 'employee';
    } catch {
      return 'employee';
    }
  }
}
