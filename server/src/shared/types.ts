export type Role = 'employee' | 'admin';
export const ROLES: readonly Role[] = ['employee', 'admin'];

export const COURSE_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type CourseLevel = (typeof COURSE_LEVELS)[number];

export const COURSE_STATUSES = ['active', 'draft', 'retired'] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export const DEMAND_LEVELS = ['low', 'medium', 'high'] as const;
export type DemandLevel = (typeof DEMAND_LEVELS)[number];

export const LEARNING_STYLES = ['video', 'reading', 'hands-on', 'mixed'] as const;
export type LearningStyle = (typeof LEARNING_STYLES)[number];

export const PLAN_ITEM_STATUSES = ['planned', 'in-progress', 'completed'] as const;
export type PlanItemStatus = (typeof PLAN_ITEM_STATUSES)[number];

export type PlanStatus = 'active' | 'archived';

export interface Skill {
  id: string;
  name: string;
  category: string;
  description: string;
}

/** A target role and the skills it is commonly expected to use. Synthetic in the MVP. */
export interface RoleDefinition {
  id: string;
  name: string;
  requiredSkillIds: string[];
}

export interface UserSkill {
  skillId: string;
  /** 0 (none) to 5 (expert). Self-assessed in the MVP. */
  level: number;
  evidenceType: 'self-assessed';
  lastUpdatedAt: string;
}

export interface UserProfile {
  id: string;
  displayName: string;
  /** Role id from the role catalog. */
  targetRole: string;
  /** Skill ids the user is interested in. */
  interests: string[];
  weeklyHours: number;
  preferredLearningStyle: LearningStyle;
  skills: UserSkill[];
}

export interface Course {
  id: string;
  title: string;
  provider: string;
  description: string;
  /** Skill ids taught by this course. */
  skillTags: string[];
  level: CourseLevel;
  durationHours: number;
  /** Skill ids expected before starting. */
  prerequisites: string[];
  url?: string;
  status: CourseStatus;
}

export interface DemandSignal {
  id: string;
  skillId: string;
  demandLevel: DemandLevel;
  source: string;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface PlanItem {
  id: string;
  planId: string;
  courseId: string;
  sequence: number;
  /** Week (1-4) in which the course is planned to finish. */
  targetWeek: number;
  status: PlanItemStatus;
}

export interface LearningPlan {
  id: string;
  userId: string;
  title: string;
  startDate: string;
  targetDate: string;
  status: PlanStatus;
  createdAt: string;
  items: PlanItem[];
}

export interface FeedbackEntry {
  id: string;
  userId: string;
  targetType: 'recommendation' | 'assistant';
  targetId: string;
  helpful: boolean;
  comment?: string;
  createdAt: string;
}

export interface KnowledgeSnippet {
  id: string;
  title: string;
  text: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  createdAt: string;
  messages: ChatMessage[];
}

export interface AuthUser {
  id: string;
  displayName: string;
  role: Role;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
