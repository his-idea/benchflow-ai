import type { AssistantContext, AssistantTask } from '../modules/assistant/assistant.types.js';

export interface AICompletionRequest {
  task: AssistantTask;
  /** Trusted instructions. */
  system: string;
  /** Fenced, untrusted context plus the user's message. */
  user: string;
  /**
   * The structured context the prompt was built from. Real providers use `system`/`user`; the
   * mock provider reads this directly so it can answer deterministically without a model.
   */
  context: AssistantContext;
  message: string;
  signal?: AbortSignal;
}

export interface AICompletionResult {
  /** Raw model text. The assistant service validates it before anything reaches the user. */
  text: string;
  usage?: { promptTokens?: number; completionTokens?: number };
}

export type AIProviderErrorKind = 'timeout' | 'auth' | 'rate_limited' | 'unavailable';

/** Provider failures carry a kind and status only, never SDK messages that could echo requests. */
export class AIProviderError extends Error {
  constructor(
    public readonly kind: AIProviderErrorKind,
    public readonly status?: number,
  ) {
    super(`AI provider error: ${kind}`);
    this.name = 'AIProviderError';
  }
}

/** Business modules depend on this interface only, never on a vendor SDK. */
export interface AIProvider {
  readonly name: string;
  complete(request: AICompletionRequest): Promise<AICompletionResult>;
}
