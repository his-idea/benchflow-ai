import { z } from 'zod';
import type { Course } from '../../shared/types.js';
import { COURSE_LEVELS, COURSE_STATUSES } from '../../shared/types.js';

export const SORT_OPTIONS = ['relevance', 'title', 'duration'] as const;
export type CourseSort = (typeof SORT_OPTIONS)[number];

/** Query parameters shared by GET /courses and GET /recommendations/courses. */
export const courseQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  level: z.enum(COURSE_LEVELS).optional(),
  skill: z.string().trim().max(60).optional(),
  minDuration: z.coerce.number().min(0).optional(),
  maxDuration: z.coerce.number().min(0).optional(),
  status: z.enum(COURSE_STATUSES).optional(),
  sort: z.enum(SORT_OPTIONS).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
});
export type CourseQuery = z.infer<typeof courseQuerySchema>;

/** Case-insensitive match on title, description, provider, skill ids, and skill names. */
export function applyCourseFilters(
  courses: readonly Course[],
  query: CourseQuery,
  skillNames: ReadonlyMap<string, string>,
): Course[] {
  const needle = query.search?.toLowerCase();
  return courses.filter((c) => {
    if (query.status && c.status !== query.status) return false;
    if (query.level && c.level !== query.level) return false;
    if (query.skill && !c.skillTags.includes(query.skill)) return false;
    if (query.minDuration !== undefined && c.durationHours < query.minDuration) return false;
    if (query.maxDuration !== undefined && c.durationHours > query.maxDuration) return false;
    if (needle) {
      const haystack = [
        c.title,
        c.description,
        c.provider,
        ...c.skillTags,
        ...c.skillTags.map((t) => skillNames.get(t) ?? ''),
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
}

export function paginate<T>(items: readonly T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
}
