import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { APP_CONFIG } from '../../../core/config/app-config';
import type { PlanCreateInput, PlanItemPatch, PlanView } from '../../../shared/models/api.models';

@Injectable({ providedIn: 'root' })
export class PlanApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(APP_CONFIG).apiBaseUrl}/learning-plans`;

  current() {
    return this.http.get<{ plan: PlanView | null }>(`${this.base}/current`);
  }
  create(input: PlanCreateInput) {
    return this.http.post<PlanView>(this.base, input);
  }
  addItem(planId: string, courseId: string, targetWeek?: number) {
    return this.http.post<PlanView>(`${this.base}/${planId}/items`, {
      courseId,
      ...(targetWeek ? { targetWeek } : {}),
    });
  }
  updateItem(planId: string, itemId: string, patch: PlanItemPatch) {
    return this.http.patch<PlanView>(`${this.base}/${planId}/items/${itemId}`, patch);
  }
  removeItem(planId: string, itemId: string) {
    return this.http.delete<PlanView>(`${this.base}/${planId}/items/${itemId}`);
  }
}
