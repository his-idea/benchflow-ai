import type {
  AssistantReply,
  Course,
  PlanDraft,
  PlanGenerationReply,
  PlanView,
  RecommendedCourse,
  ScoreFactor,
} from '../app/shared/models/api.models';

export const course = (over: Partial<Course> = {}): Course => ({
  id: 'react-fundamentals',
  title: 'React Fundamentals',
  provider: 'Synthetic Learning Hub',
  description: 'Build interactive interfaces.',
  skillTags: ['react', 'javascript-fundamentals'],
  level: 'beginner',
  durationHours: 8,
  prerequisites: [],
  status: 'active',
  ...over,
});

export const breakdown: ScoreFactor[] = [
  {
    factor: 'roleAlignment',
    label: 'Target-role skill alignment',
    weight: 0.35,
    raw: 1,
    points: 35,
  },
  { factor: 'skillGap', label: 'Identified skill gap', weight: 0.25, raw: 0.6, points: 15 },
  { factor: 'demand', label: 'Project-demand relevance', weight: 0.15, raw: 1, points: 15 },
  { factor: 'interest', label: 'Interest alignment', weight: 0.1, raw: 0, points: 0 },
  { factor: 'prerequisites', label: 'Prerequisite readiness', weight: 0.1, raw: 1, points: 10 },
  { factor: 'timeFit', label: 'Available-time fit', weight: 0.05, raw: 1, points: 5 },
];

export const recommended = (over: Partial<RecommendedCourse> = {}): RecommendedCourse => ({
  course: course(),
  score: 80,
  breakdown,
  reasons: ['Builds skills a Full-Stack Engineer often uses: React.', 'Fits your time.'],
  ...over,
});

export const planView = (over: Partial<PlanView> = {}): PlanView => ({
  id: 'plan-1',
  title: 'My plan',
  startDate: '2026-11-02',
  targetDate: '2026-11-29',
  status: 'active',
  createdAt: '2026-11-02T09:00:00.000Z',
  items: [
    {
      id: 'i1',
      courseId: 'a',
      courseTitle: 'Course A',
      provider: 'P',
      durationHours: 6,
      sequence: 1,
      targetWeek: 1,
      status: 'completed',
    },
    {
      id: 'i2',
      courseId: 'b',
      courseTitle: 'Course B',
      provider: 'P',
      durationHours: 8,
      sequence: 2,
      targetWeek: 2,
      status: 'planned',
    },
    {
      id: 'i3',
      courseId: 'c',
      courseTitle: 'Course C',
      provider: 'P',
      durationHours: 4,
      sequence: 3,
      targetWeek: 2,
      status: 'planned',
    },
  ],
  progress: { completed: 1, total: 3, percent: 33 },
  ...over,
});

export const reply = (over: Partial<AssistantReply> = {}): AssistantReply => ({
  conversationId: 'conv-1',
  message: {
    id: 'm1',
    role: 'assistant',
    text: 'Try Docker.',
    suggestedActions: ['View course'],
    createdAt: '2026-11-04T09:00:00.000Z',
  },
  recommendedCourseIds: ['docker-for-developers'],
  grounding: [
    {
      sourceId: 'course:docker-for-developers',
      type: 'course',
      id: 'docker-for-developers',
      title: 'Docker for Developers',
    },
  ],
  fallback: false,
  ...over,
});

export const draft = (): PlanDraft => ({
  title: 'Four-week plan: Full-Stack Engineer focus',
  weeklyHours: 8,
  totalHours: 18,
  items: [
    { courseId: 'a', courseTitle: 'Course A', durationHours: 6, sequence: 1, targetWeek: 1 },
    { courseId: 'b', courseTitle: 'Course B', durationHours: 8, sequence: 2, targetWeek: 2 },
    { courseId: 'c', courseTitle: 'Course C', durationHours: 4, sequence: 3, targetWeek: 3 },
  ],
  notes: [],
});

export const planReply = (): PlanGenerationReply => ({
  ...reply({
    message: {
      id: 'm2',
      role: 'assistant',
      text: 'Here is a draft.',
      suggestedActions: ['Open plan'],
      createdAt: '',
    },
    recommendedCourseIds: ['a', 'b', 'c'],
  }),
  draft: draft(),
});
