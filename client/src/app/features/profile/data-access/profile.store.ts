import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiError } from '../../../core/http/api-error';
import type { LoadState, ProfilePatch, UserProfile } from '../../../shared/models/api.models';
import { ProfileApiService } from './profile-api.service';

@Injectable({ providedIn: 'root' })
export class ProfileStore {
  private readonly api = inject(ProfileApiService);

  readonly profile = signal<UserProfile | null>(null);
  readonly status = signal<LoadState>('idle');
  readonly error = signal<ApiError | null>(null);

  /** Average self-assessed level as a 0-100 figure. A snapshot of the profile, not an assessment. */
  readonly averageReadiness = computed(() => {
    const skills = this.profile()?.skills ?? [];
    if (skills.length === 0) return 0;
    return Math.round((skills.reduce((sum, s) => sum + s.level, 0) / (skills.length * 5)) * 100);
  });

  async load(force = false): Promise<void> {
    if (!force && (this.status() === 'success' || this.status() === 'loading')) return;
    this.status.set('loading');
    try {
      this.profile.set(await firstValueFrom(this.api.get()));
      this.error.set(null);
      this.status.set('success');
    } catch (e) {
      this.error.set(e as ApiError);
      this.status.set('error');
    }
  }

  /** Throws the ApiError so the form can show field-level messages. */
  async save(patch: ProfilePatch): Promise<UserProfile> {
    const updated = await firstValueFrom(this.api.update(patch));
    this.profile.set(updated);
    return updated;
  }
}
