import type { AssistantContext } from '../modules/assistant/assistant.types.js';
import type {
  AICompletionRequest,
  AICompletionResult,
  AIProvider,
} from './ai-provider.interface.js';

const POLICY_WORDS =
  /policy|voucher|certif|enrol|approv|privacy|\bdata\b|contact|support|checklist|\bbench\b|\bhours\b/i;
const PLAN_WORDS = /\bplans?\b|schedule|\bweekly\b|\bfour-week\b|\bweeks?\b/i;
const NEXT_WORDS = /\bnext\b|\blearn\w*|\bfocus|\bpriorit|\bupskill/i;
const MATCH_WORDS = /\bcourses?\b|\brecommend\w*|\bsuit\w*|\bmatch\w*\s+(my|me|profile|skills)/i;

interface Output {
  answer: string;
  recommendedCourseIds: string[];
  suggestedActions: string[];
  sourceIds: string[];
}

/**
 * Deterministic stand-in for a language model. It composes answers strictly from the supplied
 * context, so the whole application works with no credentials and tests are repeatable.
 */
export class MockAIProvider implements AIProvider {
  readonly name = 'mock';

  async complete(request: AICompletionRequest): Promise<AICompletionResult> {
    const output =
      request.task === 'plan'
        ? this.planOverview(request.context)
        : this.answer(request.message, request.context);
    return { text: JSON.stringify(output) };
  }

  private planOverview(ctx: AssistantContext): Output {
    const draft = ctx.planDraft;
    if (!draft || draft.items.length === 0) {
      return this.unsupported();
    }
    const lines = draft.items.map((i) => `Week ${i.targetWeek}: ${i.title} (${i.durationHours}h)`);
    const total = draft.items.reduce((sum, i) => sum + i.durationHours, 0);
    const ids = draft.items.map((i) => i.courseId);
    return {
      answer:
        `Here is a draft four-week plan with ${draft.items.length} course${draft.items.length === 1 ? '' : 's'} (${total}h in total) that fits about ${draft.weeklyHours}h of learning per week. ` +
        `${lines.join('. ')}. You can reorder or remove items before saving. This is a suggestion to help you choose learning, not an assessment.`,
      recommendedCourseIds: ids,
      suggestedActions: ['Open plan'],
      sourceIds: ['draft:plan', ...ids.map((id) => `course:${id}`)],
    };
  }

  private answer(message: string, ctx: AssistantContext): Output {
    if (ctx.knowledge.length > 0 && POLICY_WORDS.test(message)) return this.fromKnowledge(ctx);
    if (PLAN_WORDS.test(message)) return this.planPointer(ctx);
    if (NEXT_WORDS.test(message)) return this.nextSkill(ctx);
    if (MATCH_WORDS.test(message)) return this.bestMatches(ctx);
    if (ctx.knowledge.length > 0) return this.fromKnowledge(ctx);
    return this.unsupported();
  }

  private nextSkill(ctx: AssistantContext): Output {
    const next = ctx.nextSkill;
    if (!next) return this.bestMatches(ctx);
    const top = ctx.courses.find((c) => c.id === next.topCourseId) ?? ctx.courses[0];
    const sourceIds = [next.sourceId, ...(ctx.profile ? [ctx.profile.sourceId] : [])];
    const recommended: string[] = [];
    let course = '';
    if (top) {
      recommended.push(top.id);
      sourceIds.push(top.sourceId);
      course = ` A good place to start is "${top.title}" (${top.durationHours}h, ${top.level}${top.relevance !== undefined ? `, course relevance ${top.relevance}%` : ''}).`;
    }
    return {
      answer: `Consider focusing on ${next.name} next. ${next.reason}${course}`,
      recommendedCourseIds: recommended,
      suggestedActions: top ? ['View course', 'Generate plan'] : ['Browse courses'],
      sourceIds,
    };
  }

  private bestMatches(ctx: AssistantContext): Output {
    const top = ctx.courses.slice(0, 3);
    if (top.length === 0) return this.unsupported();
    const lines = top.map((c) => {
      const why = c.reasons?.[0] ? ` ${c.reasons[0]}` : '';
      const score = c.relevance !== undefined ? ` (course relevance ${c.relevance}%)` : '';
      return `"${c.title}"${score}.${why}`;
    });
    const intro = ctx.profile
      ? 'Based on your profile, these courses are the most relevant right now:'
      : 'These catalog courses look related to your question (share your profile for personalised relevance):';
    return {
      answer: `${intro} ${lines.join(' ')}`,
      recommendedCourseIds: top.map((c) => c.id),
      suggestedActions: ['View course', 'Generate plan'],
      sourceIds: [...(ctx.profile ? [ctx.profile.sourceId] : []), ...top.map((c) => c.sourceId)],
    };
  }

  private planPointer(ctx: AssistantContext): Output {
    const top = ctx.courses.slice(0, 3);
    const sourceIds = [
      ...(ctx.profile ? [ctx.profile.sourceId] : []),
      ...top.map((c) => c.sourceId),
    ];
    if (ctx.plan) sourceIds.push(ctx.plan.sourceId);
    const current = ctx.plan
      ? ` Your current plan "${ctx.plan.title}" is ${ctx.plan.progressPercent}% complete.`
      : '';
    const titles =
      top.length > 0
        ? ` Likely candidates include ${top.map((c) => `"${c.title}"`).join(', ')}.`
        : '';
    return {
      answer: `I can draft an editable four-week plan that fits your weekly hours.${current}${titles} Choose "Generate plan" and I will build a draft you can adjust before saving.`,
      recommendedCourseIds: top.map((c) => c.id),
      suggestedActions: ['Generate plan', ...(ctx.plan ? ['Open plan'] : [])],
      sourceIds,
    };
  }

  private fromKnowledge(ctx: AssistantContext): Output {
    const used = ctx.knowledge.slice(0, 2);
    return {
      answer: `${used.map((k) => k.text).join(' ')}`,
      recommendedCourseIds: [],
      suggestedActions: [],
      sourceIds: used.map((k) => k.sourceId),
    };
  }

  private unsupported(): Output {
    return {
      answer:
        "I don't have approved information to answer that. I can help with what to learn next, which courses match your profile, a four-week learning plan, or approved bench guidance.",
      recommendedCourseIds: [],
      suggestedActions: ['Browse courses'],
      sourceIds: [],
    };
  }
}
