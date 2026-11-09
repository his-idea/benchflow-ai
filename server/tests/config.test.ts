import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from '../src/config/env.js';

const azureEnv = {
  AI_PROVIDER: 'azure-openai',
  AZURE_OPENAI_ENDPOINT: 'https://real-resource.openai.azure.com',
  AZURE_OPENAI_API_KEY: 'super-secret-key-value',
  AZURE_OPENAI_DEPLOYMENT: 'gpt-deployment',
  AZURE_OPENAI_API_VERSION: '2024-10-21',
};

describe('loadConfig', () => {
  it('applies safe defaults with an empty environment (mock provider, no credentials)', () => {
    const c = loadConfig({});
    expect(c).toMatchObject({
      nodeEnv: 'development',
      port: 3000,
      aiProvider: 'mock',
      authMode: 'mock',
      mockDefaultRole: 'employee',
    });
    expect(c.azure).toBeUndefined();
    expect(c.corsOrigins).toEqual(['http://localhost:4200']);
  });

  it('parses multiple CORS origins', () => {
    expect(loadConfig({ CORS_ORIGIN: 'http://a.test, http://b.test' }).corsOrigins).toEqual([
      'http://a.test',
      'http://b.test',
    ]);
  });

  it('rejects an invalid port', () => {
    expect(() => loadConfig({ PORT: '99999' })).toThrow(ConfigError);
  });

  it('accepts a complete Azure configuration', () => {
    expect(loadConfig(azureEnv).azure?.deployment).toBe('gpt-deployment');
  });

  it('names missing Azure variables when azure-openai is selected', () => {
    expect(() => loadConfig({ AI_PROVIDER: 'azure-openai' })).toThrow(
      /AZURE_OPENAI_ENDPOINT[\s\S]*AZURE_OPENAI_API_KEY/,
    );
  });

  it('rejects placeholder values copied from .env.example', () => {
    expect(() =>
      loadConfig({
        ...azureEnv,
        AZURE_OPENAI_API_KEY: 'replace-locally-only',
        AZURE_OPENAI_ENDPOINT: 'https://YOUR-RESOURCE.openai.azure.com',
      }),
    ).toThrow(/placeholder/);
  });

  it('requires an https endpoint', () => {
    expect(() =>
      loadConfig({ ...azureEnv, AZURE_OPENAI_ENDPOINT: 'http://insecure.example.com' }),
    ).toThrow(/https/);
  });

  it('never echoes secret values in its error message', () => {
    try {
      loadConfig({ ...azureEnv, AZURE_OPENAI_ENDPOINT: 'http://insecure.example.com' });
      expect.unreachable();
    } catch (error) {
      expect((error as Error).message).not.toContain('super-secret-key-value');
    }
  });

  it('refuses mock authentication in production', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(/AUTH_MODE=mock is not allowed/);
  });
});
