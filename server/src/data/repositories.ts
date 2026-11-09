import { randomUUID } from 'node:crypto';
import type {
  ChatMessage,
  Conversation,
  Course,
  DemandSignal,
  FeedbackEntry,
  KnowledgeSnippet,
  LearningPlan,
  RoleDefinition,
  Skill,
  UserProfile,
} from '../shared/types.js';
import { createSeedData, type SeedData } from './seed.js';

/**
 * Repository interfaces. Every method is async so the in-memory implementation below can be
 * swapped for PostgreSQL without touching services or routes (see docs/architecture.md).
 */
export interface ProfileRepository {
  get(userId: string): Promise<UserProfile | undefined>;
  save(profile: UserProfile): Promise<UserProfile>;
}

export interface CatalogRepository {
  skills(): Promise<Skill[]>;
  roles(): Promise<RoleDefinition[]>;
}

export interface CourseRepository {
  list(): Promise<Course[]>;
  get(id: string): Promise<Course | undefined>;
  create(course: Course): Promise<Course>;
  update(course: Course): Promise<Course>;
  delete(id: string): Promise<void>;
}

export interface DemandRepository {
  list(): Promise<DemandSignal[]>;
  get(id: string): Promise<DemandSignal | undefined>;
  create(signal: DemandSignal): Promise<DemandSignal>;
  update(signal: DemandSignal): Promise<DemandSignal>;
  delete(id: string): Promise<void>;
}

export interface PlanRepository {
  /** Most recent non-archived plan for the user. */
  getCurrent(userId: string): Promise<LearningPlan | undefined>;
  get(id: string): Promise<LearningPlan | undefined>;
  save(plan: LearningPlan): Promise<LearningPlan>;
  /** Archive the user's active plans (used before creating a replacement). */
  archiveActive(userId: string): Promise<void>;
  isCourseReferenced(courseId: string): Promise<boolean>;
}

export interface KnowledgeRepository {
  list(): Promise<KnowledgeSnippet[]>;
}

export interface FeedbackRepository {
  add(entry: FeedbackEntry): Promise<FeedbackEntry>;
  list(): Promise<FeedbackEntry[]>;
}

export interface ConversationRepository {
  get(id: string): Promise<Conversation | undefined>;
  create(userId: string): Promise<Conversation>;
  append(id: string, message: ChatMessage): Promise<void>;
}

export interface Repositories {
  profiles: ProfileRepository;
  catalog: CatalogRepository;
  courses: CourseRepository;
  demand: DemandRepository;
  plans: PlanRepository;
  knowledge: KnowledgeRepository;
  feedback: FeedbackRepository;
  conversations: ConversationRepository;
}

/** Cap stored messages per conversation (retention placeholder until policy is approved). */
const MAX_MESSAGES_PER_CONVERSATION = 50;

export function createInMemoryRepositories(seed: SeedData = createSeedData()): Repositories {
  const data = structuredClone(seed);
  const profiles = new Map<string, UserProfile>([[data.profile.id, data.profile]]);
  const courses = new Map<string, Course>(data.courses.map((c) => [c.id, c]));
  const demand = new Map<string, DemandSignal>(data.demand.map((d) => [d.id, d]));
  const plans = new Map<string, LearningPlan>([[data.plan.id, data.plan]]);
  const feedback: FeedbackEntry[] = [];
  const conversations = new Map<string, Conversation>();

  // Every read returns a copy so callers cannot mutate stored state by accident.
  const copy = <T>(value: T): T => structuredClone(value);

  return {
    profiles: {
      get: async (userId) => copy(profiles.get(userId)),
      save: async (profile) => {
        profiles.set(profile.id, copy(profile));
        return copy(profile);
      },
    },
    catalog: {
      skills: async () => copy(data.skills),
      roles: async () => copy(data.roles),
    },
    courses: {
      list: async () => copy([...courses.values()]),
      get: async (id) => copy(courses.get(id)),
      create: async (course) => {
        courses.set(course.id, copy(course));
        return copy(course);
      },
      update: async (course) => {
        courses.set(course.id, copy(course));
        return copy(course);
      },
      delete: async (id) => {
        courses.delete(id);
      },
    },
    demand: {
      list: async () => copy([...demand.values()]),
      get: async (id) => copy(demand.get(id)),
      create: async (signal) => {
        demand.set(signal.id, copy(signal));
        return copy(signal);
      },
      update: async (signal) => {
        demand.set(signal.id, copy(signal));
        return copy(signal);
      },
      delete: async (id) => {
        demand.delete(id);
      },
    },
    plans: {
      getCurrent: async (userId) => {
        const active = [...plans.values()]
          .filter((p) => p.userId === userId && p.status === 'active')
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return copy(active[0]);
      },
      get: async (id) => copy(plans.get(id)),
      save: async (plan) => {
        plans.set(plan.id, copy(plan));
        return copy(plan);
      },
      archiveActive: async (userId) => {
        for (const plan of plans.values()) {
          if (plan.userId === userId && plan.status === 'active') plan.status = 'archived';
        }
      },
      isCourseReferenced: async (courseId) =>
        [...plans.values()].some((p) => p.items.some((i) => i.courseId === courseId)),
    },
    knowledge: { list: async () => copy(data.knowledge) },
    feedback: {
      add: async (entry) => {
        feedback.push(copy(entry));
        return copy(entry);
      },
      list: async () => copy(feedback),
    },
    conversations: {
      get: async (id) => copy(conversations.get(id)),
      create: async (userId) => {
        const conversation: Conversation = {
          id: randomUUID(),
          userId,
          createdAt: new Date().toISOString(),
          messages: [],
        };
        conversations.set(conversation.id, conversation);
        return copy(conversation);
      },
      append: async (id, message) => {
        const conversation = conversations.get(id);
        if (!conversation) return;
        conversation.messages.push(copy(message));
        if (conversation.messages.length > MAX_MESSAGES_PER_CONVERSATION) {
          conversation.messages.splice(
            0,
            conversation.messages.length - MAX_MESSAGES_PER_CONVERSATION,
          );
        }
      },
    },
  };
}
