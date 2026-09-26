import { Router } from 'express';
import { z } from 'zod';
import { getUser, requirePermission, requireUser } from '../../shared/auth/index.js';
import { handler } from '../../shared/http.js';
import { zIdParams, zSolanaAddress } from '../../shared/validation.js';
import type { WalletService } from './wallets.service.js';

const LinkSchema = z.object({
  address: zSolanaAddress,
  nonce: z.string().min(16).max(64),
  signature: z.string().min(64).max(128),
  label: z.string().trim().min(1).max(50).optional(),
});
const UpdateSchema = z
  .object({ label: z.string().trim().min(1).max(50).nullable().optional(), isPrimary: z.literal(true).optional() })
  .refine((v) => v.label !== undefined || v.isPrimary, 'Nothing to update');

export const createWalletRouter = (wallets: WalletService): Router => {
  const router = Router();
  router.use(requireUser, requirePermission('wallets:manage'));

  router.get('/', handler({}, async (_i, req, res) => {
    res.json(await wallets.list(getUser(req).userId));
  }));

  router.post('/nonce', handler({ body: z.object({ address: zSolanaAddress }) }, async ({ body }, req, res) => {
    res.status(201).json(await wallets.requestLinkNonce(getUser(req).userId, body.address));
  }));

  router.post('/', handler({ body: LinkSchema }, async ({ body }, req, res) => {
    res.status(201).json(await wallets.link(getUser(req).userId, body));
  }));

  router.patch('/:id', handler({ params: zIdParams, body: UpdateSchema }, async ({ params, body }, req, res) => {
    res.json(await wallets.update(getUser(req).userId, params.id, body));
  }));

  router.delete('/:id', handler({ params: zIdParams }, async ({ params }, req, res) => {
    await wallets.unlink(getUser(req).userId, params.id);
    res.status(204).end();
  }));

  return router;
};
