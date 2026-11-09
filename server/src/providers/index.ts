import type { AppConfig } from '../config/env.js';
import type { AIProvider } from './ai-provider.interface.js';
import { AzureOpenAIProvider } from './azure-openai.provider.js';
import { MockAIProvider } from './mock-ai.provider.js';

/** Choose the provider from AI_PROVIDER. The mock is the safe default. */
export function createAIProvider(config: AppConfig): AIProvider {
  if (config.aiProvider === 'azure-openai' && config.azure) {
    return new AzureOpenAIProvider({ ...config.azure, timeoutMs: config.aiTimeoutMs });
  }
  return new MockAIProvider();
}
