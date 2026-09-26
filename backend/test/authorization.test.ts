import { beforeEach, describe, expect, it } from 'vitest';
import { api, approvedPartner, auth, makeAdmin, publishedGame, registerGamer, resetDb, uniq } from './helpers.js';

beforeEach(resetDb);

describe('role guards', () => {
  it('keeps non-admins out of /admin', async () => {
    const gamer = await registerGamer();
    await api().get('/admin/users').expect(401);
    await api().get('/admin/users').set(auth(gamer.token)).expect(403);

    const admin = await makeAdmin();
    const res = await api().get('/admin/users').set(auth(admin.token)).expect(200);
    expect(res.body.length).toBe(2);
  });

  it('suspension locks the user out immediately', async () => {
    const admin = await makeAdmin();
    const gamer = await registerGamer();
    await api().post(`/admin/users/${gamer.userId}/suspend`).set(auth(admin.token)).send({ reason: 'cheating' }).expect(200);
    await api().get('/auth/me').set(auth(gamer.token)).expect(401);
    await api().post('/auth/login').send({ email: gamer.email, password: gamer.password }).expect(403);
    await api().post(`/admin/users/${admin.userId}/suspend`).set(auth(admin.token)).send({ reason: 'oops' }).expect(403);
  });

  it('role changes apply without re-login', async () => {
    const admin = await makeAdmin();
    const gamer = await registerGamer();
    await api().get('/admin/users').set(auth(gamer.token)).expect(403);
    await api().post(`/admin/users/${gamer.userId}/roles`).set(auth(admin.token)).send({ role: 'admin' }).expect(200);
    await api().get('/admin/users').set(auth(gamer.token)).expect(200);
  });
});

describe('partner lifecycle and scoping', () => {
  it('pending partners cannot submit games; approval needs a payout wallet', async () => {
    const admin = await makeAdmin();
    const owner = await registerGamer();
    const id = uniq();
    const partner = await api()
      .post('/partners')
      .set(auth(owner.token))
      .send({ name: 'Indie', slug: `indie-${id}`, websiteUrl: 'https://indie.dev', contactEmail: 'hi@indie.dev' })
      .expect(201);
    expect(partner.body.status).toBe('pending');

    const me = await api().get('/auth/me').set(auth(owner.token)).expect(200);
    expect(me.body.roles.sort()).toEqual(['gamer', 'partner']);

    const game = await api()
      .post('/games')
      .set(auth(owner.token))
      .send({ partnerId: partner.body.id, title: 'Quest', slug: `quest-${id}`, launchUrl: 'https://indie.dev/play' })
      .expect(201);
    await api().post(`/games/${game.body.id}/submit`).set(auth(owner.token)).expect(400);
    await api().post(`/admin/partners/${partner.body.id}/review`).set(auth(admin.token)).send({ decision: 'approve' }).expect(400);
  });

  it('rejects non-HTTPS launch URLs', async () => {
    const admin = await makeAdmin();
    const { owner, partnerId } = await approvedPartner(admin.token);
    await api().post('/games').set(auth(owner.token)).send({ partnerId, title: 'X', slug: `x-${uniq()}`, launchUrl: 'http://insecure.dev' }).expect(400);
    await api().post('/games').set(auth(owner.token)).send({ partnerId, title: 'X', slug: `x-${uniq()}`, launchUrl: 'javascript:alert(1)' }).expect(400);
  });

  it("outsiders can't see or touch another partner's resources", async () => {
    const admin = await makeAdmin();
    const { owner, partnerId } = await approvedPartner(admin.token);
    const other = await approvedPartner(admin.token);
    const game = await api()
      .post('/games')
      .set(auth(owner.token))
      .send({ partnerId, title: 'Mine', slug: `mine-${uniq()}`, launchUrl: 'https://studio.dev/play' })
      .expect(201);

    // Another partner's owner holds `games:manage` but isn't a member here → 404, not 403.
    await api().get(`/partners/${partnerId}`).set(auth(other.owner.token)).expect(404);
    await api().patch(`/games/${game.body.id}`).set(auth(other.owner.token)).send({ title: 'Stolen' }).expect(404);
    await api().post('/games').set(auth(other.owner.token)).send({ partnerId, title: 'Spam', slug: `spam-${uniq()}`, launchUrl: 'https://x.dev' }).expect(404);
    // Plain gamers lack `games:manage` entirely.
    const gamer = await registerGamer();
    await api().patch(`/games/${game.body.id}`).set(auth(gamer.token)).send({ title: 'Stolen' }).expect(403);
  });

  it('enforces partner member roles', async () => {
    const admin = await makeAdmin();
    const { owner, partnerId } = await approvedPartner(admin.token);
    const dev = await registerGamer();
    await api().post(`/partners/${partnerId}/members`).set(auth(owner.token)).send({ email: dev.email, role: 'developer' }).expect(201);

    await api().get(`/partners/${partnerId}`).set(auth(dev.token)).expect(200);
    await api().patch(`/partners/${partnerId}`).set(auth(dev.token)).send({ name: 'Renamed' }).expect(403);
    await api().post(`/partners/${partnerId}/api-keys`).set(auth(dev.token)).send({ name: 'ci', scopes: ['games:manage'] }).expect(403);
    await api().delete(`/partners/${partnerId}/members/${owner.userId}`).set(auth(owner.token)).expect(403); // last owner
  });

  it('only published games of approved partners are public', async () => {
    const admin = await makeAdmin();
    const { owner, partnerId } = await approvedPartner(admin.token);
    const game = await publishedGame(admin.token, owner.token, partnerId);
    await api().get(`/games/${game.slug}`).expect(200);

    await api().post(`/admin/partners/${partnerId}/review`).set(auth(admin.token)).send({ decision: 'suspend', reason: 'fraud report' }).expect(200);
    await api().get(`/games/${game.slug}`).expect(404);
  });

  it('changing the launch URL of a live game sends it back to review', async () => {
    const admin = await makeAdmin();
    const { owner, partnerId } = await approvedPartner(admin.token);
    const game = await publishedGame(admin.token, owner.token, partnerId);
    const res = await api().patch(`/games/${game.id}`).set(auth(owner.token)).send({ launchUrl: 'https://elsewhere.dev' }).expect(200);
    expect(res.body.status).toBe('pending_review');
    await api().get(`/games/${game.slug}`).expect(404);
  });
});

describe('partner API keys', () => {
  it('authenticates, is scoped to its partner and scopes, and can be revoked', async () => {
    const admin = await makeAdmin();
    const { owner, partnerId } = await approvedPartner(admin.token);
    const other = await approvedPartner(admin.token);

    const created = await api().post(`/partners/${partnerId}/api-keys`).set(auth(owner.token)).send({ name: 'ci', scopes: ['games:manage'] }).expect(201);
    const key = created.body.key as string;
    expect(key).toMatch(/^pp_[a-zA-Z0-9]{12}_/);
    const listed = await api().get(`/partners/${partnerId}/api-keys`).set(auth(owner.token)).expect(200);
    expect(JSON.stringify(listed.body)).not.toContain(key);

    await api().post('/games').set('x-api-key', key).send({ partnerId, title: 'Via API', slug: `api-${uniq()}`, launchUrl: 'https://studio.dev/api' }).expect(201);
    await api().post('/games').set('x-api-key', key).send({ partnerId: other.partnerId, title: 'X', slug: `x-${uniq()}`, launchUrl: 'https://x.dev' }).expect(404);
    await api().get(`/payments/partner?partnerId=${partnerId}`).set('x-api-key', key).expect(403); // scope not granted
    await api().get('/wallets').set('x-api-key', key).expect(403); // user-only endpoint
    await api().get('/auth/me').set('x-api-key', 'pp_000000000000_forgedforgedforgedforgedforgedforged').expect(401);

    await api().delete(`/partners/${partnerId}/api-keys/${created.body.id}`).set(auth(owner.token)).expect(204);
    await api().get(`/games/manage?partnerId=${partnerId}`).set('x-api-key', key).expect(401);
  });
});
