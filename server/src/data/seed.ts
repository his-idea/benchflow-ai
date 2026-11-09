/**
 * SYNTHETIC SAMPLE DATA. Nothing here describes a real employee, course, project, or policy.
 * Every course URL points at the reserved example.com domain.
 */
import type {
  Course,
  DemandSignal,
  KnowledgeSnippet,
  LearningPlan,
  RoleDefinition,
  Skill,
  UserProfile,
} from '../shared/types.js';

export const SYNTHETIC_USER_ID = 'user-synthetic-001';
const PROVIDER = 'Synthetic Learning Hub';
const SEED_DATE = '2026-11-02T09:00:00.000Z';

export interface SeedData {
  skills: Skill[];
  roles: RoleDefinition[];
  profile: UserProfile;
  courses: Course[];
  demand: DemandSignal[];
  plan: LearningPlan;
  knowledge: KnowledgeSnippet[];
}

const skill = (id: string, name: string, category: string, description: string): Skill => ({
  id,
  name,
  category,
  description,
});

const course = (
  id: string,
  title: string,
  description: string,
  skillTags: string[],
  level: Course['level'],
  durationHours: number,
  prerequisites: string[] = [],
  status: Course['status'] = 'active',
): Course => ({
  id,
  title,
  provider: PROVIDER,
  description,
  skillTags,
  level,
  durationHours,
  prerequisites,
  url: `https://learning.example.com/courses/${id}`,
  status,
});

export function createSeedData(): SeedData {
  const skills: Skill[] = [
    skill(
      'javascript-fundamentals',
      'JavaScript Fundamentals',
      'Languages',
      'Core JavaScript language features.',
    ),
    skill('typescript', 'TypeScript', 'Languages', 'Static typing for JavaScript applications.'),
    skill('html-css', 'HTML & CSS', 'Frontend', 'Semantic markup and modern styling.'),
    skill('react', 'React', 'Frontend', 'Component-based user interfaces with React.'),
    skill('angular', 'Angular', 'Frontend', 'Building applications with the Angular framework.'),
    skill(
      'accessibility',
      'Web Accessibility',
      'Frontend',
      'Designing inclusive, accessible interfaces.',
    ),
    skill('node-js', 'Node.js', 'Backend', 'Server-side JavaScript runtime.'),
    skill(
      'rest-api-design',
      'REST API Design',
      'Backend',
      'Designing consistent, well-documented HTTP APIs.',
    ),
    skill('sql-databases', 'SQL & Databases', 'Data', 'Relational data modelling and querying.'),
    skill('python', 'Python', 'Languages', 'General-purpose scripting and data work.'),
    skill('data-analysis', 'Data Analysis', 'Data', 'Exploring and summarising datasets.'),
    skill(
      'machine-learning-basics',
      'Machine Learning Basics',
      'AI',
      'Core ideas behind supervised learning.',
    ),
    skill(
      'prompt-engineering',
      'Prompt Engineering',
      'AI',
      'Writing reliable prompts for language models.',
    ),
    skill('cloud-fundamentals', 'Cloud Fundamentals', 'Cloud', 'Core cloud services and concepts.'),
    skill('docker', 'Docker', 'DevOps', 'Containerising applications.'),
    skill('devops-ci-cd', 'CI/CD', 'DevOps', 'Automating build, test, and deployment pipelines.'),
    skill(
      'git-workflow',
      'Git Workflow',
      'DevOps',
      'Branching, reviewing, and collaborating with Git.',
    ),
    skill(
      'testing-automation',
      'Test Automation',
      'Quality',
      'Automated end-to-end and unit testing.',
    ),
    skill(
      'agile-delivery',
      'Agile Delivery',
      'Delivery',
      'Working in iterative, collaborative teams.',
    ),
  ];

  const roles: RoleDefinition[] = [
    {
      id: 'frontend-engineer',
      name: 'Frontend Engineer',
      requiredSkillIds: [
        'javascript-fundamentals',
        'typescript',
        'react',
        'html-css',
        'accessibility',
        'testing-automation',
      ],
    },
    {
      id: 'fullstack-engineer',
      name: 'Full-Stack Engineer',
      requiredSkillIds: [
        'typescript',
        'node-js',
        'react',
        'sql-databases',
        'rest-api-design',
        'docker',
      ],
    },
    {
      id: 'data-analyst',
      name: 'Data Analyst',
      requiredSkillIds: ['python', 'sql-databases', 'data-analysis', 'machine-learning-basics'],
    },
    {
      id: 'cloud-devops-engineer',
      name: 'Cloud & DevOps Engineer',
      requiredSkillIds: ['cloud-fundamentals', 'docker', 'devops-ci-cd', 'git-workflow', 'python'],
    },
    {
      id: 'ai-solutions-developer',
      name: 'AI Solutions Developer',
      requiredSkillIds: [
        'python',
        'prompt-engineering',
        'rest-api-design',
        'machine-learning-basics',
        'cloud-fundamentals',
      ],
    },
    {
      id: 'qa-automation-engineer',
      name: 'QA Automation Engineer',
      requiredSkillIds: [
        'testing-automation',
        'javascript-fundamentals',
        'typescript',
        'devops-ci-cd',
        'agile-delivery',
      ],
    },
  ];

  const level = (skillId: string, lvl: number) => ({
    skillId,
    level: lvl,
    evidenceType: 'self-assessed' as const,
    lastUpdatedAt: SEED_DATE,
  });

  const profile: UserProfile = {
    id: SYNTHETIC_USER_ID,
    displayName: 'Alex Synthetic',
    targetRole: 'fullstack-engineer',
    interests: ['typescript', 'docker', 'cloud-fundamentals'],
    weeklyHours: 8,
    preferredLearningStyle: 'hands-on',
    skills: [
      level('javascript-fundamentals', 4),
      level('html-css', 4),
      level('git-workflow', 3),
      level('agile-delivery', 3),
      level('react', 2),
      level('typescript', 2),
      level('sql-databases', 2),
      level('rest-api-design', 2),
      level('node-js', 1),
    ],
  };

  const courses: Course[] = [
    course(
      'react-fundamentals',
      'React Fundamentals',
      'Build interactive interfaces with components, props, state, and hooks.',
      ['react', 'javascript-fundamentals', 'html-css'],
      'beginner',
      8,
      ['javascript-fundamentals'],
    ),
    course(
      'typescript-essentials',
      'TypeScript Essentials',
      'Types, interfaces, generics, and strict-mode habits for everyday projects.',
      ['typescript', 'javascript-fundamentals'],
      'beginner',
      6,
      ['javascript-fundamentals'],
    ),
    course(
      'node-express-apis',
      'Building APIs with Node.js and Express',
      'Create validated, well-structured HTTP APIs with Node.js and Express.',
      ['node-js', 'rest-api-design'],
      'intermediate',
      10,
      ['javascript-fundamentals'],
    ),
    course(
      'sql-for-developers',
      'SQL for Developers',
      'Model relational data and write confident queries, joins, and migrations.',
      ['sql-databases'],
      'beginner',
      6,
    ),
    course(
      'docker-for-developers',
      'Docker for Developers',
      'Containerise applications and run them consistently across environments.',
      ['docker', 'devops-ci-cd'],
      'intermediate',
      5,
      ['git-workflow'],
    ),
    course(
      'advanced-react-patterns',
      'Advanced React Patterns',
      'Composition, performance, and typed component APIs in larger React codebases.',
      ['react', 'typescript'],
      'advanced',
      12,
      ['react', 'typescript'],
    ),
    course(
      'rest-api-design-principles',
      'REST API Design Principles',
      'Resource modelling, status codes, pagination, and versioning.',
      ['rest-api-design'],
      'intermediate',
      4,
    ),
    course(
      'testing-with-playwright',
      'End-to-End Testing with Playwright',
      'Write reliable browser tests for critical user journeys.',
      ['testing-automation', 'typescript'],
      'intermediate',
      6,
      ['javascript-fundamentals'],
    ),
    course(
      'azure-fundamentals-for-devs',
      'Cloud Fundamentals for Developers',
      'Core cloud compute, storage, networking, and identity concepts.',
      ['cloud-fundamentals'],
      'beginner',
      8,
    ),
    course(
      'python-for-data',
      'Python for Data Work',
      'Use Python to load, clean, and summarise datasets.',
      ['python', 'data-analysis'],
      'beginner',
      10,
    ),
    course(
      'prompt-engineering-basics',
      'Prompt Engineering Basics',
      'Write clear, testable prompts and recognise common failure modes.',
      ['prompt-engineering'],
      'beginner',
      3,
    ),
    course(
      'accessible-web-design',
      'Accessible Web Design',
      'Semantic HTML, keyboard support, and inclusive design checks.',
      ['accessibility', 'html-css'],
      'intermediate',
      5,
      ['html-css'],
    ),
    course(
      'ci-cd-pipelines',
      'CI/CD Pipelines in Practice',
      'Automate builds, tests, and deployments with reviewable pipelines.',
      ['devops-ci-cd', 'git-workflow'],
      'intermediate',
      7,
      ['git-workflow'],
    ),
    course(
      'angular-essentials',
      'Angular Essentials',
      'Standalone components, signals, routing, and forms in modern Angular.',
      ['angular', 'typescript'],
      'beginner',
      9,
      ['javascript-fundamentals'],
    ),
    course(
      'machine-learning-intro',
      'Machine Learning Introduction',
      'Supervised learning concepts with hands-on Python exercises.',
      ['machine-learning-basics', 'python'],
      'intermediate',
      14,
      ['python'],
    ),
    course(
      'microservices-patterns',
      'Microservices Patterns (draft)',
      'Service boundaries, messaging, and operational trade-offs.',
      ['rest-api-design', 'docker'],
      'advanced',
      9,
      ['rest-api-design'],
      'draft',
    ),
  ];

  const signal = (
    id: string,
    skillId: string,
    demandLevel: DemandSignal['demandLevel'],
    effectiveTo: string | null = null,
  ): DemandSignal => ({
    id,
    skillId,
    demandLevel,
    source: 'Synthetic aggregate demand sample (not real project data)',
    effectiveFrom: '2026-01-01',
    effectiveTo,
  });

  const demand: DemandSignal[] = [
    signal('demand-react', 'react', 'high'),
    signal('demand-typescript', 'typescript', 'high'),
    signal('demand-cloud', 'cloud-fundamentals', 'high'),
    signal('demand-prompt', 'prompt-engineering', 'high'),
    signal('demand-node', 'node-js', 'medium'),
    signal('demand-docker', 'docker', 'medium'),
    signal('demand-python', 'python', 'medium'),
    signal('demand-sql', 'sql-databases', 'medium'),
    signal('demand-testing', 'testing-automation', 'low'),
    signal('demand-accessibility', 'accessibility', 'low'),
    // Expired on purpose: demonstrates that effective dates are respected.
    signal('demand-angular-expired', 'angular', 'high', '2025-12-31'),
  ];

  const planId = 'plan-synthetic-001';
  const plan: LearningPlan = {
    id: planId,
    userId: SYNTHETIC_USER_ID,
    title: 'My four-week bench plan',
    startDate: '2026-11-02',
    targetDate: '2026-11-29',
    status: 'active',
    createdAt: SEED_DATE,
    items: [
      {
        id: 'item-001',
        planId,
        courseId: 'typescript-essentials',
        sequence: 1,
        targetWeek: 1,
        status: 'in-progress',
      },
      {
        id: 'item-002',
        planId,
        courseId: 'react-fundamentals',
        sequence: 2,
        targetWeek: 2,
        status: 'planned',
      },
      {
        id: 'item-003',
        planId,
        courseId: 'sql-for-developers',
        sequence: 3,
        targetWeek: 3,
        status: 'planned',
      },
    ],
  };

  const knowledge: KnowledgeSnippet[] = [
    {
      id: 'kb-bench-checklist',
      title: 'Bench checklist',
      text: 'While on bench, keep your skill profile current, agree a weekly learning goal with your capability lead, and record your learning progress in your plan. (Synthetic sample content.)',
    },
    {
      id: 'kb-learning-hours',
      title: 'Learning time on bench',
      text: 'Planned weekly learning hours should be agreed with your capability lead. The assistant can help you fit courses into the hours you set in your profile. (Synthetic sample content.)',
    },
    {
      id: 'kb-certification',
      title: 'Certification vouchers',
      text: 'Certification vouchers need capability-lead approval. This MVP does not process vouchers or exam bookings. (Synthetic sample content.)',
    },
    {
      id: 'kb-enrollment',
      title: 'Course enrollment',
      text: 'Adding a course to your plan does not enroll you. Enrollment happens in the learning system and is outside this MVP. (Synthetic sample content.)',
    },
    {
      id: 'kb-privacy',
      title: 'AI assistant data use',
      text: 'The assistant uses your goals, skills, learning plan, and the course catalog. It does not access resumes, HR records, or Microsoft 365 content. (Synthetic sample content.)',
    },
    {
      id: 'kb-support',
      title: 'Support contacts',
      text: 'For policy questions contact the Learning Administration team at learning-admin@example.com. (Synthetic placeholder contact.)',
    },
  ];

  return { skills, roles, profile, courses, demand, plan, knowledge };
}
