import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiError } from '../../../core/http/api-error';
import type { ChatEntry } from '../../../shared/models/api.models';
import { PlanDraftStore } from '../../learning-plan/data-access/plan-draft.store';
import { AssistantApiService } from './assistant-api.service';

let counter = 0;
const localId = (): string => `local-${Date.now()}-${(counter += 1)}`;

/** Chat state. A failed message stays in the transcript so the person can retry without retyping. */
@Injectable({ providedIn: 'root' })
export class AssistantStore {
  private readonly api = inject(AssistantApiService);
  private readonly drafts = inject(PlanDraftStore);

  readonly entries = signal<ChatEntry[]>([]);
  readonly conversationId = signal<string | undefined>(undefined);
  readonly sending = signal(false);
  readonly error = signal<ApiError | null>(null);
  private pending: { kind: 'message'; text: string } | { kind: 'plan' } | null = null;

  async send(text: string): Promise<void> {
    const message = text.trim();
    if (!message || this.sending()) return;
    this.entries.update((list) => [...list, { id: localId(), role: 'user', text: message }]);
    this.pending = { kind: 'message', text: message };
    await this.run();
  }

  async generatePlan(): Promise<void> {
    if (this.sending()) return;
    this.pending = { kind: 'plan' };
    await this.run();
  }

  /** Re-send the last failed request without adding the user's message a second time. */
  async retry(): Promise<void> {
    if (this.pending && !this.sending()) await this.run();
  }

  clear(): void {
    this.entries.set([]);
    this.conversationId.set(undefined);
    this.error.set(null);
    this.pending = null;
  }

  private async run(): Promise<void> {
    const request = this.pending;
    if (!request) return;
    this.sending.set(true);
    this.error.set(null);
    try {
      if (request.kind === 'message') {
        const reply = await firstValueFrom(this.api.send(request.text, this.conversationId()));
        this.accept(reply);
      } else {
        const reply = await this.drafts.generate(this.conversationId());
        if (!reply)
          throw (
            this.drafts.error() ??
            new ApiError('Something went wrong. Please try again.', 0, 'UNKNOWN', null)
          );
        this.accept(reply);
      }
      this.pending = null;
    } catch (e) {
      this.error.set(e as ApiError);
    } finally {
      this.sending.set(false);
    }
  }

  private accept(reply: import('../../../shared/models/api.models').AssistantReply): void {
    this.conversationId.set(reply.conversationId);
    this.entries.update((list) => [
      ...list,
      {
        id: reply.message.id,
        role: 'assistant',
        text: reply.message.text,
        suggestedActions: reply.message.suggestedActions,
        grounding: reply.grounding,
        recommendedCourseIds: reply.recommendedCourseIds,
        fallback: reply.fallback,
      },
    ]);
  }
}
