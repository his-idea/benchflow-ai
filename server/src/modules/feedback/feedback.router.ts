import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import type { Repositories } from '../../data/repositories.js';
import { currentUser } from '../../middleware/auth.middleware.js';
import { validate } from '../../shared/validate.js';

const feedbackSchema = z
  .object({
    targetType: z.enum(['recommendation', 'assistant']),
    targetId: z.string().trim().min(1).max(100),
    helpful: z.boolean(),
    comment: z.string().trim().max(500).optional(),
  })
  .strict();

export function createFeedbackRouter(
  repos: Repositories,
  now: () => Date = () => new Date(),
): Router {
  const router = Router();
  router.post('/', async (req, res) => {
    const input = validate(feedbackSchema, req.body);
    const entry = await repos.feedback.add({
      id: randomUUID(),
      userId: currentUser(req).id,
      createdAt: now().toISOString(),
      ...input,
    });
    res.status(201).json({ id: entry.id });
  });
  return router;
}
