import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiError } from '../../../core/http/api-error';
import { NotificationService } from '../../../core/services/notification.service';
import type {
  PlanDraft,
  PlanDraftItem,
  PlanGenerationReply,
} from '../../../shared/models/api.models';
import { AssistantApiService } from '../../assistant/data-access/assistant-api.service';
import { PlanStore } from './plan.store';

/**
 * An assistant-generated plan draft that the person edits locally before saving. Nothing is
 * stored on the server until they choose "Save as my plan".
 */
@Injectable({ providedIn: 'root' })
export class PlanDraftStore {
  private readonly api = inject(AssistantApiService);
  private readonly plans = inject(PlanStore);
  private readonly notify = inject(NotificationService);

  readonly draft = signal<PlanDraft | null>(null);
  readonly title = signal('');
  readonly items = signal<PlanDraftItem[]>([]);
  readonly generating = signal(false);
  readonly saving = signal(false);
  readonly error = signal<ApiError | null>(null);
  readonly summary = signal('');

  readonly totalHours = computed(() => this.items().reduce((sum, i) => sum + i.durationHours, 0));

  /** Returns the full reply so the chat can show the assistant's description of the draft. */
  async generate(conversationId?: string): Promise<PlanGenerationReply | null> {
    this.generating.set(true);
    this.error.set(null);
    try {
      const reply = await firstValueFrom(this.api.generatePlan(conversationId));
      this.draft.set(reply.draft);
      this.title.set(reply.draft.title);
      this.items.set(reply.draft.items.map((i) => ({ ...i })));
      this.summary.set(reply.message.text);
      return reply;
    } catch (e) {
      this.error.set(e as ApiError);
      this.notify.error(e);
      return null;
    } finally {
      this.generating.set(false);
    }
  }

  setTitle(title: string): void {
    this.title.set(title);
  }

  setWeek(courseId: string, targetWeek: number): void {
    this.items.update((list) =>
      list.map((i) => (i.courseId === courseId ? { ...i, targetWeek } : i)),
    );
  }

  move(courseId: string, direction: -1 | 1): void {
    this.items.update((list) => {
      const index = list.findIndex((i) => i.courseId === courseId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= list.length) return list;
      const next = [...list];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next.map((item, i) => ({ ...item, sequence: i + 1 }));
    });
  }

  remove(courseId: string): void {
    this.items.update((list) =>
      list.filter((i) => i.courseId !== courseId).map((item, i) => ({ ...item, sequence: i + 1 })),
    );
  }

  discard(): void {
    this.draft.set(null);
    this.items.set([]);
    this.summary.set('');
  }

  /** Saving replaces the current plan (the server archives the previous one). */
  async save(): Promise<boolean> {
    const title = this.title().trim();
    if (title.length < 3 || this.items().length === 0) return false;
    this.saving.set(true);
    try {
      await this.plans.createPlan(
        title,
        this.items().map((i) => ({ courseId: i.courseId, targetWeek: i.targetWeek })),
      );
      this.discard();
      return true;
    } finally {
      this.saving.set(false);
    }
  }
}
