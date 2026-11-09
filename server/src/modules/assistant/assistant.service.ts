import { randomUUID } from 'node:crypto';
import type { Repositories } from '../../data/repositories.js';
import { AppError } from '../../shared/errors.js';
import type { Logger } from '../../shared/logger.js';
import { sanitizeUserText } from '../../shared/text.js';
import type { AuthUser, Conversation } from '../../shared/types.js';
import { AIProviderError, type AIProvider } from '../../providers/ai-provider.interface.js';
import { buildPlanDraft, type PlanDraft } from '../learning-plans/plan-draft.js';
import type { PlanService } from '../learning-plans/plan.service.js';
import type { RecommendationService } from '../recommendations/recommendation.service.js';
import type {
  AssistantContext,
  AssistantTask,
  GroundingRef,
  SuggestedAction,
} from './assistant.types.js';
import { buildAssistantContext } from './context-builder.js';
import { retrieveKnowledge } from './knowledge.js';
import { parseAssistantOutput } from './output-validator.js';
import { buildPrompt } from './prompt-builder.js';

export interface AssistantMessageView {
  id: string;
  role: 'assistant';
  text: string;
  suggestedActions: SuggestedAction[];
  createdAt: string;
}

export interface AssistantReply {
  conversationId: string;
  message: AssistantMessageView;
  recommendedCourseIds: string[];
  grounding: GroundingRef[];
  /** True when the model output was rejected and a safe fallback was returned instead. */
  fallback: boolean;
}

export interface PlanGenerationReply extends AssistantReply {
  draft: PlanDraft;
}

export interface ChatInput {
  conversationId?: string | undefined;
  message: string;
  includeProfile: boolean;
  includeCurrentPlan: boolean;
  requestId: string;
}

export const FALLBACK_TEXT =
  "I couldn't produce a reliable answer from the approved information just now. Please try rephrasing, or browse the Upskilling Store to explore courses.";

export class AssistantService {
  constructor(
    private readonly repos: Repositories,
    private readonly recommendations: RecommendationService,
    private readonly plans: PlanService,
    private readonly provider: AIProvider,
    private readonly logger: Logger,
    private readonly timeoutMs: number,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async chat(user: AuthUser, input: ChatInput): Promise<AssistantReply> {
    const message = sanitizeUserText(input.message);
    if (message.length === 0) {
      throw AppError.validation('The message is empty.', [
        { path: 'message', message: 'Enter a question.' },
      ]);
    }

    const snapshot = await this.recommendations.snapshot(user.id);
    const plan = input.includeCurrentPlan ? await this.plans.getCurrent(user.id) : null;
    const knowledge = retrieveKnowledge(message, await this.repos.knowledge.list());
    const context = buildAssistantContext({
      task: 'chat',
      message,
      includeProfile: input.includeProfile,
      includeCurrentPlan: input.includeCurrentPlan,
      profile: snapshot.profile,
      roleName: snapshot.role?.name,
      skills: snapshot.skills,
      ranked: snapshot.ranked,
      nextSkill: snapshot.nextSkill,
      plan,
      demandBySkill: snapshot.demandBySkill,
      knowledge,
    });

    const conversation = await this.resolveConversation(user.id, input.conversationId);
    await this.repos.conversations.append(conversation.id, {
      id: randomUUID(),
      role: 'user',
      text: message,
      createdAt: this.now().toISOString(),
    });

    const reply = await this.respond('chat', context, message, conversation.id, input.requestId);
    return reply;
  }

  async generatePlan(
    user: AuthUser,
    input: { conversationId?: string | undefined; requestId: string },
  ): Promise<PlanGenerationReply> {
    const snapshot = await this.recommendations.snapshot(user.id);
    const current = await this.plans.getCurrent(user.id);
    const completed = new Set(
      current?.items.filter((i) => i.status === 'completed').map((i) => i.courseId),
    );
    // The draft is deterministic. The model only describes it.
    const draft = buildPlanDraft({
      ranked: snapshot.ranked,
      weeklyHours: snapshot.profile.weeklyHours,
      roleName: snapshot.role?.name,
      excludeCourseIds: completed,
    });
    const conversation = await this.resolveConversation(user.id, input.conversationId);

    const context = buildAssistantContext({
      task: 'plan',
      message: 'Generate a four-week learning plan.',
      includeProfile: true,
      includeCurrentPlan: true,
      profile: snapshot.profile,
      roleName: snapshot.role?.name,
      skills: snapshot.skills,
      ranked: snapshot.ranked,
      nextSkill: snapshot.nextSkill,
      plan: current,
      demandBySkill: snapshot.demandBySkill,
      knowledge: [],
      draft,
    });

    if (draft.items.length === 0) {
      // Nothing to describe, so skip the model and explain deterministically.
      const reply = await this.finish(conversation.id, {
        text: draft.notes.join(' ') || 'No plan could be drafted right now.',
        actions: ['Update profile', 'Browse courses'],
        recommended: [],
        sourceIds: context.profile ? [context.profile.sourceId] : [],
        context,
        fallback: false,
      });
      return { ...reply, draft };
    }

    const reply = await this.respond(
      'plan',
      context,
      'Generate a four-week learning plan.',
      conversation.id,
      input.requestId,
    );
    return { ...reply, draft };
  }

  private async respond(
    task: AssistantTask,
    context: AssistantContext,
    message: string,
    conversationId: string,
    requestId: string,
  ): Promise<AssistantReply> {
    const prompt = buildPrompt(task, context, message);
    const started = Date.now();

    let text: string;
    let usage: { promptTokens?: number; completionTokens?: number } | undefined;
    try {
      const result = await withTimeout(
        (signal) => this.provider.complete({ task, ...prompt, context, message, signal }),
        this.timeoutMs,
      );
      text = result.text;
      usage = result.usage;
    } catch (error) {
      // Log only the failure class and status: SDK messages can echo request details.
      this.logger.warn(
        {
          requestId,
          provider: this.provider.name,
          task,
          outcome: 'provider_error',
          kind: error instanceof AIProviderError ? error.kind : 'unknown',
          status: error instanceof AIProviderError ? error.status : undefined,
          latencyMs: Date.now() - started,
        },
        'assistant provider failure',
      );
      throw new AppError(
        503,
        'ASSISTANT_UNAVAILABLE',
        'The assistant is temporarily unavailable. Please try again.',
      );
    }

    const parsed = parseAssistantOutput(text, context);
    this.logger.info(
      {
        requestId,
        provider: this.provider.name,
        task,
        outcome: parsed.ok ? 'ok' : 'fallback',
        reason: parsed.ok ? undefined : parsed.reason,
        latencyMs: Date.now() - started,
        promptTokens: usage?.promptTokens,
        completionTokens: usage?.completionTokens,
      },
      'assistant completion',
    );

    if (!parsed.ok) {
      return this.finish(conversationId, {
        text: FALLBACK_TEXT,
        actions: ['Browse courses'],
        recommended: [],
        sourceIds: [],
        context,
        fallback: true,
      });
    }
    return this.finish(conversationId, {
      text: parsed.value.answer,
      actions: parsed.value.suggestedActions,
      recommended: parsed.value.recommendedCourseIds,
      sourceIds: parsed.value.sourceIds,
      context,
      fallback: false,
    });
  }

  private async finish(
    conversationId: string,
    out: {
      text: string;
      actions: SuggestedAction[];
      recommended: string[];
      sourceIds: string[];
      context: AssistantContext;
      fallback: boolean;
    },
  ): Promise<AssistantReply> {
    const message: AssistantMessageView = {
      id: randomUUID(),
      role: 'assistant',
      text: out.text,
      suggestedActions: out.actions,
      createdAt: this.now().toISOString(),
    };
    await this.repos.conversations.append(conversationId, {
      id: message.id,
      role: 'assistant',
      text: message.text,
      createdAt: message.createdAt,
    });
    const cited = new Set(out.sourceIds);
    return {
      conversationId,
      message,
      recommendedCourseIds: out.recommended,
      grounding: out.context.references.filter((r) => cited.has(r.sourceId)),
      fallback: out.fallback,
    };
  }

  /** A conversation id from the client is only honoured if it exists and belongs to the caller. */
  private async resolveConversation(userId: string, id: string | undefined): Promise<Conversation> {
    if (id) {
      const existing = await this.repos.conversations.get(id);
      if (existing) {
        if (existing.userId !== userId) throw AppError.notFound('Conversation not found.');
        return existing;
      }
    }
    return this.repos.conversations.create(userId);
  }
}

async function withTimeout<T>(run: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new AIProviderError('timeout'));
    }, ms);
  });
  try {
    return await Promise.race([run(controller.signal), timeout]);
  } finally {
    clearTimeout(timer);
  }
}
