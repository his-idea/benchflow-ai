import { describe, expect, it } from 'vitest';
import { createSeedData } from '../src/data/seed.js';
import {
  SCORE_WEIGHTS,
  buildDemandMap,
  scoreCourse,
  type ScoreContext,
} from '../src/modules/recommendations/scoring.js';
import type { Course, DemandSignal, UserProfile } from '../src/shared/types.js';

const NOW = new Date('2026-11-04T09:00:00.000Z');

const profile = (over: Partial<UserProfile> = {}): UserProfile => ({
  id: 'u',
  displayName: 'T',
  targetRole: 'r',
  interests: [],
  weeklyHours: 8,
  preferredLearningStyle: 'mixed',
  skills: [],
  ...over,
});

const course = (over: Partial<Course> = {}): Course => ({
  id: 'c',
  title: 'C',
  provider: 'P',
  description: 'A sufficiently long description.',
  skillTags: ['a'],
  level: 'beginner',
  durationHours: 8,
  prerequisites: [],
  status: 'active',
  ...over,
});

const ctx = (p: UserProfile, over: Partial<ScoreContext> = {}): ScoreContext => ({
  profile: p,
  role: { id: 'r', name: 'Test Role', requiredSkillIds: ['a', 'b'] },
  skillNames: new Map([
    ['a', 'Skill A'],
    ['b', 'Skill B'],
    ['x', 'Skill X'],
    ['y', 'Skill Y'],
  ]),
  demandBySkill: new Map(),
  ...over,
});

const factor = (r: ReturnType<typeof scoreCourse>, key: string) =>
  r.breakdown.find((f) => f.factor === key)!;

describe('score weights', () => {
  it('match the documented baseline and sum to 100%', () => {
    expect(SCORE_WEIGHTS).toEqual({
      roleAlignment: 0.35,
      skillGap: 0.25,
      demand: 0.15,
      interest: 0.1,
      prerequisites: 0.1,
      timeFit: 0.05,
    });
    const total = Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 10);
  });
});

describe('scoreCourse', () => {
  it('awards the full 100 when every factor is maximal', () => {
    const p = profile({
      interests: ['a'],
      skills: [{ skillId: 'a', level: 0, evidenceType: 'self-assessed', lastUpdatedAt: '' }],
    });
    const result = scoreCourse(course(), ctx(p, { demandBySkill: new Map([['a', 'high']]) }));
    expect(result.score).toBe(100);
    expect(result.breakdown.map((f) => f.points)).toEqual([35, 25, 15, 10, 10, 5]);
  });

  it('scores 0 when no factor applies, without throwing', () => {
    const p = profile({
      weeklyHours: 0,
      skills: [{ skillId: 'x', level: 5, evidenceType: 'self-assessed', lastUpdatedAt: '' }],
    });
    const result = scoreCourse(course({ skillTags: ['x'], prerequisites: ['y'] }), ctx(p));
    expect(result.score).toBe(0);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('handles an unknown target role (role alignment becomes 0)', () => {
    const result = scoreCourse(course(), ctx(profile(), { role: undefined }));
    expect(factor(result, 'roleAlignment').raw).toBe(0);
    expect(Number.isFinite(result.score)).toBe(true);
  });

  it('handles a course with no skill tags without producing NaN', () => {
    const result = scoreCourse(course({ skillTags: [] }), ctx(profile()));
    expect(result.breakdown.every((f) => Number.isFinite(f.raw) && Number.isFinite(f.points))).toBe(
      true,
    );
    expect(factor(result, 'skillGap').raw).toBe(0);
  });

  it('does not double count duplicate skill tags', () => {
    const once = scoreCourse(course({ skillTags: ['a'] }), ctx(profile()));
    const twice = scoreCourse(course({ skillTags: ['a', 'a', 'a'] }), ctx(profile()));
    expect(twice.score).toBe(once.score);
  });

  it('scales the skill-gap factor with the user level', () => {
    const at = (level: number) =>
      factor(
        scoreCourse(
          course(),
          ctx(
            profile({
              skills: [{ skillId: 'a', level, evidenceType: 'self-assessed', lastUpdatedAt: '' }],
            }),
          ),
        ),
        'skillGap',
      ).raw;
    expect(at(0)).toBe(1);
    expect(at(3)).toBe(0.4);
    expect(at(5)).toBe(0);
  });

  it('gives partial prerequisite credit', () => {
    const p = profile({
      skills: [{ skillId: 'x', level: 3, evidenceType: 'self-assessed', lastUpdatedAt: '' }],
    });
    const result = scoreCourse(course({ prerequisites: ['x', 'y'] }), ctx(p));
    expect(factor(result, 'prerequisites').raw).toBe(0.5);
    expect(result.reasons.join(' ')).toContain('Skill Y');
  });

  it('treats level 1 as not meeting a prerequisite (minimum is level 2)', () => {
    const p = profile({
      skills: [{ skillId: 'x', level: 1, evidenceType: 'self-assessed', lastUpdatedAt: '' }],
    });
    expect(factor(scoreCourse(course({ prerequisites: ['x'] }), ctx(p)), 'prerequisites').raw).toBe(
      0,
    );
  });

  it('reduces time fit when the course exceeds four weeks of available hours', () => {
    const result = scoreCourse(course({ durationHours: 64 }), ctx(profile({ weeklyHours: 8 })));
    expect(factor(result, 'timeFit').raw).toBe(0.5);
    expect(factor(result, 'timeFit').points).toBe(2.5);
  });

  it('uses the strongest demand signal among the course skills', () => {
    const result = scoreCourse(
      course({ skillTags: ['a', 'b'] }),
      ctx(profile(), {
        demandBySkill: new Map([
          ['a', 'low'],
          ['b', 'medium'],
        ]),
      }),
    );
    expect(factor(result, 'demand').raw).toBe(0.6);
  });

  it('always returns a whole score between 0 and 100 and at least one reason for every seeded course', () => {
    const seed = createSeedData();
    const context: ScoreContext = {
      profile: seed.profile,
      role: seed.roles.find((r) => r.id === seed.profile.targetRole),
      skillNames: new Map(seed.skills.map((s) => [s.id, s.name])),
      demandBySkill: buildDemandMap(seed.demand, NOW),
    };
    for (const c of seed.courses) {
      const r = scoreCourse(c, context);
      expect(Number.isInteger(r.score)).toBe(true);
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
      expect(r.reasons.length).toBeGreaterThan(0);
      const pointSum = r.breakdown.reduce((s, f) => s + f.points, 0);
      expect(Math.abs(pointSum - r.score)).toBeLessThanOrEqual(0.5);
    }
  });
});

describe('buildDemandMap', () => {
  const signal = (over: Partial<DemandSignal>): DemandSignal => ({
    id: 's',
    skillId: 'a',
    demandLevel: 'low',
    source: 't',
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    ...over,
  });

  it('ignores expired signals', () => {
    expect(buildDemandMap([signal({ effectiveTo: '2026-11-03' })], NOW).has('a')).toBe(false);
  });
  it('includes a signal on its last effective day', () => {
    expect(buildDemandMap([signal({ effectiveTo: '2026-11-04' })], NOW).get('a')).toBe('low');
  });
  it('ignores signals that have not started yet', () => {
    expect(buildDemandMap([signal({ effectiveFrom: '2026-11-05' })], NOW).has('a')).toBe(false);
  });
  it('keeps the highest level when signals overlap', () => {
    const map = buildDemandMap(
      [
        signal({ demandLevel: 'medium' }),
        signal({ id: 's2', demandLevel: 'high' }),
        signal({ id: 's3', demandLevel: 'low' }),
      ],
      NOW,
    );
    expect(map.get('a')).toBe('high');
  });
  it('ignores the expired seeded Angular signal', () => {
    expect(buildDemandMap(createSeedData().demand, NOW).has('angular')).toBe(false);
  });
});
