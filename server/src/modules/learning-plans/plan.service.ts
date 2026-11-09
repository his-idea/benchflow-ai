import { randomUUID } from 'node:crypto';
import type { Repositories } from '../../data/repositories.js';
import { AppError } from '../../shared/errors.js';
import type { LearningPlan, PlanItem, PlanItemStatus } from '../../shared/types.js';
import { PLAN_WEEKS } from '../recommendations/scoring.js';
import type { PlanCreate, PlanItemCreate, PlanItemPatch } from './plan.schemas.js';

export interface PlanItemView {
  id: string;
  courseId: string;
  courseTitle: string;
  provider: string;
  durationHours: number;
  sequence: number;
  targetWeek: number;
  status: PlanItemStatus;
}

export interface PlanView {
  id: string;
  title: string;
  startDate: string;
  targetDate: string;
  status: LearningPlan['status'];
  createdAt: string;
  items: PlanItemView[];
  /** Progress through the plan's own milestones. It is not an assessment of the person. */
  progress: { completed: number; total: number; percent: number };
}

const DAY_MS = 86_400_000;

export class PlanService {
  constructor(
    private readonly repos: Repositories,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async getCurrent(userId: string): Promise<PlanView | null> {
    const plan = await this.repos.plans.getCurrent(userId);
    return plan ? this.toView(plan) : null;
  }

  async create(userId: string, input: PlanCreate): Promise<PlanView> {
    const ids = input.items.map((i) => i.courseId);
    if (new Set(ids).size !== ids.length) {
      throw AppError.validation('A course can only appear once in a plan.', [
        { path: 'items', message: 'Duplicate courseId.' },
      ]);
    }
    for (const id of ids) await this.requireActiveCourse(id);

    const start = input.startDate ?? this.now().toISOString().slice(0, 10);
    const target =
      input.targetDate ??
      new Date(Date.parse(start) + (PLAN_WEEKS * 7 - 1) * DAY_MS).toISOString().slice(0, 10);
    if (target < start) {
      throw AppError.validation('The target date must not be before the start date.', [
        { path: 'targetDate', message: 'Must be on or after the start date.' },
      ]);
    }

    const planId = `plan-${randomUUID()}`;
    const courses = new Map((await this.repos.courses.list()).map((c) => [c.id, c]));
    const load = new Array<number>(PLAN_WEEKS).fill(0);
    const items: PlanItem[] = input.items.map((item, index) => {
      const hours = courses.get(item.courseId)?.durationHours ?? 0;
      const week = item.targetWeek ?? leastLoadedWeek(load);
      load[week - 1] = (load[week - 1] ?? 0) + hours;
      return {
        id: `item-${randomUUID()}`,
        planId,
        courseId: item.courseId,
        sequence: index + 1,
        targetWeek: week,
        status: 'planned' as const,
      };
    });

    // Replacing the plan archives the previous one rather than deleting it.
    await this.repos.plans.archiveActive(userId);
    const plan = await this.repos.plans.save({
      id: planId,
      userId,
      title: input.title,
      startDate: start,
      targetDate: target,
      status: 'active',
      createdAt: this.now().toISOString(),
      items,
    });
    return this.toView(plan);
  }

  async addItem(userId: string, planId: string, input: PlanItemCreate): Promise<PlanView> {
    const plan = await this.ownedPlan(userId, planId);
    await this.requireActiveCourse(input.courseId);
    if (plan.items.some((i) => i.courseId === input.courseId)) {
      throw AppError.conflict('This course is already in your plan.');
    }
    const week = input.targetWeek ?? leastLoadedWeek(await this.weekLoad(plan));
    plan.items.push({
      id: `item-${randomUUID()}`,
      planId: plan.id,
      courseId: input.courseId,
      sequence: plan.items.length + 1,
      targetWeek: week,
      status: 'planned',
    });
    return this.toView(await this.repos.plans.save(plan));
  }

  async updateItem(
    userId: string,
    planId: string,
    itemId: string,
    patch: PlanItemPatch,
  ): Promise<PlanView> {
    const plan = await this.ownedPlan(userId, planId);
    const item = plan.items.find((i) => i.id === itemId);
    if (!item) throw AppError.notFound('Plan item not found.');
    if (patch.status !== undefined) item.status = patch.status;
    if (patch.targetWeek !== undefined) item.targetWeek = patch.targetWeek;
    if (patch.sequence !== undefined) {
      const ordered = [...plan.items]
        .sort((a, b) => a.sequence - b.sequence)
        .filter((i) => i.id !== itemId);
      ordered.splice(Math.min(patch.sequence - 1, ordered.length), 0, item);
      plan.items = renumber(ordered);
    }
    return this.toView(await this.repos.plans.save(plan));
  }

  async removeItem(userId: string, planId: string, itemId: string): Promise<PlanView> {
    const plan = await this.ownedPlan(userId, planId);
    if (!plan.items.some((i) => i.id === itemId)) throw AppError.notFound('Plan item not found.');
    plan.items = renumber(
      [...plan.items].sort((a, b) => a.sequence - b.sequence).filter((i) => i.id !== itemId),
    );
    return this.toView(await this.repos.plans.save(plan));
  }

  /** Another user's plan is reported as not found so existence is not leaked. */
  private async ownedPlan(userId: string, planId: string): Promise<LearningPlan> {
    const plan = await this.repos.plans.get(planId);
    if (!plan || plan.userId !== userId || plan.status !== 'active')
      throw AppError.notFound('Learning plan not found.');
    return plan;
  }

  private async requireActiveCourse(courseId: string): Promise<void> {
    const course = await this.repos.courses.get(courseId);
    if (!course || course.status !== 'active') {
      throw AppError.validation('The plan references a course that is not available.', [
        { path: 'courseId', message: `Course "${courseId}" is not available.` },
      ]);
    }
  }

  private async weekLoad(plan: LearningPlan): Promise<number[]> {
    const courses = new Map((await this.repos.courses.list()).map((c) => [c.id, c]));
    const load = new Array<number>(PLAN_WEEKS).fill(0);
    for (const item of plan.items) {
      const index = item.targetWeek - 1;
      load[index] = (load[index] ?? 0) + (courses.get(item.courseId)?.durationHours ?? 0);
    }
    return load;
  }

  private async toView(plan: LearningPlan): Promise<PlanView> {
    const courses = new Map((await this.repos.courses.list()).map((c) => [c.id, c]));
    const items = [...plan.items]
      .sort((a, b) => a.sequence - b.sequence)
      .map((item) => {
        const course = courses.get(item.courseId);
        return {
          id: item.id,
          courseId: item.courseId,
          courseTitle: course?.title ?? 'Course no longer available',
          provider: course?.provider ?? '',
          durationHours: course?.durationHours ?? 0,
          sequence: item.sequence,
          targetWeek: item.targetWeek,
          status: item.status,
        };
      });
    const completed = items.filter((i) => i.status === 'completed').length;
    return {
      id: plan.id,
      title: plan.title,
      startDate: plan.startDate,
      targetDate: plan.targetDate,
      status: plan.status,
      createdAt: plan.createdAt,
      items,
      progress: {
        completed,
        total: items.length,
        percent: items.length === 0 ? 0 : Math.round((completed / items.length) * 100),
      },
    };
  }
}

function leastLoadedWeek(load: readonly number[]): number {
  let best = 0;
  load.forEach((hours, index) => {
    if (hours < (load[best] ?? Infinity)) best = index;
  });
  return best + 1;
}

function renumber(items: PlanItem[]): PlanItem[] {
  return items.map((item, index) => ({ ...item, sequence: index + 1 }));
}
