import type { RequestHandler } from 'express';
import type { AppConfig } from '../config/env.js';
import { SYNTHETIC_USER_ID } from '../data/seed.js';
import { AppError } from '../shared/errors.js';
import { ROLES, type Role } from '../shared/types.js';

/**
 * DEVELOPMENT-ONLY mock identity. The role comes from the `x-mock-role` header (or the
 * configured default). config.ts refuses to start with AUTH_MODE=mock in production.
 *
 * To adopt Microsoft Entra ID, replace this middleware with one that validates the bearer token
 * and maps app-role claims to `req.user.role`; routes only depend on `req.user` and requireRole.
 */
export function mockAuth(config: AppConfig): RequestHandler {
  return (req, _res, next) => {
    const header = req.header('x-mock-role');
    const role = (header ?? config.mockDefaultRole) as Role;
    if (!ROLES.includes(role)) {
      return next(AppError.unauthorized('Unknown mock role.'));
    }
    req.user = { id: SYNTHETIC_USER_ID, displayName: 'Alex Synthetic', role };
    next();
  };
}

export function currentUser(req: Express.Request) {
  if (!req.user) throw AppError.unauthorized();
  return req.user;
}

export function requireRole(role: Role): RequestHandler {
  return (req, _res, next) => {
    const user = req.user;
    if (!user) return next(AppError.unauthorized());
    if (user.role !== role) return next(AppError.forbidden());
    next();
  };
}
