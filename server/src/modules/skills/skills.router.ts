import { Router } from 'express';
import type { Repositories } from '../../data/repositories.js';

/** Read-only reference data used by the profile form and catalog filters. */
export function createSkillsRouter(repos: Repositories): Router {
  const router = Router();
  router.get('/', async (_req, res) => {
    const [skills, roles] = await Promise.all([repos.catalog.skills(), repos.catalog.roles()]);
    res.json({ skills, roles });
  });
  return router;
}
