import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ADMIN, makeApp } from './helpers.js';

const B = '/api/v1';
const validCourse = {
  title: 'GraphQL Basics',
  provider: 'Synthetic Learning Hub',
  description: 'Learn schemas, queries, and resolvers.',
  skillTags: ['rest-api-design'],
  level: 'beginner',
  durationHours: 4,
  status: 'active',
};

describe('platform behaviour', () => {
  it('serves health without credentials', async () => {
    const res = await request(makeApp().app).get(`${B}/health`).expect(200);
    expect(res.body).toMatchObject({ status: 'ok', aiProvider: 'mock' });
  });

  it('returns the standard error body for unknown routes', async () => {
    const res = await request(makeApp().app).get(`${B}/nope`).expect(404);
    expect(res.body.error).toMatchObject({ code: 'NOT_FOUND' });
    expect(res.body.error.requestId).toBe(res.headers['x-request-id']);
  });

  it('echoes a well-formed request id and replaces a malformed one', async () => {
    const { app } = makeApp();
    const good = await request(app).get(`${B}/health`).set('x-request-id', 'trace-1234567890');
    expect(good.headers['x-request-id']).toBe('trace-1234567890');
    const bad = await request(app).get(`${B}/health`).set('x-request-id', 'bad id <script>');
    expect(bad.headers['x-request-id']).not.toContain('<');
  });

  it('sets security headers and hides x-powered-by', async () => {
    const res = await request(makeApp().app).get(`${B}/health`);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('allows only configured CORS origins', async () => {
    const { app } = makeApp();
    const ok = await request(app).get(`${B}/health`).set('Origin', 'http://localhost:4200');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:4200');
    const other = await request(app).get(`${B}/health`).set('Origin', 'http://evil.test');
    expect(other.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('rejects oversized bodies with 413 and malformed JSON with 400', async () => {
    const { app } = makeApp();
    const big = await request(app)
      .post(`${B}/feedback`)
      .send({ comment: 'x'.repeat(20000) });
    expect(big.status).toBe(413);
    expect(big.body.error.code).toBe('PAYLOAD_TOO_LARGE');
    const bad = await request(app)
      .post(`${B}/feedback`)
      .set('content-type', 'application/json')
      .send('{not json');
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an unknown mock role with 401', async () => {
    const res = await request(makeApp().app)
      .get(`${B}/profile/me`)
      .set('x-mock-role', 'superuser')
      .expect(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('profile', () => {
  it('returns the synthetic profile', async () => {
    const res = await request(makeApp().app).get(`${B}/profile/me`).expect(200);
    expect(res.body).toMatchObject({ targetRole: 'fullstack-engineer', weeklyHours: 8 });
  });

  it('updates fields and keeps timestamps for unchanged skill levels', async () => {
    const { app } = makeApp();
    const before = (await request(app).get(`${B}/profile/me`)).body;
    const unchanged = before.skills.find((s: { skillId: string }) => s.skillId === 'react');
    const res = await request(app)
      .patch(`${B}/profile/me`)
      .send({
        weeklyHours: 12,
        skills: [
          { skillId: 'react', level: unchanged.level },
          { skillId: 'docker', level: 1 },
        ],
      })
      .expect(200);
    expect(res.body.weeklyHours).toBe(12);
    const react = res.body.skills.find((s: { skillId: string }) => s.skillId === 'react');
    const docker = res.body.skills.find((s: { skillId: string }) => s.skillId === 'docker');
    expect(react.lastUpdatedAt).toBe(unchanged.lastUpdatedAt);
    expect(docker.lastUpdatedAt).toBe('2026-11-04T09:00:00.000Z');
  });

  it.each([
    ['unknown role', { targetRole: 'astronaut' }, 'targetRole'],
    ['hours above 40', { weeklyHours: 100 }, 'weeklyHours'],
    ['skill level above 5', { skills: [{ skillId: 'react', level: 9 }] }, 'skills.0.level'],
    ['unknown skill', { skills: [{ skillId: 'nope', level: 1 }] }, 'skills.0.skillId'],
    [
      'duplicate skills',
      {
        skills: [
          { skillId: 'react', level: 1 },
          { skillId: 'react', level: 2 },
        ],
      },
      'skills',
    ],
    ['unknown interest', { interests: ['nope'] }, 'interests.0'],
    ['unknown field', { displayName: 'Hacker' }, '(root)'],
  ])('rejects %s with field details', async (_l, body, path) => {
    const res = await request(makeApp().app).patch(`${B}/profile/me`).send(body).expect(400);
    expect(res.body.error.details.map((d: { path: string }) => d.path)).toContain(path);
  });

  it('changes recommendations after the profile changes', async () => {
    const { app } = makeApp();
    const score = async () =>
      (await request(app).get(`${B}/recommendations/courses/advanced-react-patterns`)).body.score;
    const before = await score();
    await request(app).patch(`${B}/profile/me`).send({ weeklyHours: 0 }).expect(200);
    expect(await score()).toBeLessThan(before);
  });
});

describe('courses and recommendations', () => {
  it('shows employees only active courses and admins everything', async () => {
    const { app } = makeApp();
    const employee = await request(app).get(`${B}/courses?pageSize=100`).expect(200);
    expect(employee.body.total).toBe(15);
    expect(employee.body.items.every((c: { status: string }) => c.status === 'active')).toBe(true);
    const admin = await request(app).get(`${B}/courses?pageSize=100`).set(ADMIN).expect(200);
    expect(admin.body.total).toBe(16);
    const drafts = await request(app).get(`${B}/courses?status=draft`).set(ADMIN).expect(200);
    expect(drafts.body.items.map((c: { id: string }) => c.id)).toEqual(['microservices-patterns']);
  });

  it('hides draft courses from employees even by id', async () => {
    const { app } = makeApp();
    await request(app).get(`${B}/courses/microservices-patterns`).expect(404);
    await request(app).get(`${B}/courses/microservices-patterns`).set(ADMIN).expect(200);
  });

  it('ignores a status filter from employees', async () => {
    const res = await request(makeApp().app).get(`${B}/courses?status=draft`).expect(200);
    expect(res.body.items.every((c: { status: string }) => c.status === 'active')).toBe(true);
  });

  it('searches title, description, provider and skill names', async () => {
    const { app } = makeApp();
    const ids = async (q: string) =>
      (
        await request(app).get(`${B}/recommendations/courses?search=${encodeURIComponent(q)}`)
      ).body.items.map((i: { course: { id: string } }) => i.course.id);
    expect(await ids('playwright')).toContain('testing-with-playwright');
    expect(await ids('synthetic learning')).toHaveLength(15);
    expect(await ids('Test Automation')).toContain('testing-with-playwright');
    expect(await ids('zzzz-no-match')).toEqual([]);
  });

  it('filters by level, skill and duration and paginates', async () => {
    const { app } = makeApp();
    const beginner = await request(app).get(`${B}/recommendations/courses?level=beginner`);
    expect(
      beginner.body.items.every(
        (i: { course: { level: string } }) => i.course.level === 'beginner',
      ),
    ).toBe(true);
    const react = await request(app).get(`${B}/recommendations/courses?skill=react`);
    expect(react.body.items.length).toBeGreaterThan(0);
    const short = await request(app).get(`${B}/recommendations/courses?maxDuration=5`);
    expect(
      short.body.items.every(
        (i: { course: { durationHours: number } }) => i.course.durationHours <= 5,
      ),
    ).toBe(true);
    const page2 = await request(app).get(`${B}/recommendations/courses?pageSize=5&page=2`);
    expect(page2.body).toMatchObject({ page: 2, pageSize: 5, total: 15 });
    expect(page2.body.items).toHaveLength(5);
  });

  it('sorts by relevance (default), title and duration', async () => {
    const { app } = makeApp();
    const get = async (sort?: string) =>
      (
        await request(app).get(
          `${B}/recommendations/courses?pageSize=100${sort ? `&sort=${sort}` : ''}`,
        )
      ).body.items;
    const rel = await get();
    expect(rel.map((i: { score: number }) => i.score)).toEqual(
      [...rel.map((i: { score: number }) => i.score)].sort((a, b) => b - a),
    );
    const title = (await get('title')).map((i: { course: { title: string } }) => i.course.title);
    expect(title).toEqual([...title].sort((a, b) => a.localeCompare(b)));
    const dur = (await get('duration')).map(
      (i: { course: { durationHours: number } }) => i.course.durationHours,
    );
    expect(dur).toEqual([...dur].sort((a, b) => a - b));
  });

  it('explains every recommendation and states what the score is not', async () => {
    const res = await request(makeApp().app)
      .get(`${B}/recommendations/courses?pageSize=100`)
      .expect(200);
    expect(res.body.disclaimer).toContain('not a performance rating');
    expect(res.body.modelVersion).toBe('weights-v1');
    for (const item of res.body.items) {
      expect(item.reasons.length).toBeGreaterThan(0);
      expect(item.breakdown).toHaveLength(6);
    }
  });

  it('returns a single recommendation and 404 for an unknown course', async () => {
    const { app } = makeApp();
    await request(app).get(`${B}/recommendations/courses/react-fundamentals`).expect(200);
    await request(app).get(`${B}/recommendations/courses/nope`).expect(404);
  });

  it('rejects invalid query parameters', async () => {
    const { app } = makeApp();
    await request(app).get(`${B}/courses?level=expert`).expect(400);
    await request(app).get(`${B}/courses?pageSize=1000`).expect(400);
  });
});

describe('course administration', () => {
  it('blocks employees from writing', async () => {
    const { app } = makeApp();
    await request(app).post(`${B}/courses`).send(validCourse).expect(403);
    await request(app).patch(`${B}/courses/react-fundamentals`).send({ title: 'x' }).expect(403);
    await request(app).delete(`${B}/courses/react-fundamentals`).expect(403);
  });

  it('creates, updates and deletes a course', async () => {
    const { app } = makeApp();
    const created = await request(app)
      .post(`${B}/courses`)
      .set(ADMIN)
      .send(validCourse)
      .expect(201);
    expect(created.body.id).toBe('graphql-basics');
    const dup = await request(app).post(`${B}/courses`).set(ADMIN).send(validCourse).expect(201);
    expect(dup.body.id).toBe('graphql-basics-2');
    const patched = await request(app)
      .patch(`${B}/courses/graphql-basics`)
      .set(ADMIN)
      .send({ durationHours: 6 })
      .expect(200);
    expect(patched.body).toMatchObject({ durationHours: 6, title: 'GraphQL Basics' });
    await request(app).delete(`${B}/courses/graphql-basics`).set(ADMIN).expect(204);
    await request(app).get(`${B}/courses/graphql-basics`).set(ADMIN).expect(404);
  });

  it.each([
    ['a short title', { title: 'ab' }],
    ['zero duration', { durationHours: 0 }],
    ['an unknown skill tag', { skillTags: ['nope'] }],
    ['a javascript: url', { url: 'javascript:alert(1)' }],
    ['no skill tags', { skillTags: [] }],
  ])('rejects %s', async (_l, over) => {
    const res = await request(makeApp().app)
      .post(`${B}/courses`)
      .set(ADMIN)
      .send({ ...validCourse, ...over })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('refuses to delete a course that is in a learning plan', async () => {
    const res = await request(makeApp().app)
      .delete(`${B}/courses/typescript-essentials`)
      .set(ADMIN)
      .expect(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });
});

describe('demand administration', () => {
  const signal = {
    skillId: 'react',
    demandLevel: 'high',
    source: 'Synthetic',
    effectiveFrom: '2026-11-01',
    effectiveTo: null,
  };

  it('is admin-only', async () => {
    await request(makeApp().app).get(`${B}/demand`).expect(403);
  });

  it('supports create, update and delete, and validates dates and skills', async () => {
    const { app } = makeApp();
    const list = await request(app).get(`${B}/demand`).set(ADMIN).expect(200);
    expect(list.body.items.length).toBe(11);
    const created = await request(app).post(`${B}/demand`).set(ADMIN).send(signal).expect(201);
    const patched = await request(app)
      .patch(`${B}/demand/${created.body.id}`)
      .set(ADMIN)
      .send({ demandLevel: 'low' })
      .expect(200);
    expect(patched.body.demandLevel).toBe('low');
    await request(app)
      .post(`${B}/demand`)
      .set(ADMIN)
      .send({ ...signal, effectiveTo: '2026-01-01' })
      .expect(400);
    await request(app)
      .post(`${B}/demand`)
      .set(ADMIN)
      .send({ ...signal, skillId: 'nope' })
      .expect(400);
    await request(app)
      .post(`${B}/demand`)
      .set(ADMIN)
      .send({ ...signal, effectiveFrom: '11/01/2026' })
      .expect(400);
    await request(app).delete(`${B}/demand/${created.body.id}`).set(ADMIN).expect(204);
    await request(app).delete(`${B}/demand/${created.body.id}`).set(ADMIN).expect(404);
  });

  it('changes recommendations when demand changes', async () => {
    const { app } = makeApp();
    const score = async () =>
      (await request(app).get(`${B}/recommendations/courses/prompt-engineering-basics`)).body.score;
    const before = await score();
    await request(app).delete(`${B}/demand/demand-prompt`).set(ADMIN).expect(204);
    expect(await score()).toBeLessThan(before);
  });
});

describe('learning plan', () => {
  const current = async (app: Parameters<typeof request>[0]) =>
    (await request(app).get(`${B}/learning-plans/current`)).body.plan;

  it('returns the seeded plan with progress', async () => {
    const plan = await current(makeApp().app);
    expect(plan.items).toHaveLength(3);
    expect(plan.progress).toEqual({ completed: 0, total: 3, percent: 0 });
    expect(plan.items[0]).toMatchObject({ courseTitle: 'TypeScript Essentials', sequence: 1 });
  });

  it('adds items with a default week, and rejects duplicates and unavailable courses', async () => {
    const { app } = makeApp();
    const plan = await current(app);
    const added = await request(app)
      .post(`${B}/learning-plans/${plan.id}/items`)
      .send({ courseId: 'docker-for-developers' })
      .expect(201);
    expect(added.body.items).toHaveLength(4);
    expect(added.body.items[3].targetWeek).toBe(4);
    await request(app)
      .post(`${B}/learning-plans/${plan.id}/items`)
      .send({ courseId: 'docker-for-developers' })
      .expect(409);
    await request(app)
      .post(`${B}/learning-plans/${plan.id}/items`)
      .send({ courseId: 'microservices-patterns' })
      .expect(400);
    await request(app)
      .post(`${B}/learning-plans/${plan.id}/items`)
      .send({ courseId: 'nope' })
      .expect(400);
    await request(app)
      .post(`${B}/learning-plans/${plan.id}/items`)
      .send({ courseId: 'ci-cd-pipelines', targetWeek: 9 })
      .expect(400);
  });

  it('updates status and computes progress, and reorders with contiguous sequences', async () => {
    const { app } = makeApp();
    const plan = await current(app);
    const [a, , c] = plan.items;
    const done = await request(app)
      .patch(`${B}/learning-plans/${plan.id}/items/${a.id}`)
      .send({ status: 'completed' })
      .expect(200);
    expect(done.body.progress).toEqual({ completed: 1, total: 3, percent: 33 });
    const moved = await request(app)
      .patch(`${B}/learning-plans/${plan.id}/items/${c.id}`)
      .send({ sequence: 1 })
      .expect(200);
    expect(moved.body.items.map((i: { id: string }) => i.id)[0]).toBe(c.id);
    expect(moved.body.items.map((i: { sequence: number }) => i.sequence)).toEqual([1, 2, 3]);
    await request(app).patch(`${B}/learning-plans/${plan.id}/items/${a.id}`).send({}).expect(400);
    await request(app)
      .patch(`${B}/learning-plans/${plan.id}/items/nope`)
      .send({ status: 'planned' })
      .expect(404);
  });

  it('removes items and renumbers', async () => {
    const { app } = makeApp();
    const plan = await current(app);
    const res = await request(app)
      .delete(`${B}/learning-plans/${plan.id}/items/${plan.items[0].id}`)
      .expect(200);
    expect(res.body.items.map((i: { sequence: number }) => i.sequence)).toEqual([1, 2]);
  });

  it('replaces the plan on create, archiving the old one', async () => {
    const { app } = makeApp();
    const old = await current(app);
    const created = await request(app)
      .post(`${B}/learning-plans`)
      .send({
        title: 'New plan',
        items: [
          { courseId: 'react-fundamentals' },
          { courseId: 'sql-for-developers', targetWeek: 3 },
        ],
      })
      .expect(201);
    expect(created.body.items.map((i: { courseId: string }) => i.courseId)).toEqual([
      'react-fundamentals',
      'sql-for-developers',
    ]);
    expect(created.body.items[1].targetWeek).toBe(3);
    expect((await current(app)).id).toBe(created.body.id);
    await request(app)
      .post(`${B}/learning-plans/${old.id}/items`)
      .send({ courseId: 'docker-for-developers' })
      .expect(404);
  });

  it('validates plan creation', async () => {
    const { app } = makeApp();
    await request(app).post(`${B}/learning-plans`).send({ title: 'x' }).expect(400);
    await request(app)
      .post(`${B}/learning-plans`)
      .send({
        title: 'Dup plan',
        items: [{ courseId: 'react-fundamentals' }, { courseId: 'react-fundamentals' }],
      })
      .expect(400);
    await request(app)
      .post(`${B}/learning-plans`)
      .send({ title: 'Bad dates', startDate: '2026-11-10', targetDate: '2026-11-01' })
      .expect(400);
  });

  it('creates an empty plan and reports no plan once nothing is active', async () => {
    const res = await request(makeApp().app)
      .post(`${B}/learning-plans`)
      .send({ title: 'Empty plan' })
      .expect(201);
    expect(res.body.progress).toEqual({ completed: 0, total: 0, percent: 0 });
    expect(res.body.targetDate).toBe('2026-12-01');
  });
});

describe('feedback and reference data', () => {
  it('stores feedback', async () => {
    const res = await request(makeApp().app)
      .post(`${B}/feedback`)
      .send({
        targetType: 'recommendation',
        targetId: 'react-fundamentals',
        helpful: true,
        comment: 'Useful',
      })
      .expect(201);
    expect(res.body.id).toBeTruthy();
  });

  it.each([
    ['bad target type', { targetType: 'person', targetId: 'x', helpful: true }],
    ['missing helpful', { targetType: 'assistant', targetId: 'x' }],
    [
      'over-long comment',
      { targetType: 'assistant', targetId: 'x', helpful: false, comment: 'x'.repeat(501) },
    ],
  ])('rejects %s', async (_l, body) => {
    await request(makeApp().app).post(`${B}/feedback`).send(body).expect(400);
  });

  it('serves skills and roles', async () => {
    const res = await request(makeApp().app).get(`${B}/skills`).expect(200);
    expect(res.body.skills.length).toBeGreaterThan(10);
    expect(res.body.roles.map((r: { id: string }) => r.id)).toContain('fullstack-engineer');
  });
});
