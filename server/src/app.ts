import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { AppConfig } from './config/env.js';
import type { Repositories } from './data/repositories.js';
import { mockAuth } from './middleware/auth.middleware.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { assistantRateLimit } from './middleware/rate-limit.middleware.js';
import { requestId } from './middleware/request-id.middleware.js';
import { requestLogger } from './middleware/request-logger.middleware.js';
import { createAssistantRouter } from './modules/assistant/assistant.router.js';
import { AssistantService } from './modules/assistant/assistant.service.js';
import { createCourseRouter } from './modules/courses/course.router.js';
import { CourseService } from './modules/courses/course.service.js';
import { createDemandRouter } from './modules/demand/demand.router.js';
import { DemandService } from './modules/demand/demand.service.js';
import { createFeedbackRouter } from './modules/feedback/feedback.router.js';
import { createPlanRouter } from './modules/learning-plans/plan.router.js';
import { PlanService } from './modules/learning-plans/plan.service.js';
import { createProfileRouter } from './modules/profiles/profile.router.js';
import { ProfileService } from './modules/profiles/profile.service.js';
import { createRecommendationRouter } from './modules/recommendations/recommendation.router.js';
import { RecommendationService } from './modules/recommendations/recommendation.service.js';
import { createSkillsRouter } from './modules/skills/skills.router.js';
import type { AIProvider } from './providers/ai-provider.interface.js';
import type { Logger } from './shared/logger.js';

export interface AppDependencies {
  config: AppConfig;
  repos: Repositories;
  aiProvider: AIProvider;
  logger: Logger;
  now?: () => Date;
}

export function createApp(deps: AppDependencies): Express {
  const { config, repos, aiProvider, logger } = deps;
  const now = deps.now ?? (() => new Date());

  const recommendations = new RecommendationService(repos, now);
  const plans = new PlanService(repos, now);
  const assistant = new AssistantService(
    repos,
    recommendations,
    plans,
    aiProvider,
    logger,
    config.aiTimeoutMs,
    now,
  );

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(requestId);
  app.use(requestLogger(logger));
  app.use(helmet());
  app.use(
    cors({
      // Strict allow-list. Requests from other origins receive no CORS headers.
      origin: config.corsOrigins,
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'x-request-id', 'x-mock-role'],
      exposedHeaders: ['x-request-id', 'Retry-After'],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: '16kb' }));

  const api = express.Router();
  api.get('/health', (_req, res) => {
    res.json({ status: 'ok', aiProvider: aiProvider.name, time: now().toISOString() });
  });

  api.use(mockAuth(config));
  api.use('/profile', createProfileRouter(new ProfileService(repos, now)));
  api.use('/skills', createSkillsRouter(repos));
  api.use('/courses', createCourseRouter(new CourseService(repos)));
  api.use('/recommendations', createRecommendationRouter(recommendations));
  api.use('/learning-plans', createPlanRouter(plans));
  api.use(
    '/assistant',
    assistantRateLimit(config.rateLimitAssistantMax),
    createAssistantRouter(assistant),
  );
  api.use('/feedback', createFeedbackRouter(repos, now));
  api.use('/demand', createDemandRouter(new DemandService(repos)));

  app.use('/api/v1', api);
  app.use(notFoundHandler);
  app.use(errorHandler(logger));
  return app;
}
