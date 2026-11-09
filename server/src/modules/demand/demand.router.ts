import { Router } from 'express';
import { requireRole } from '../../middleware/auth.middleware.js';
import { validate } from '../../shared/validate.js';
import { demandCreateSchema, demandPatchSchema } from './demand.schemas.js';
import type { DemandService } from './demand.service.js';

/** Demand signals are aggregate planning inputs; every route here is admin-only. */
export function createDemandRouter(service: DemandService): Router {
  const router = Router();
  router.use(requireRole('admin'));
  router.get('/', async (_req, res) => {
    res.json({ items: await service.list() });
  });
  router.post('/', async (req, res) => {
    res.status(201).json(await service.create(validate(demandCreateSchema, req.body)));
  });
  router.patch('/:id', async (req, res) => {
    res.json(await service.update(String(req.params.id), validate(demandPatchSchema, req.body)));
  });
  router.delete('/:id', async (req, res) => {
    await service.delete(String(req.params.id));
    res.status(204).end();
  });
  return router;
}
