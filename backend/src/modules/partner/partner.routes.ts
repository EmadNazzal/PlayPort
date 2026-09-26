import { Router } from 'express';
import { z } from 'zod';
import { API_KEY_SCOPES, getPrincipal, getUser, requireAuth, requirePermission, requireUser } from '../../shared/auth/index.js';
import { handler } from '../../shared/http.js';
import { zCountry, zEmail, zHttpsUrl, zId, zIdParams, zSlug, zSolanaAddress } from '../../shared/validation.js';
import type { PartnerService } from './partner.service.js';

const PartnerFields = {
  name: z.string().trim().min(2).max(80),
  slug: zSlug,
  websiteUrl: zHttpsUrl,
  contactEmail: zEmail,
  legalName: z.string().trim().min(2).max(160).nullable(),
  logoUrl: zHttpsUrl.nullable(),
  description: z.string().trim().max(2000).nullable(),
  country: zCountry.nullable(),
  payoutWalletAddress: zSolanaAddress.nullable(),
  webhookUrl: zHttpsUrl.nullable(),
};

const ApplySchema = z.object(PartnerFields).partial({
  legalName: true,
  logoUrl: true,
  description: true,
  country: true,
  payoutWalletAddress: true,
  webhookUrl: true,
});
const UpdateSchema = z
  .object(PartnerFields)
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

const MemberRole = z.enum(['owner', 'admin', 'developer']);

export const createPartnerRouter = (partners: PartnerService): Router => {
  const router = Router();

  router.post('/', requireUser, requirePermission('partners:apply'), handler({ body: ApplySchema }, async ({ body }, req, res) => {
    res.status(201).json(await partners.apply(getUser(req), body));
  }));

  router.get('/mine', requireUser, handler({}, async (_i, req, res) => {
    res.json(await partners.listMine(getUser(req).userId));
  }));

  router.get('/:id', requireAuth, handler({ params: zIdParams }, async ({ params }, req, res) => {
    res.json(await partners.get(getPrincipal(req), params.id));
  }));

  router.patch('/:id', requireUser, requirePermission('partners:manage'), handler({ params: zIdParams, body: UpdateSchema }, async ({ params, body }, req, res) => {
    res.json(await partners.update(getUser(req), params.id, body));
  }));

  // ----- members -----

  router.get('/:id/members', requireUser, handler({ params: zIdParams }, async ({ params }, req, res) => {
    res.json(await partners.listMembers(getUser(req), params.id));
  }));

  router.post(
    '/:id/members',
    requireUser,
    requirePermission('partners:manage'),
    handler({ params: zIdParams, body: z.object({ email: zEmail, role: MemberRole }) }, async ({ params, body }, req, res) => {
      await partners.addMember(getUser(req), params.id, body.email, body.role);
      res.status(201).json(await partners.listMembers(getUser(req), params.id));
    }),
  );

  router.delete(
    '/:id/members/:userId',
    requireUser,
    handler({ params: z.object({ id: zId, userId: zId }) }, async ({ params }, req, res) => {
      await partners.removeMember(getUser(req), params.id, params.userId);
      res.status(204).end();
    }),
  );

  // ----- API keys (managed by users only; a key can't mint keys) -----

  router.get('/:id/api-keys', requireUser, requirePermission('partners:manage'), handler({ params: zIdParams }, async ({ params }, req, res) => {
    res.json(await partners.listApiKeys(getUser(req), params.id));
  }));

  router.post(
    '/:id/api-keys',
    requireUser,
    requirePermission('partners:manage'),
    handler(
      {
        params: zIdParams,
        body: z.object({
          name: z.string().trim().min(1).max(60),
          scopes: z.array(z.enum(API_KEY_SCOPES)).min(1),
          expiresInDays: z.number().int().min(1).max(365).optional(),
        }),
      },
      async ({ params, body }, req, res) => {
        res.status(201).json(await partners.createApiKey(getUser(req), params.id, { ...body, scopes: [...new Set(body.scopes)] }));
      },
    ),
  );

  router.delete(
    '/:id/api-keys/:keyId',
    requireUser,
    requirePermission('partners:manage'),
    handler({ params: z.object({ id: zId, keyId: zId }) }, async ({ params }, req, res) => {
      await partners.revokeApiKey(getUser(req), params.id, params.keyId);
      res.status(204).end();
    }),
  );

  return router;
};
