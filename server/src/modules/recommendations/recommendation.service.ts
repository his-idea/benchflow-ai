import type { Repositories } from '../../data/repositories.js';
import { AppError } from '../../shared/errors.js';
import type { Course, Page, RoleDefinition, Skill, UserProfile } from '../../shared/types.js';
import { applyCourseFilters, paginate, type CourseQuery } from '../courses/course-query.js';
import { pickNextSkill, type NextSkill } from './next-skill.js';
import {
  MODEL_VERSION,
  buildDemandMap,
  scoreCourse,
  type ScoreContext,
  type ScoreFactor,
  type ScoreResult,
} from './scoring.js';

export interface RecommendedCourse {
  course: Course;
  score: number;
  breakdown: ScoreFactor[];
  reasons: string[];
}

export interface RecommendationPage extends Page<RecommendedCourse> {
  nextSkill: NextSkill | null;
  modelVersion: string;
  generatedAt: string;
  disclaimer: string;
}

export const RELEVANCE_DISCLAIMER =
  'Course relevance helps you choose learning. It is not a performance rating and is not used for staffing decisions.';

interface Loaded {
  profile: UserProfile;
  role: RoleDefinition | undefined;
  skills: Skill[];
  scoreContext: ScoreContext;
}

export class RecommendationService {
  constructor(
    private readonly repos: Repositories,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private async load(userId: string): Promise<Loaded> {
    const [profile, skills, roles, demand] = await Promise.all([
      this.repos.profiles.get(userId),
      this.repos.catalog.skills(),
      this.repos.catalog.roles(),
      this.repos.demand.list(),
    ]);
    if (!profile) throw AppError.notFound('Profile not found.');
    const role = roles.find((r) => r.id === profile.targetRole);
    return {
      profile,
      role,
      skills,
      scoreContext: {
        profile,
        role,
        skillNames: new Map(skills.map((s) => [s.id, s.name])),
        demandBySkill: buildDemandMap(demand, this.now()),
      },
    };
  }

  /** Score every active course for the user (unsorted, unfiltered). */
  async scoreAll(userId: string) {
    const loaded = await this.load(userId);
    const courses = (await this.repos.courses.list()).filter((c) => c.status === 'active');
    const scored = courses.map((course) => ({
      course,
      result: scoreCourse(course, loaded.scoreContext),
    }));
    return { ...loaded, scored };
  }

  async recommend(userId: string, query: CourseQuery): Promise<RecommendationPage> {
    const loaded = await this.scoreAll(userId);
    const { scored, scoreContext, role, skills, profile } = loaded;

    const allowed = new Set(
      applyCourseFilters(
        scored.map((s) => s.course),
        { ...query, status: undefined },
        scoreContext.skillNames,
      ).map((c) => c.id),
    );
    const sort = query.sort ?? 'relevance';
    const items = scored
      .filter((s) => allowed.has(s.course.id))
      .sort((a, b) => {
        if (sort === 'title') return a.course.title.localeCompare(b.course.title);
        if (sort === 'duration') {
          return (
            a.course.durationHours - b.course.durationHours ||
            a.course.title.localeCompare(b.course.title)
          );
        }
        return b.result.score - a.result.score || a.course.title.localeCompare(b.course.title);
      })
      .map(toRecommended);

    return {
      ...paginate(items, query.page, query.pageSize),
      nextSkill: pickNextSkill({
        profile,
        role,
        skills,
        demandBySkill: scoreContext.demandBySkill,
        scored,
      }),
      modelVersion: MODEL_VERSION,
      generatedAt: this.now().toISOString(),
      disclaimer: RELEVANCE_DISCLAIMER,
    };
  }

  /** Everything the assistant needs in one pass: ranked courses, next skill, and demand. */
  async snapshot(userId: string) {
    const { profile, role, skills, scored, scoreContext } = await this.scoreAll(userId);
    const ranked = [...scored]
      .sort(
        (a, b) => b.result.score - a.result.score || a.course.title.localeCompare(b.course.title),
      )
      .map(toRecommended);
    return {
      profile,
      role,
      skills,
      ranked,
      demandBySkill: scoreContext.demandBySkill,
      nextSkill: pickNextSkill({
        profile,
        role,
        skills,
        demandBySkill: scoreContext.demandBySkill,
        scored,
      }),
    };
  }

  async forCourse(userId: string, courseId: string): Promise<RecommendedCourse> {
    const { scored } = await this.scoreAll(userId);
    const found = scored.find((s) => s.course.id === courseId);
    if (!found) throw AppError.notFound('Course not found.');
    return toRecommended(found);
  }
}

function toRecommended(s: { course: Course; result: ScoreResult }): RecommendedCourse {
  return {
    course: s.course,
    score: s.result.score,
    breakdown: s.result.breakdown,
    reasons: s.result.reasons,
  };
}
