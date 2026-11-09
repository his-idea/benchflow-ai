import { z } from 'zod';
import { PLAN_ITEM_STATUSES } from '../../shared/types.js';

const week = z.number().int().min(1).max(4);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD.');

export const planCreateSchema = z
  .object({
    title: z.string().trim().min(3).max(80),
    startDate: isoDate.optional(),
    targetDate: isoDate.optional(),
    items: z
      .array(
        z
          .object({ courseId: z.string().trim().min(1).max(100), targetWeek: week.optional() })
          .strict(),
      )
      .max(12)
      .default([]),
  })
  .strict();

export const planItemCreateSchema = z
  .object({ courseId: z.string().trim().min(1).max(100), targetWeek: week.optional() })
  .strict();

export const planItemPatchSchema = z
  .object({
    status: z.enum(PLAN_ITEM_STATUSES).optional(),
    targetWeek: week.optional(),
    sequence: z.number().int().min(1).max(50).optional(),
  })
  .strict()
  .refine(
    (v) => Object.values(v).some((x) => x !== undefined),
    'Provide at least one field to update.',
  );

export type PlanCreate = z.infer<typeof planCreateSchema>;
export type PlanItemCreate = z.infer<typeof planItemCreateSchema>;
export type PlanItemPatch = z.infer<typeof planItemPatchSchema>;
