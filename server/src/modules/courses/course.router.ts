import { Router } from 'express';
import { currentUser, requireRole } from '../../middleware/auth.middleware.js';
import { validate } from '../../shared/validate.js';
import { courseCreateSchema, coursePatchSchema } from './course.schemas.js';
import { courseQuerySchema } from './course-query.js';
import type { CourseService } from './course.service.js';

export function createCourseRouter(service: CourseService): Router {
  const router = Router();
  router.get('/', async (req, res) => {
    res.json(await service.list(validate(courseQuerySchema, req.query), currentUser(req).role));
  });
  router.get('/:id', async (req, res) => {
    res.json(await service.get(String(req.params.id), currentUser(req).role));
  });
  router.post('/', requireRole('admin'), async (req, res) => {
    res.status(201).json(await service.create(validate(courseCreateSchema, req.body)));
  });
  router.patch('/:id', requireRole('admin'), async (req, res) => {
    res.json(await service.update(String(req.params.id), validate(coursePatchSchema, req.body)));
  });
  router.delete('/:id', requireRole('admin'), async (req, res) => {
    await service.delete(String(req.params.id));
    res.status(204).end();
  });
  return router;
}
