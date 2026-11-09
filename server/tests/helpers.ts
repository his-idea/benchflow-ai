import type { Express } from 'express';
import { createApp } from '../src/app.js';
import type { AppConfig } from '../src/config/env.js';
import { createInMemoryRepositories, type Repositories } from '../src/data/repositories.js';
import { createSeedData } from '../src/data/seed.js';
import type { AIProvider } from '../src/providers/ai-provider.interface.js';
import { MockAIProvider } from '../src/providers/mock-ai.provider.js';
import { createLogger, type Logger } from '../src/shared/logger.js';

export const FIXED_NOW = new Date('2026-11-04T09:00:00.000Z');

export function testConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    nodeEnv: 'test',
    port: 0,
    corsOrigins: ['http://localhost:4200'],
    logLevel: 'silent',
    authMode: 'mock',
    mockDefaultRole: 'employee',
    rateLimitAssistantMax: 1000,
    aiTimeoutMs: 2000,
    aiProvider: 'mock',
    ...overrides,
  };
}

export interface TestApp {
  app: Express;
  repos: Repositories;
}

export function makeApp(
  options: {
    config?: Partial<AppConfig>;
    provider?: AIProvider;
    logger?: Logger;
    repos?: Repositories;
  } = {},
): TestApp {
  const repos = options.repos ?? createInMemoryRepositories(createSeedData());
  const app = createApp({
    config: testConfig(options.config),
    repos,
    aiProvider: options.provider ?? new MockAIProvider(),
    logger: options.logger ?? createLogger('silent'),
    now: () => FIXED_NOW,
  });
  return { app, repos };
}

export const ADMIN = { 'x-mock-role': 'admin' } as const;
