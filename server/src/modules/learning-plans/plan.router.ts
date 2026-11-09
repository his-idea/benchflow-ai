import { Router } from 'express';
import { currentUser } from '../../middleware/auth.middleware.js';
import { validate } from '../../shared/validate.js';
import { planCreateSchema, planItemCreateSchema, planItemPatchSchema } from './plan.schemas.js';
import type { PlanService } from './plan.service.js';

export function createPlanRouter(service: PlanService): Router {
  const router = Router();
  // Response shape for "current": { plan: PlanView | null } so "no plan yet" is not an error.
  router.get('/current', async (req, res) => {
    res.json({ plan: await service.getCurrent(currentUser(req).id) });
  });
  router.post('/', async (req, res) => {
    res
      .status(201)
      .json(await service.create(currentUser(req).id, validate(planCreateSchema, req.body)));
  });
  router.post('/:id/items', async (req, res) => {
    res
      .status(201)
      .json(
        await service.addItem(
          currentUser(req).id,
          String(req.params.id),
          validate(planItemCreateSchema, req.body),
        ),
      );
  });
  router.patch('/:id/items/:itemId', async (req, res) => {
    res.json(
      await service.updateItem(
        currentUser(req).id,
        String(req.params.id),
        String(req.params.itemId),
        validate(planItemPatchSchema, req.body),
      ),
    );
  });
  router.delete('/:id/items/:itemId', async (req, res) => {
    res.json(
      await service.removeItem(
        currentUser(req).id,
        String(req.params.id),
        String(req.params.itemId),
      ),
    );
  });
  return router;
}
