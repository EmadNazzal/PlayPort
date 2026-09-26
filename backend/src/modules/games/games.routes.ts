import { Router } from 'express';
import { z } from 'zod';
import { getPrincipal, getUser, requireAuth, requirePermission, requireUser } from '../../shared/auth/index.js';
import { handler } from '../../shared/http.js';
import { zHttpsUrl, zId, zIdParams, zLamports, zPagination, zSlug } from '../../shared/validation.js';
import type { GameService } from './games.service.js';

const zTag = z.string().trim().toLowerCase().min(1).max(30);

const GameFields = {
  title: z.string().trim().min(1).max(120),
  slug: zSlug,
  launchUrl: zHttpsUrl,
  shortDescription: z.string().trim().max(200).nullable(),
  description: z.string().trim().max(10_000).nullable(),
  genres: z.array(zTag).max(10),
  platforms: z.array(z.enum(['web', 'windows', 'macos', 'linux', 'ios', 'android'])).max(6),
  thumbnailUrl: zHttpsUrl.nullable(),
  bannerUrl: zHttpsUrl.nullable(),
  priceLamports: zLamports,
  minAge: z.number().int().min(0).max(21).nullable(),
};

const CreateSchema = z
  .object({ partnerId: zId, ...GameFields })
  .partial({ shortDescription: true, description: true, genres: true, platforms: true, thumbnailUrl: true, bannerUrl: true, priceLamports: true, minAge: true });
const UpdateSchema = z
  .object(GameFields)
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

const CatalogQuery = zPagination.extend({ search: z.string().trim().max(100).optional(), genre: zTag.optional() });

export const createGameRouter = (games: GameService): Router => {
  const router = Router();

  // ----- public catalog -----

  router.get('/', handler({ query: CatalogQuery }, async ({ query }, _req, res) => {
    res.json(await games.listPublic(query));
  }));

  // ----- partner management (users with partner membership, or partner API keys) -----
  // Declared before '/:slug' so 'manage' isn't read as a slug.

  router.get('/manage', requireAuth, requirePermission('games:manage'), handler({ query: z.object({ partnerId: zId }) }, async ({ query }, req, res) => {
    res.json(await games.listForPartner(getPrincipal(req), query.partnerId));
  }));

  router.get('/:slug', handler({ params: z.object({ slug: zSlug }) }, async ({ params }, _req, res) => {
    res.json(await games.getPublicBySlug(params.slug));
  }));

  router.post('/', requireAuth, requirePermission('games:manage'), handler({ body: CreateSchema }, async ({ body }, req, res) => {
    const { partnerId, ...input } = body;
    res.status(201).json(await games.create(getPrincipal(req), partnerId, input));
  }));

  router.patch('/:id', requireAuth, requirePermission('games:manage'), handler({ params: zIdParams, body: UpdateSchema }, async ({ params, body }, req, res) => {
    res.json(await games.update(getPrincipal(req), params.id, body));
  }));

  router.post('/:id/submit', requireAuth, requirePermission('games:manage'), handler({ params: zIdParams }, async ({ params }, req, res) => {
    res.json(await games.submitForReview(getPrincipal(req), params.id));
  }));

  router.post('/:id/archive', requireAuth, requirePermission('games:manage'), handler({ params: zIdParams }, async ({ params }, req, res) => {
    res.json(await games.archive(getPrincipal(req), params.id));
  }));

  // ----- gamers -----

  router.post('/:id/claim', requireUser, requirePermission('games:claim'), handler({ params: zIdParams }, async ({ params }, req, res) => {
    res.status(201).json(await games.claimFree(getUser(req).userId, params.id));
  }));

  return router;
};
