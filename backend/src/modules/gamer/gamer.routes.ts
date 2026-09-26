import { Router } from 'express';
import { z } from 'zod';
import { getUser, requirePermission, requireUser } from '../../shared/auth/index.js';
import { handler } from '../../shared/http.js';
import { zCountry, zHttpsUrl, zUsername } from '../../shared/validation.js';
import type { GamerService } from './gamer.service.js';

const UpdateMeSchema = z
  .object({
    username: zUsername,
    displayName: z.string().trim().min(1).max(80),
    avatarUrl: zHttpsUrl.nullable(),
    bio: z.string().trim().max(500).nullable(),
    country: zCountry.nullable(),
    dateOfBirth: z
      .string()
      .date()
      .refine((d) => new Date(d) < new Date(), 'Must be in the past')
      .nullable(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

export const createGamerRouter = (gamers: GamerService): Router => {
  const router = Router();

  router.get('/me', requireUser, handler({}, async (_i, req, res) => {
    res.json(await gamers.getMe(getUser(req).userId));
  }));

  router.patch('/me', requireUser, requirePermission('profile:write'), handler({ body: UpdateMeSchema }, async ({ body }, req, res) => {
    res.json(await gamers.updateMe(getUser(req).userId, body));
  }));

  router.get('/me/library', requireUser, handler({}, async (_i, req, res) => {
    res.json(await gamers.library(getUser(req).userId));
  }));

  router.get('/:username', handler({ params: z.object({ username: zUsername }) }, async ({ params }, _req, res) => {
    res.json(await gamers.getPublic(params.username));
  }));

  return router;
};
