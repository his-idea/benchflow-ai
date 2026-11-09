import { Router } from 'express';
import { z } from 'zod';
import { currentUser } from '../../middleware/auth.middleware.js';
import { validate } from '../../shared/validate.js';
import type { AssistantService } from './assistant.service.js';

const messageSchema = z
  .object({
    conversationId: z.string().trim().max(100).optional(),
    message: z.string().min(1).max(1000),
    context: z
      .object({
        includeProfile: z.boolean().default(true),
        includeCurrentPlan: z.boolean().default(true),
      })
      .strict()
      .default({ includeProfile: true, includeCurrentPlan: true }),
  })
  .strict();

const generatePlanSchema = z
  .object({ conversationId: z.string().trim().max(100).optional() })
  .strict()
  .default({});

export function createAssistantRouter(service: AssistantService): Router {
  const router = Router();
  router.post('/messages', async (req, res) => {
    const body = validate(messageSchema, req.body);
    res.json(
      await service.chat(currentUser(req), {
        conversationId: body.conversationId,
        message: body.message,
        includeProfile: body.context.includeProfile,
        includeCurrentPlan: body.context.includeCurrentPlan,
        requestId: req.requestId,
      }),
    );
  });
  router.post('/generate-plan', async (req, res) => {
    const body = validate(generatePlanSchema, req.body ?? {});
    res.json(
      await service.generatePlan(currentUser(req), {
        conversationId: body.conversationId,
        requestId: req.requestId,
      }),
    );
  });
  return router;
}
