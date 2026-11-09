import { Router } from 'express';
import { currentUser } from '../../middleware/auth.middleware.js';
import { validate } from '../../shared/validate.js';
import { courseQuerySchema } from '../courses/course-query.js';
import type { RecommendationService } from './recommendation.service.js';

export function createRecommendationRouter(service: RecommendationService): Router {
  const router = Router();
  router.get('/courses', async (req, res) => {
    res.json(await service.recommend(currentUser(req).id, validate(courseQuerySchema, req.query)));
  });
  router.get('/courses/:courseId', async (req, res) => {
    res.json(await service.forCourse(currentUser(req).id, String(req.params.courseId)));
  });
  return router;
}
