import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '../config/app-config';
import { ApiError } from '../http/api-error';
import type {
  LoadState,
  RoleDefinition,
  Skill,
  SkillCatalog,
} from '../../shared/models/api.models';

/** Reference data (skills and roles) shared by the profile form, catalog filters and admin screens. */
@Injectable({ providedIn: 'root' })
export class SkillCatalogStore {
  private readonly http = inject(HttpClient);
  private readonly base = inject(APP_CONFIG).apiBaseUrl;

  readonly skills = signal<Skill[]>([]);
  readonly roles = signal<RoleDefinition[]>([]);
  readonly status = signal<LoadState>('idle');
  readonly error = signal<ApiError | null>(null);

  private readonly names = computed(() => new Map(this.skills().map((s) => [s.id, s.name])));
  readonly skillName = (id: string): string => this.names().get(id) ?? id;
  readonly roleName = (id: string): string => this.roles().find((r) => r.id === id)?.name ?? id;

  async load(force = false): Promise<void> {
    if (!force && (this.status() === 'success' || this.status() === 'loading')) return;
    this.status.set('loading');
    try {
      const catalog = await firstValueFrom(this.http.get<SkillCatalog>(`${this.base}/skills`));
      this.skills.set(catalog.skills);
      this.roles.set(catalog.roles);
      this.error.set(null);
      this.status.set('success');
    } catch (e) {
      this.error.set(e as ApiError);
      this.status.set('error');
    }
  }
}
