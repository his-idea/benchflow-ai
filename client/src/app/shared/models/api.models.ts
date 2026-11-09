/** Typed DTOs mirroring the server API (see docs/api.md). */

export type LoadState = 'idle' | 'loading' | 'success' | 'error';

export type Role = 'employee' | 'admin';
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';
export type CourseStatus = 'active' | 'draft' | 'retired';
export type DemandLevel = 'low' | 'medium' | 'high';
export type LearningStyle = 'video' | 'reading' | 'hands-on' | 'mixed';
export type PlanItemStatus = 'planned' | 'in-progress' | 'completed';
export type CourseSort = 'relevance' | 'title' | 'duration';

export const COURSE_LEVELS: readonly CourseLevel[] = ['beginner', 'intermediate', 'advanced'];
export const COURSE_STATUSES: readonly CourseStatus[] = ['active', 'draft', 'retired'];
export const DEMAND_LEVELS: readonly DemandLevel[] = ['low', 'medium', 'high'];
export const LEARNING_STYLES: readonly LearningStyle[] = ['video', 'reading', 'hands-on', 'mixed'];
export const PLAN_ITEM_STATUSES: readonly PlanItemStatus[] = [
  'planned',
  'in-progress',
  'completed',
];
export const PLAN_WEEKS = [1, 2, 3, 4] as const;

export interface Skill {
  id: string;
  name: string;
  category: string;
  description: string;
}

export interface RoleDefinition {
  id: string;
  name: string;
  requiredSkillIds: string[];
}

export interface SkillCatalog {
  skills: Skill[];
  roles: RoleDefinition[];
}

export interface UserSkill {
  skillId: string;
  level: number;
  evidenceType: 'self-assessed';
  lastUpdatedAt: string;
}

export interface UserProfile {
  id: string;
  displayName: string;
  targetRole: string;
  interests: string[];
  weeklyHours: number;
  preferredLearningStyle: LearningStyle;
  skills: UserSkill[];
}

export interface ProfilePatch {
  targetRole?: string;
  interests?: string[];
  weeklyHours?: number;
  preferredLearningStyle?: LearningStyle;
  skills?: { skillId: string; level: number }[];
}

export interface Course {
  id: string;
  title: string;
  provider: string;
  description: string;
  skillTags: string[];
  level: CourseLevel;
  durationHours: number;
  prerequisites: string[];
  url?: string;
  status: CourseStatus;
}

export interface CourseInput {
  title: string;
  provider: string;
  description: string;
  skillTags: string[];
  level: CourseLevel;
  durationHours: number;
  prerequisites: string[];
  url?: string;
  status: CourseStatus;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ScoreFactor {
  factor: string;
  label: string;
  weight: number;
  raw: number;
  points: number;
}

export interface RecommendedCourse {
  course: Course;
  score: number;
  breakdown: ScoreFactor[];
  reasons: string[];
}

export interface NextSkill {
  skillId: string;
  name: string;
  currentLevel: number;
  demandLevel: DemandLevel | null;
  reason: string;
  topCourseId: string | null;
}

export interface RecommendationPage extends Page<RecommendedCourse> {
  nextSkill: NextSkill | null;
  modelVersion: string;
  generatedAt: string;
  disclaimer: string;
}

export interface CourseFilters {
  search: string;
  level: CourseLevel | '';
  skill: string;
  maxDuration: number | null;
  sort: CourseSort;
}

export interface PlanItemView {
  id: string;
  courseId: string;
  courseTitle: string;
  provider: string;
  durationHours: number;
  sequence: number;
  targetWeek: number;
  status: PlanItemStatus;
}

export interface PlanView {
  id: string;
  title: string;
  startDate: string;
  targetDate: string;
  status: 'active' | 'archived';
  createdAt: string;
  items: PlanItemView[];
  progress: { completed: number; total: number; percent: number };
}

export interface PlanCreateInput {
  title: string;
  items: { courseId: string; targetWeek?: number }[];
}

export interface PlanItemPatch {
  status?: PlanItemStatus;
  targetWeek?: number;
  sequence?: number;
}

export interface DemandSignal {
  id: string;
  skillId: string;
  demandLevel: DemandLevel;
  source: string;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export type DemandInput = Omit<DemandSignal, 'id'>;

export type SuggestedAction =
  'View course' | 'Generate plan' | 'Open plan' | 'Update profile' | 'Browse courses';

export interface GroundingRef {
  sourceId: string;
  type: 'profile' | 'course' | 'plan' | 'knowledge' | 'skill' | 'demand' | 'draft';
  id: string;
  title: string;
}

export interface AssistantReply {
  conversationId: string;
  message: {
    id: string;
    role: 'assistant';
    text: string;
    suggestedActions: SuggestedAction[];
    createdAt: string;
  };
  recommendedCourseIds: string[];
  grounding: GroundingRef[];
  fallback: boolean;
}

export interface PlanDraftItem {
  courseId: string;
  courseTitle: string;
  durationHours: number;
  sequence: number;
  targetWeek: number;
}

export interface PlanDraft {
  title: string;
  weeklyHours: number;
  totalHours: number;
  items: PlanDraftItem[];
  notes: string[];
}

export interface PlanGenerationReply extends AssistantReply {
  draft: PlanDraft;
}

export interface ChatEntry {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  suggestedActions?: SuggestedAction[];
  grounding?: GroundingRef[];
  recommendedCourseIds?: string[];
  fallback?: boolean;
}
