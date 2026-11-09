import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { APP_CONFIG } from '../../../core/config/app-config';

export interface FeedbackInput {
  targetType: 'recommendation' | 'assistant';
  targetId: string;
  helpful: boolean;
  comment?: string;
}

@Injectable({ providedIn: 'root' })
export class FeedbackApiService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(APP_CONFIG).apiBaseUrl;

  submit(input: FeedbackInput) {
    return this.http.post<{ id: string }>(`${this.base}/feedback`, input);
  }
}
