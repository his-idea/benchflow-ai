import { AzureOpenAI } from 'openai';
import { ASSISTANT_OUTPUT_JSON_SCHEMA } from '../modules/assistant/output-validator.js';
import {
  AIProviderError,
  type AICompletionRequest,
  type AICompletionResult,
  type AIProvider,
} from './ai-provider.interface.js';

export interface AzureOpenAIOptions {
  endpoint: string;
  apiKey: string;
  deployment: string;
  apiVersion: string;
  timeoutMs: number;
}

/** The slice of the SDK we use, so tests can inject a fake without any network access. */
export interface ChatCompletionsClient {
  chat: {
    completions: {
      create(
        body: Record<string, unknown>,
        options?: { signal?: AbortSignal },
      ): Promise<{
        choices: { message: { content: string | null } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      }>;
    };
  };
}

const MAX_OUTPUT_TOKENS = 800;

/**
 * Azure OpenAI provider. Credentials are read from backend configuration only and never leave
 * this process. The request asks for strict structured output; the assistant service still
 * validates whatever comes back.
 */
export class AzureOpenAIProvider implements AIProvider {
  readonly name = 'azure-openai';
  private readonly client: ChatCompletionsClient;

  constructor(
    private readonly options: AzureOpenAIOptions,
    client?: ChatCompletionsClient,
  ) {
    this.client =
      client ??
      (new AzureOpenAI({
        endpoint: options.endpoint,
        apiKey: options.apiKey,
        deployment: options.deployment,
        apiVersion: options.apiVersion,
        timeout: options.timeoutMs,
        maxRetries: 1,
      }) as unknown as ChatCompletionsClient);
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResult> {
    try {
      const response = await this.client.chat.completions.create(
        {
          model: this.options.deployment,
          messages: [
            { role: 'system', content: request.system },
            { role: 'user', content: request.user },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'benchflow_assistant_response',
              strict: true,
              schema: ASSISTANT_OUTPUT_JSON_SCHEMA,
            },
          },
          max_completion_tokens: MAX_OUTPUT_TOKENS,
        },
        request.signal ? { signal: request.signal } : undefined,
      );
      const text = response.choices[0]?.message.content;
      if (!text) throw new AIProviderError('unavailable');
      return {
        text,
        usage: {
          ...(response.usage?.prompt_tokens !== undefined
            ? { promptTokens: response.usage.prompt_tokens }
            : {}),
          ...(response.usage?.completion_tokens !== undefined
            ? { completionTokens: response.usage.completion_tokens }
            : {}),
        },
      };
    } catch (error) {
      throw toProviderError(error);
    }
  }
}

function toProviderError(error: unknown): AIProviderError {
  if (error instanceof AIProviderError) return error;
  const e = error as { name?: string; status?: number };
  if (e?.name === 'AbortError' || e?.name === 'APIConnectionTimeoutError')
    return new AIProviderError('timeout');
  if (e?.status === 401 || e?.status === 403) return new AIProviderError('auth', e.status);
  if (e?.status === 429) return new AIProviderError('rate_limited', e.status);
  return new AIProviderError('unavailable', e?.status);
}
