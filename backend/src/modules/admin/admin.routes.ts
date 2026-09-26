import { Router } from 'express';
import { z } from 'zod';
import { getUser, requirePermission, requireUser, ROLES } from '../../shared/auth/index.js';
import { handler } from '../../shared/http.js';
import { zId, zIdParams, zPagination } from '../../shared/validation.js';
import type { GameService } from '../games/index.js';
import type { PartnerService } from '../partner/index.js';
import type { AdminService } from './admin.service.js';

const zReason = z.string().trim().min(3).max(500);

export const createAdminRouter = (admin: AdminService, partners: PartnerService, games: GameService): Router => {
  const router = Router();
  router.use(requireUser);

  // ----- users -----

  router.get(
    '/users',
    requirePermission('admin:users:read'),
    handler(
      { query: zPagination.extend({ search: z.string().trim().max(100).optional(), status: z.enum(['active', 'suspended', 'deleted']).optional(), role: z.enum(ROLES).optional() }) },
      async ({ query }, _req, res) => {
        res.json(await admin.listUsers(query));
      },
    ),
  );

  router.get('/users/:id', requirePermission('admin:users:read'), handler({ params: zIdParams }, async ({ params }, _req, res) => {
    res.json(await admin.getUser(params.id));
  }));

  router.post('/users/:id/suspend', requirePermission('admin:users:write'), handler({ params: zIdParams, body: z.object({ reason: zReason }) }, async ({ params, body }, req, res) => {
    res.json(await admin.suspend(getUser(req), params.id, body.reason));
  }));

  router.post('/users/:id/reactivate', requirePermission('admin:users:write'), handler({ params: zIdParams }, async ({ params }, req, res) => {
    res.json(await admin.reactivate(getUser(req), params.id));
  }));

  router.post('/users/:id/roles', requirePermission('admin:roles:write'), handler({ params: zIdParams, body: z.object({ role: z.enum(ROLES) }) }, async ({ params, body }, req, res) => {
    res.json(await admin.grantRole(getUser(req), params.id, body.role));
  }));

  router.delete('/users/:id/roles/:role', requirePermission('admin:roles:write'), handler({ params: z.object({ id: zId, role: z.enum(ROLES) }) }, async ({ params }, req, res) => {
    res.json(await admin.revokeRole(getUser(req), params.id, params.role));
  }));

  // ----- partners -----

  router.get(
    '/partners',
    requirePermission('admin:partners:review'),
    handler({ query: zPagination.extend({ status: z.enum(['pending', 'approved', 'rejected', 'suspended']).optional() }) }, async ({ query }, _req, res) => {
      res.json(await partners.list(query.status, query.limit, query.offset));
    }),
  );

  router.post(
    '/partners/:id/review',
    requirePermission('admin:partners:review'),
    handler({ params: zIdParams, body: z.object({ decision: z.enum(['approve', 'reject', 'suspend']), reason: zReason.optional() }) }, async ({ params, body }, req, res) => {
      res.json(await partners.review(getUser(req).userId, params.id, body.decision, body.reason));
    }),
  );

  // ----- games -----

  router.get(
    '/games',
    requirePermission('admin:games:review'),
    handler({ query: zPagination.extend({ status: z.enum(['draft', 'pending_review', 'published', 'rejected', 'archived']).optional() }) }, async ({ query }, _req, res) => {
      res.json(await games.listByStatus(query.status, query.limit, query.offset));
    }),
  );

  router.post(
    '/games/:id/review',
    requirePermission('admin:games:review'),
    handler({ params: zIdParams, body: z.object({ decision: z.enum(['publish', 'reject']), reason: zReason.optional() }) }, async ({ params, body }, req, res) => {
      res.json(await games.review(getUser(req), params.id, body.decision, body.reason));
    }),
  );

  // ----- audit -----

  router.get(
    '/audit-logs',
    requirePermission('admin:audit:read'),
    handler({ query: zPagination.extend({ actorUserId: zId.optional(), action: z.string().max(100).optional(), targetId: z.string().max(100).optional() }) }, async ({ query }, _req, res) => {
      res.json(await admin.listAuditLogs(query));
    }),
  );

  return router;
};
