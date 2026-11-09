import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiError } from '../../../core/http/api-error';
import { NotificationService } from '../../../core/services/notification.service';
import type {
  LoadState,
  PlanItemPatch,
  PlanItemStatus,
  PlanView,
} from '../../../shared/models/api.models';
import { PlanApiService } from './plan-api.service';

const DEFAULT_PLAN_TITLE = 'My four-week learning plan';

@Injectable({ providedIn: 'root' })
export class PlanStore {
  private readonly api = inject(PlanApiService);
  private readonly notify = inject(NotificationService);

  readonly plan = signal<PlanView | null>(null);
  readonly status = signal<LoadState>('idle');
  readonly error = signal<ApiError | null>(null);
  readonly busy = signal(false);

  readonly items = computed(() => this.plan()?.items ?? []);
  readonly courseIds = computed(() => new Set(this.items().map((i) => i.courseId)));
  readonly progress = computed(
    () => this.plan()?.progress ?? { completed: 0, total: 0, percent: 0 },
  );
  readonly weeks = computed(() =>
    [1, 2, 3, 4].map((week) => {
      const items = this.items().filter((i) => i.targetWeek === week);
      return { week, items, hours: items.reduce((sum, i) => sum + i.durationHours, 0) };
    }),
  );

  inPlan(courseId: string): boolean {
    return this.courseIds().has(courseId);
  }

  async load(force = false): Promise<void> {
    if (!force && (this.status() === 'success' || this.status() === 'loading')) return;
    this.status.set('loading');
    try {
      this.plan.set((await firstValueFrom(this.api.current())).plan);
      this.error.set(null);
      this.status.set('success');
    } catch (e) {
      this.error.set(e as ApiError);
      this.status.set('error');
    }
  }

  /** Add a course, creating the plan first if the person does not have one yet. */
  async addCourse(courseId: string, courseTitle: string): Promise<void> {
    await this.mutate(() => {
      const plan = this.plan();
      return plan
        ? this.api.addItem(plan.id, courseId)
        : this.api.create({ title: DEFAULT_PLAN_TITLE, items: [{ courseId }] });
    }, `Added "${courseTitle}" to your plan.`);
  }

  async removeCourse(courseId: string, courseTitle: string): Promise<void> {
    const item = this.items().find((i) => i.courseId === courseId);
    if (item) await this.removeItem(item.id, courseTitle);
  }

  async removeItem(itemId: string, courseTitle: string): Promise<void> {
    const plan = this.plan();
    if (!plan) return;
    await this.mutate(
      () => this.api.removeItem(plan.id, itemId),
      `Removed "${courseTitle}" from your plan.`,
    );
  }

  async setStatus(itemId: string, status: PlanItemStatus): Promise<void> {
    await this.patch(itemId, { status });
  }
  async setWeek(itemId: string, targetWeek: number): Promise<void> {
    await this.patch(itemId, { targetWeek });
  }
  async move(itemId: string, direction: -1 | 1): Promise<void> {
    const item = this.items().find((i) => i.id === itemId);
    if (item) await this.patch(itemId, { sequence: item.sequence + direction });
  }

  async createPlan(
    title: string,
    items: { courseId: string; targetWeek?: number }[],
  ): Promise<void> {
    await this.mutate(() => this.api.create({ title, items }), 'Saved your learning plan.');
  }

  private async patch(itemId: string, patch: PlanItemPatch): Promise<void> {
    const plan = this.plan();
    if (!plan) return;
    await this.mutate(() => this.api.updateItem(plan.id, itemId, patch));
  }

  private async mutate(
    call: () => ReturnType<PlanApiService['create']>,
    success?: string,
  ): Promise<void> {
    this.busy.set(true);
    try {
      this.plan.set(await firstValueFrom(call()));
      this.status.set('success');
      if (success) this.notify.success(success);
    } catch (e) {
      this.notify.error(e);
    } finally {
      this.busy.set(false);
    }
  }
}
