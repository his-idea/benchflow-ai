import { z } from 'zod';

const PLACEHOLDER_PATTERNS = [/replace-locally-only/i, /YOUR-RESOURCE/i, /your-approved/i];
const isPlaceholder = (value: string | undefined): boolean =>
  !value || PLACEHOLDER_PATTERNS.some((p) => p.test(value));

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    CORS_ORIGIN: z.string().min(1).default('http://localhost:4200'),
    DATABASE_URL: z.string().optional(),
    AI_PROVIDER: z.enum(['mock', 'azure-openai']).default('mock'),
    AZURE_OPENAI_ENDPOINT: z.string().optional(),
    AZURE_OPENAI_API_KEY: z.string().optional(),
    AZURE_OPENAI_DEPLOYMENT: z.string().optional(),
    AZURE_OPENAI_API_VERSION: z.string().optional(),
    ENTRA_TENANT_ID: z.string().optional(),
    ENTRA_CLIENT_ID: z.string().optional(),
    ENTRA_CLIENT_SECRET: z.string().optional(),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    AUTH_MODE: z.enum(['mock']).default('mock'),
    MOCK_DEFAULT_ROLE: z.enum(['employee', 'admin']).default('employee'),
    RATE_LIMIT_ASSISTANT_MAX: z.coerce.number().int().min(1).default(20),
    AI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(20000),
  })
  .superRefine((env, ctx) => {
    if (env.AI_PROVIDER === 'azure-openai') {
      const required = [
        'AZURE_OPENAI_ENDPOINT',
        'AZURE_OPENAI_API_KEY',
        'AZURE_OPENAI_DEPLOYMENT',
        'AZURE_OPENAI_API_VERSION',
      ] as const;
      for (const key of required) {
        if (isPlaceholder(env[key])) {
          ctx.addIssue({
            code: 'custom',
            path: [key],
            message: `${key} must be set to a real value when AI_PROVIDER=azure-openai (it is missing or still a placeholder).`,
          });
        }
      }
      if (env.AZURE_OPENAI_ENDPOINT && !isPlaceholder(env.AZURE_OPENAI_ENDPOINT)) {
        try {
          if (new URL(env.AZURE_OPENAI_ENDPOINT).protocol !== 'https:') throw new Error('http');
        } catch {
          ctx.addIssue({
            code: 'custom',
            path: ['AZURE_OPENAI_ENDPOINT'],
            message: 'AZURE_OPENAI_ENDPOINT must be an https:// URL.',
          });
        }
      }
    }
  });

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  corsOrigins: string[];
  logLevel: string;
  authMode: 'mock';
  mockDefaultRole: 'employee' | 'admin';
  rateLimitAssistantMax: number;
  aiTimeoutMs: number;
  aiProvider: 'mock' | 'azure-openai';
  azure?: { endpoint: string; apiKey: string; deployment: string; apiVersion: string };
}

export class ConfigError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Invalid server configuration:\n - ${problems.join('\n - ')}`);
    this.name = 'ConfigError';
  }
}

/**
 * Validate environment variables once at startup. Error messages name the variable but never
 * echo its value, so a misconfigured secret cannot leak into logs.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    throw new ConfigError(
      parsed.error.issues.map((i) => `${i.path.join('.') || 'env'}: ${i.message}`),
    );
  }
  const e = parsed.data;

  // The mock identity trusts a client-supplied role header, so it must never run in production.
  if (e.NODE_ENV === 'production' && e.AUTH_MODE === 'mock') {
    throw new ConfigError([
      'AUTH_MODE=mock is not allowed when NODE_ENV=production. Integrate Microsoft Entra ID first (see docs/security.md).',
    ]);
  }

  const config: AppConfig = {
    nodeEnv: e.NODE_ENV,
    port: e.PORT,
    corsOrigins: e.CORS_ORIGIN.split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    logLevel: e.LOG_LEVEL,
    authMode: e.AUTH_MODE,
    mockDefaultRole: e.MOCK_DEFAULT_ROLE,
    rateLimitAssistantMax: e.RATE_LIMIT_ASSISTANT_MAX,
    aiTimeoutMs: e.AI_TIMEOUT_MS,
    aiProvider: e.AI_PROVIDER,
  };
  if (e.AI_PROVIDER === 'azure-openai') {
    config.azure = {
      endpoint: e.AZURE_OPENAI_ENDPOINT as string,
      apiKey: e.AZURE_OPENAI_API_KEY as string,
      deployment: e.AZURE_OPENAI_DEPLOYMENT as string,
      apiVersion: e.AZURE_OPENAI_API_VERSION as string,
    };
  }
  return config;
}
