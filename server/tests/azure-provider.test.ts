import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config/env.js';
import { AIProviderError } from '../src/providers/ai-provider.interface.js';
import {
  AzureOpenAIProvider,
  type ChatCompletionsClient,
} from '../src/providers/azure-openai.provider.js';
import { createAIProvider } from '../src/providers/index.js';
import { MockAIProvider } from '../src/providers/mock-ai.provider.js';
import type { AICompletionRequest } from '../src/providers/ai-provider.interface.js';

const options = {
  endpoint: 'https://x.openai.azure.com',
  apiKey: 'sk-test-secret',
  deployment: 'dep-1',
  apiVersion: 'v1',
  timeoutMs: 1000,
};
const request = (): AICompletionRequest => ({
  task: 'chat',
  system: 'SYSTEM TEXT',
  user: 'USER TEXT',
  context: { courses: [], demand: [], knowledge: [], references: [] },
  message: 'hi',
});

const fakeClient = (
  impl: (body: Record<string, unknown>) => Promise<unknown>,
): { client: ChatCompletionsClient; calls: Record<string, unknown>[] } => {
  const calls: Record<string, unknown>[] = [];
  const client = {
    chat: {
      completions: {
        create: async (body: Record<string, unknown>) => {
          calls.push(body);
          return impl(body);
        },
      },
    },
  } as unknown as ChatCompletionsClient;
  return { client, calls };
};

describe('AzureOpenAIProvider', () => {
  it('sends the deployment, both messages, and a strict JSON schema, and returns text and usage', async () => {
    const { client, calls } = fakeClient(async () => ({
      choices: [{ message: { content: '{"ok":true}' } }],
      usage: { prompt_tokens: 11, completion_tokens: 7 },
    }));
    const result = await new AzureOpenAIProvider(options, client).complete(request());
    expect(result).toEqual({
      text: '{"ok":true}',
      usage: { promptTokens: 11, completionTokens: 7 },
    });
    const body = calls[0]!;
    expect(body.model).toBe('dep-1');
    expect(body.messages).toEqual([
      { role: 'system', content: 'SYSTEM TEXT' },
      { role: 'user', content: 'USER TEXT' },
    ]);
    expect(body.response_format).toMatchObject({
      type: 'json_schema',
      json_schema: { strict: true },
    });
  });

  it.each([
    ['401 to auth', { status: 401 }, 'auth'],
    ['403 to auth', { status: 403 }, 'auth'],
    ['429 to rate_limited', { status: 429 }, 'rate_limited'],
    ['abort to timeout', { name: 'AbortError' }, 'timeout'],
    ['500 to unavailable', { status: 500 }, 'unavailable'],
    ['unknown errors to unavailable', new Error('boom'), 'unavailable'],
  ])('maps %s', async (_label, thrown, kind) => {
    const { client } = fakeClient(async () => {
      throw thrown;
    });
    await expect(
      new AzureOpenAIProvider(options, client).complete(request()),
    ).rejects.toMatchObject({ kind });
  });

  it('treats empty content as unavailable', async () => {
    const { client } = fakeClient(async () => ({ choices: [{ message: { content: null } }] }));
    await expect(
      new AzureOpenAIProvider(options, client).complete(request()),
    ).rejects.toBeInstanceOf(AIProviderError);
  });

  it('never leaks the API key or SDK message through the thrown error', async () => {
    const { client } = fakeClient(async () => {
      throw Object.assign(new Error('request failed for key sk-test-secret'), { status: 500 });
    });
    try {
      await new AzureOpenAIProvider(options, client).complete(request());
      expect.unreachable();
    } catch (error) {
      expect(String((error as Error).message)).not.toContain('sk-test-secret');
    }
  });
});

describe('createAIProvider', () => {
  it('returns the mock provider by default', () => {
    expect(createAIProvider(loadConfig({}))).toBeInstanceOf(MockAIProvider);
  });
  it('returns the Azure provider when configured, without any network call', () => {
    const provider = createAIProvider(
      loadConfig({
        AI_PROVIDER: 'azure-openai',
        AZURE_OPENAI_ENDPOINT: 'https://real.openai.azure.com',
        AZURE_OPENAI_API_KEY: 'k',
        AZURE_OPENAI_DEPLOYMENT: 'd',
        AZURE_OPENAI_API_VERSION: 'v',
      }),
    );
    expect(provider.name).toBe('azure-openai');
  });
});
