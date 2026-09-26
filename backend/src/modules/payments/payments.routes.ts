import { Router } from 'express';
import { z } from 'zod';
import { getPrincipal, getUser, requireAuth, requirePermission, requireUser } from '../../shared/auth/index.js';
import { handler } from '../../shared/http.js';
import { zId, zIdParams } from '../../shared/validation.js';
import type { PaymentService } from './payments.service.js';

const zSignature = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{64,90}$/, 'Invalid transaction signature');

export const createPaymentRouter = (payments: PaymentService): Router => {
  const router = Router();

  router.get('/', requireUser, handler({}, async (_i, req, res) => {
    res.json(await payments.listMine(getUser(req).userId));
  }));

  router.post('/', requireUser, requirePermission('payments:create'), handler({ body: z.object({ gameId: zId }) }, async ({ body }, req, res) => {
    res.status(201).json(await payments.create(getUser(req).userId, body.gameId));
  }));

  router.post(
    '/:id/confirm',
    requireUser,
    requirePermission('payments:create'),
    handler({ params: zIdParams, body: z.object({ signature: zSignature }) }, async ({ params, body }, req, res) => {
      res.json(await payments.confirm(getUser(req).userId, params.id, body.signature));
    }),
  );

  router.get(
    '/partner',
    requireAuth,
    requirePermission('payments:read_partner'),
    handler({ query: z.object({ partnerId: zId }) }, async ({ query }, req, res) => {
      res.json(await payments.listForPartner(getPrincipal(req), query.partnerId));
    }),
  );

  return router;
};
