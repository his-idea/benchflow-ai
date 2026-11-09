import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { APP_CONFIG } from '../../../core/config/app-config';
import type { AssistantReply, PlanGenerationReply } from '../../../shared/models/api.models';

@Injectable({ providedIn: 'root' })
export class AssistantApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(APP_CONFIG).apiBaseUrl}/assistant`;

  send(message: string, conversationId?: string) {
    return this.http.post<AssistantReply>(`${this.base}/messages`, {
      message,
      ...(conversationId ? { conversationId } : {}),
      context: { includeProfile: true, includeCurrentPlan: true },
    });
  }

  generatePlan(conversationId?: string) {
    return this.http.post<PlanGenerationReply>(
      `${this.base}/generate-plan`,
      conversationId ? { conversationId } : {},
    );
  }
}
