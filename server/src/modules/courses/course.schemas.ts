import { z } from 'zod';
import { COURSE_LEVELS, COURSE_STATUSES } from '../../shared/types.js';

const httpUrl = z
  .string()
  .trim()
  .max(300)
  .refine((v) => {
    try {
      return ['http:', 'https:'].includes(new URL(v).protocol);
    } catch {
      return false;
    }
  }, 'Must be a valid http(s) URL.');

export const courseCreateSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    provider: z.string().trim().min(1).max(80),
    description: z.string().trim().min(10).max(600),
    skillTags: z.array(z.string().trim().min(1).max(60)).min(1).max(10),
    level: z.enum(COURSE_LEVELS),
    durationHours: z.number().positive().max(200),
    prerequisites: z.array(z.string().trim().min(1).max(60)).max(10).default([]),
    url: httpUrl.optional(),
    status: z.enum(COURSE_STATUSES).default('draft'),
  })
  .strict();

export const coursePatchSchema = courseCreateSchema.partial().strict();

export type CourseCreate = z.infer<typeof courseCreateSchema>;
export type CoursePatch = z.infer<typeof coursePatchSchema>;
