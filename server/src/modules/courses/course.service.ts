import type { Repositories } from '../../data/repositories.js';
import { AppError } from '../../shared/errors.js';
import { slugify, uniq } from '../../shared/text.js';
import type { Course, Page, Role } from '../../shared/types.js';
import type { CourseCreate, CoursePatch } from './course.schemas.js';
import { applyCourseFilters, paginate, type CourseQuery } from './course-query.js';

export class CourseService {
  constructor(private readonly repos: Repositories) {}

  /** Employees only ever see active courses; admins may filter by status. */
  async list(query: CourseQuery, role: Role): Promise<Page<Course>> {
    const [courses, skills] = await Promise.all([
      this.repos.courses.list(),
      this.repos.catalog.skills(),
    ]);
    const names = new Map(skills.map((s) => [s.id, s.name]));
    const effective: CourseQuery = role === 'admin' ? query : { ...query, status: 'active' };
    const filtered = applyCourseFilters(courses, effective, names);
    filtered.sort((a, b) =>
      query.sort === 'duration'
        ? a.durationHours - b.durationHours || a.title.localeCompare(b.title)
        : a.title.localeCompare(b.title),
    );
    return paginate(filtered, query.page, query.pageSize);
  }

  async get(id: string, role: Role): Promise<Course> {
    const course = await this.repos.courses.get(id);
    if (!course || (role !== 'admin' && course.status !== 'active'))
      throw AppError.notFound('Course not found.');
    return course;
  }

  async create(input: CourseCreate): Promise<Course> {
    await this.assertSkillsExist([...input.skillTags, ...input.prerequisites], input);
    const base = slugify(input.title) || 'course';
    let id = base;
    for (let n = 2; await this.repos.courses.get(id); n += 1) id = `${base}-${n}`;
    const course: Course = {
      id,
      title: input.title,
      provider: input.provider,
      description: input.description,
      skillTags: uniq(input.skillTags),
      level: input.level,
      durationHours: input.durationHours,
      prerequisites: uniq(input.prerequisites),
      status: input.status,
      ...(input.url ? { url: input.url } : {}),
    };
    return this.repos.courses.create(course);
  }

  async update(id: string, patch: CoursePatch): Promise<Course> {
    const existing = await this.repos.courses.get(id);
    if (!existing) throw AppError.notFound('Course not found.');
    await this.assertSkillsExist(
      [...(patch.skillTags ?? []), ...(patch.prerequisites ?? [])],
      patch,
    );
    const next: Course = { ...existing, ...stripUndefined(patch) };
    next.skillTags = uniq(next.skillTags);
    next.prerequisites = uniq(next.prerequisites);
    return this.repos.courses.update(next);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.repos.courses.get(id);
    if (!existing) throw AppError.notFound('Course not found.');
    if (await this.repos.plans.isCourseReferenced(id)) {
      throw AppError.conflict(
        'This course is part of a learning plan. Set its status to "retired" instead of deleting it.',
      );
    }
    await this.repos.courses.delete(id);
  }

  private async assertSkillsExist(
    ids: string[],
    source: CoursePatch | CourseCreate,
  ): Promise<void> {
    const known = new Set((await this.repos.catalog.skills()).map((s) => s.id));
    const details = [
      ...(source.skillTags ?? [])
        .filter((t) => !known.has(t))
        .map((t) => ({ path: 'skillTags', message: `Unknown skill "${t}".` })),
      ...(source.prerequisites ?? [])
        .filter((t) => !known.has(t))
        .map((t) => ({ path: 'prerequisites', message: `Unknown skill "${t}".` })),
    ];
    if (ids.length > 0 && details.length > 0) {
      throw AppError.validation('The course references unknown skills.', details);
    }
  }
}

function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}
