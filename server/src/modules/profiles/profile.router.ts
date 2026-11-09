import { Router } from 'express';
import { currentUser } from '../../middleware/auth.middleware.js';
import { validate } from '../../shared/validate.js';
import { profilePatchSchema } from './profile.schemas.js';
import type { ProfileService } from './profile.service.js';

export function createProfileRouter(service: ProfileService): Router {
  const router = Router();
  router.get('/me', async (req, res) => {
    res.json(await service.get(currentUser(req).id));
  });
  router.patch('/me', async (req, res) => {
    const patch = validate(profilePatchSchema, req.body);
    res.json(await service.update(currentUser(req).id, patch));
  });
  return router;
}
