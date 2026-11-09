import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { APP_CONFIG } from '../../../core/config/app-config';
import type { ProfilePatch, UserProfile } from '../../../shared/models/api.models';

@Injectable({ providedIn: 'root' })
export class ProfileApiService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(APP_CONFIG).apiBaseUrl;

  get() {
    return this.http.get<UserProfile>(`${this.base}/profile/me`);
  }

  update(patch: ProfilePatch) {
    return this.http.patch<UserProfile>(`${this.base}/profile/me`, patch);
  }
}
