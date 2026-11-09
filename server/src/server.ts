import dotenv from 'dotenv';
import { createApp } from './app.js';
import { ConfigError, loadConfig } from './config/env.js';
import { createInMemoryRepositories } from './data/repositories.js';
import { createAIProvider } from './providers/index.js';
import { createLogger } from './shared/logger.js';

dotenv.config({ quiet: true });

try {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);
  const aiProvider = createAIProvider(config);
  const app = createApp({ config, repos: createInMemoryRepositories(), aiProvider, logger });

  const server = app.listen(config.port, () => {
    logger.info(
      {
        port: config.port,
        env: config.nodeEnv,
        aiProvider: aiProvider.name,
        auth: config.authMode,
      },
      'BenchFlow API listening (synthetic data, in-memory repositories)',
    );
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'shutting down');
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
} catch (error) {
  if (error instanceof ConfigError) {
    // Names variables only, never values.
    console.error(error.message);
    console.error('Copy server/.env.example to server/.env and fix the listed variables.');
  } else {
    console.error('Failed to start server:', (error as Error).name);
  }
  process.exit(1);
}
