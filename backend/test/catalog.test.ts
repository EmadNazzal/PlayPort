import { beforeEach, describe, expect, it } from 'vitest';
import { api, approvedPartner, auth, makeAdmin, resetDb, uniq } from './helpers.js';

beforeEach(resetDb);

const publish = async (adminToken: string, ownerToken: string, partnerId: string, game: { title: string; priceLamports: string; genres: string[] }) => {
  const created = await api()
    .post('/games')
    .set(auth(ownerToken))
    .send({ partnerId, slug: `g-${uniq()}`, launchUrl: 'https://studio.dev/play', ...game })
    .expect(201);
  await api().post(`/games/${created.body.id}/submit`).set(auth(ownerToken)).expect(200);
  await api().post(`/admin/games/${created.body.id}/review`).set(auth(adminToken)).send({ decision: 'publish' }).expect(200);
  return created.body as { id: string };
};

describe('public catalog', () => {
  it('filters by price and studio, sorts, and counts genres', async () => {
    const admin = await makeAdmin();
    const a = await approvedPartner(admin.token);
    const b = await approvedPartner(admin.token);
    await publish(admin.token, a.owner.token, a.partnerId, { title: 'Bravo', priceLamports: '300', genres: ['rpg', 'action'] });
    await publish(admin.token, a.owner.token, a.partnerId, { title: 'Alpha', priceLamports: '0', genres: ['rpg'] });
    await publish(admin.token, b.owner.token, b.partnerId, { title: 'Charlie', priceLamports: '100', genres: ['puzzle'] });
    // A draft must never leak into the catalog or the genre counts.
    await api().post('/games').set(auth(b.owner.token)).send({ partnerId: b.partnerId, title: 'Hidden', slug: `h-${uniq()}`, launchUrl: 'https://x.dev', genres: ['horror'] }).expect(201);

    const titles = (res: { body: { title: string }[] }) => res.body.map((g) => g.title);
    expect(titles(await api().get('/games?sort=title').expect(200))).toEqual(['Alpha', 'Bravo', 'Charlie']);
    expect(titles(await api().get('/games?sort=price_desc').expect(200))).toEqual(['Bravo', 'Charlie', 'Alpha']);
    expect(titles(await api().get('/games?price=free').expect(200))).toEqual(['Alpha']);
    expect(titles(await api().get('/games?price=paid&sort=price_asc').expect(200))).toEqual(['Charlie', 'Bravo']);

    const partnerB = (await api().get(`/partners/${b.partnerId}`).set(auth(b.owner.token)).expect(200)).body.slug as string;
    expect(titles(await api().get(`/games?partner=${partnerB}`).expect(200))).toEqual(['Charlie']);

    const genres = await api().get('/games/genres').expect(200);
    expect(genres.body).toEqual([
      { genre: 'rpg', games: 2 },
      { genre: 'action', games: 1 },
      { genre: 'puzzle', games: 1 },
    ]);
  });

  it('rejects unknown sort and price values', async () => {
    await api().get('/games?sort=popular').expect(400);
    await api().get('/games?price=cheap').expect(400);
  });
});
