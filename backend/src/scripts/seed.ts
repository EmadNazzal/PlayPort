/**
 * Resets the local database and fills it with mock data by walking through the real API
 * flows (so the audit log reads like real usage). Development only.
 *
 *   npm run db:seed
 *
 * Every email account uses SEED_PASSWORD below. Wallet keypairs are derived from fixed seeds so
 * addresses are stable between runs — they are mock keys; never fund them.
 * Payments are confirmed against a fake chain, so their tx signatures don't exist on Solana.
 */
import { createHash } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { sql } from 'drizzle-orm';
import nacl from 'tweetnacl';
import { createApp } from '../app.js';
import { db, pool } from '../db/client.js';
import { games, userRoles, users } from '../db/schema/index.js';
import type { SolanaGateway, VerifiedTransaction } from '../modules/payments/index.js';
import { config } from '../shared/config.js';
import type { Mail } from '../shared/mailer.js';

const SEED_PASSWORD = 'playport-dev-password';

if (config.NODE_ENV === 'production') throw new Error('Refusing to seed a production database');

// ----- fakes for the outside world -----

const mails: Mail[] = [];
const chain = new Map<string, VerifiedTransaction>();
const solana: SolanaGateway = { getTransaction: async (sig) => chain.get(sig) ?? null };

const keypair = (name: string) => Keypair.fromSeed(createHash('sha256').update(`playport-seed:${name}`).digest());
const sign = (kp: Keypair, message: string) => bs58.encode(nacl.sign.detached(new TextEncoder().encode(message), kp.secretKey));
const fakeSignature = (name: string) => bs58.encode(createHash('sha512').update(`playport-seed-tx:${name}`).digest());
const lastMailToken = () => new URL(mails.at(-1)!.text).searchParams.get('token')!;

// ----- tiny API client -----

const server = createApp({ db, solana, mailer: { send: async (m) => void mails.push(m) } }).listen(0);
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

type Json = Record<string, any>;
const call = async (method: string, path: string, opts: { token?: string; apiKey?: string; body?: unknown } = {}): Promise<Json> => {
  const res = await fetch(base + path, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-token-transport': 'body',
      ...(opts.token && { authorization: `Bearer ${opts.token}` }),
      ...(opts.apiKey && { 'x-api-key': opts.apiKey }),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text}`);
  return text ? JSON.parse(text) : {};
};

const step = (msg: string) => console.log(`\n▸ ${msg}`);
const note = (msg: string) => console.log(`    ${msg}`);

const register = async (body: Json) => (await call('POST', '/auth/register', { body })).accessToken as string;

const walletSignIn = async (kp: Keypair) => {
  const address = kp.publicKey.toBase58();
  const { nonce, message } = await call('POST', '/auth/wallet/nonce', { body: { address } });
  return call('POST', '/auth/wallet/verify', { body: { address, nonce, signature: sign(kp, message) } });
};

const linkWallet = async (token: string, kp: Keypair, label: string) => {
  const address = kp.publicKey.toBase58();
  const { nonce, message } = await call('POST', '/wallets/nonce', { token, body: { address } });
  await call('POST', '/wallets', { token, body: { address, nonce, signature: sign(kp, message), label } });
  return address;
};

const createGame = (auth: { token?: string; apiKey?: string }, partnerId: string, game: Json) =>
  call('POST', '/games', { ...auth, body: { partnerId, launchUrl: `https://play.example.com/${game.slug}`, ...game } });

/** Gamer buys a game: intent → wallet transfer (faked on-chain) → confirm. */
const buy = async (token: string, gameId: string, payer: Keypair, name: string) => {
  const intent = await call('POST', '/payments', { token, body: { gameId } });
  const signature = fakeSignature(name);
  chain.set(signature, {
    err: null,
    blockTime: new Date(),
    accountKeys: [payer.publicKey.toBase58(), intent.recipientAddress, intent.reference],
    transfers: [{ source: payer.publicKey.toBase58(), destination: intent.recipientAddress, lamports: BigInt(intent.amountLamports) }],
  });
  await call('POST', `/payments/${intent.id}/confirm`, { token, body: { signature } });
  return intent;
};

// ----- the story -----

step('Resetting database');
await db.execute(sql`truncate table audit_logs, payments, game_entitlements, games, partner_api_keys, partner_members, partners, wallets, wallet_nonces, auth_tokens, sessions, gamer_profiles, user_roles, users cascade`);

step('Admin: Ava bootstraps the platform (normally `npm run create-admin`)');
await register({ accountType: 'partner', email: 'ava@playport.dev', password: SEED_PASSWORD, displayName: 'Ava (Admin)' });
const [ava] = await db.select({ id: users.id }).from(users).where(sql`${users.email} = 'ava@playport.dev'`);
await db.insert(userRoles).values({ userId: ava!.id, role: 'admin' });
const admin = (await call('POST', '/auth/login', { body: { email: 'ava@playport.dev', password: SEED_PASSWORD } })).accessToken as string;
note('ava@playport.dev — roles: admin');

step('Partner 1: Nora signs up and applies for "Nebula Games"');
const nora = await register({ accountType: 'partner', email: 'nora@nebula.dev', password: SEED_PASSWORD, displayName: 'Nora Nebula' });
await call('POST', '/auth/verify-email', { body: { token: lastMailToken() } });
const nebulaPayout = keypair('nebula-payout').publicKey.toBase58();
const nebula = await call('POST', '/partners', {
  token: nora,
  body: {
    name: 'Nebula Games',
    slug: 'nebula-games',
    websiteUrl: 'https://nebula.example.com',
    contactEmail: 'hello@nebula.dev',
    legalName: 'Nebula Games Ltd.',
    country: 'IE',
    description: 'Space-themed arcade games playable in the browser.',
    payoutWalletAddress: nebulaPayout,
    webhookUrl: 'https://nebula.example.com/playport/webhook',
  },
});
note(`status: ${nebula.status} — Nora is now its owner and gained the global "partner" role`);

step('Admin approves Nebula Games');
await call('POST', `/admin/partners/${nebula.id}/review`, { token: admin, body: { decision: 'approve' } });

step('Nora adds Devon (already a gamer) to the Nebula team as a developer');
await register({ accountType: 'gamer', email: 'devon@nebula.dev', password: SEED_PASSWORD, username: 'devon' });
await call('POST', `/partners/${nebula.id}/members`, { token: nora, body: { email: 'devon@nebula.dev', role: 'developer' } });
const devon = (await call('POST', '/auth/login', { body: { email: 'devon@nebula.dev', password: SEED_PASSWORD } })).accessToken as string;
note('devon — roles: gamer + partner (developer at Nebula)');

step('Nebula lists games');
const starDrifter = await createGame({ token: nora }, nebula.id, {
  title: 'Star Drifter',
  slug: 'star-drifter',
  shortDescription: 'Drift between asteroid fields and outrun the void.',
  description:
    'A momentum-based space racer where every drift charges your boost. Chain slingshots around dying stars, dodge collapsing asteroid belts and climb weekly leaderboards against pilots worldwide.',
  genres: ['racing', 'arcade', 'space'],
  platforms: ['web', 'windows', 'macos'],
  priceLamports: '500000000',
  minAge: 12,
});
const pixelPals = await createGame({ token: devon }, nebula.id, {
  title: 'Pixel Pals',
  slug: 'pixel-pals',
  shortDescription: 'A cosy free-to-play pet collector.',
  description: 'Hatch, raise and trade hand-drawn pixel pets. Decorate their island, visit friends and discover over 200 rare pals across the seasons.',
  genres: ['casual', 'simulation'],
  platforms: ['web', 'ios', 'android'],
});
const voidRunner = await createGame({ token: devon }, nebula.id, { title: 'Void Runner', slug: 'void-runner', genres: ['runner'], priceLamports: '250000000' });
const cloneWars = await createGame({ token: nora }, nebula.id, { title: 'Totally Original Game', slug: 'totally-original-game', genres: ['arcade'] });
for (const g of [starDrifter, pixelPals, voidRunner, cloneWars]) await call('POST', `/games/${g.id}/submit`, { token: nora });
note('Star Drifter (0.5 SOL), Pixel Pals (free), Void Runner (0.25 SOL), Totally Original Game — all submitted for review');

step('More studios join and fill the catalog');
type CatalogGame = { title: string; slug: string; short: string; description: string; genres: string[]; platforms: string[]; sol: number; minAge?: number };
const STUDIOS: { name: string; slug: string; owner: string; country: string; description: string; games: CatalogGame[] }[] = [
  {
    name: 'Nebula Games',
    slug: 'nebula-games',
    owner: 'nora@nebula.dev',
    country: 'IE',
    description: '',
    games: [
      { title: 'Orbital Siege', slug: 'orbital-siege', short: 'Defend a ring-world from waves of drone swarms.', description: 'Build turrets along a rotating megastructure and bend gravity to redirect swarms into each other. Twelve sectors, a brutal endless mode and a co-op campaign for two.', genres: ['strategy', 'tower-defense', 'space'], platforms: ['web', 'windows'], sol: 0.8, minAge: 12 },
      { title: 'Comet Tail', slug: 'comet-tail', short: 'One-touch arcade flyer through neon nebulae.', description: 'Tap to swing, release to fling. A hypnotic one-button arcade game with a synthwave soundtrack and daily seeded runs.', genres: ['arcade', 'casual'], platforms: ['web', 'ios', 'android'], sol: 0 },
    ],
  },
  {
    name: 'Ember Forge',
    slug: 'ember-forge',
    owner: 'rin@emberforge.dev',
    country: 'JP',
    description: 'Hand-crafted action RPGs with a love for ink and fire.',
    games: [
      { title: 'Ashen Crown', slug: 'ashen-crown', short: 'A fallen kingdom, a cursed blade, and a thousand embers.', description: 'A punishing ink-brushed action RPG. Parry, riposte and burn through six ruined provinces to reclaim a crown that does not want you. Every boss is a duel written like a poem.', genres: ['rpg', 'action', 'souls-like'], platforms: ['web', 'windows', 'macos', 'linux'], sol: 1.8, minAge: 16 },
      { title: 'Lanternfall', slug: 'lanternfall', short: 'Guide lost spirits home before the last lantern dies.', description: 'A meditative puzzle-adventure across a floating festival town. Light paths, bend time and uncover why the spirits stopped coming home.', genres: ['puzzle', 'adventure'], platforms: ['web', 'ios'], sol: 0.4 },
      { title: 'Blade & Blossom', slug: 'blade-and-blossom', short: 'Duel masters across four seasons of a blooming valley.', description: 'A fast, readable 1v1 fighting game with seasonal arenas that change the rules: slippery winter ice, blinding spring pollen, summer storms and falling autumn leaves.', genres: ['fighting', 'action', 'multiplayer'], platforms: ['web', 'windows'], sol: 0.6, minAge: 12 },
      { title: 'Kitsune Road', slug: 'kitsune-road', short: 'A roguelike road trip with a shapeshifting fox.', description: 'Every run is a new road. Collect masks that grant forms, befriend spirits at roadside shrines and outwit the tanuki bandits. Free forever, with seasonal cosmetic drops.', genres: ['roguelike', 'adventure'], platforms: ['web', 'android'], sol: 0, minAge: 10 },
    ],
  },
  {
    name: 'Tidewater Interactive',
    slug: 'tidewater',
    owner: 'marco@tidewater.dev',
    country: 'PT',
    description: 'Ocean-obsessed studio making systemic survival and strategy games.',
    games: [
      { title: 'Abyssal', slug: 'abyssal', short: 'Survive the pressure. Descend the trench.', description: 'A tense survival horror set in a collapsing deep-sea research station. Manage oxygen, reroute power and listen carefully — something in the trench is learning your routines.', genres: ['horror', 'survival'], platforms: ['windows', 'macos', 'linux'], sol: 1.2, minAge: 18 },
      { title: 'Harbor Kings', slug: 'harbor-kings', short: 'Build a trading empire one dock at a time.', description: 'A cosy-but-cutthroat port management sim. Negotiate with smugglers, weather storms, and grow a fishing village into the busiest harbor on the coast.', genres: ['strategy', 'simulation'], platforms: ['web', 'windows', 'macos'], sol: 0.9 },
      { title: 'Reefbreak', slug: 'reefbreak', short: 'Arcade surfing on procedurally generated swells.', description: 'Read the wave, carve the face, land the aerial. Reefbreak turns real swell physics into a fast arcade score-chaser with a global daily wave.', genres: ['sports', 'arcade'], platforms: ['web', 'ios', 'android'], sol: 0.3 },
      { title: 'Salt & Iron', slug: 'salt-and-iron', short: 'Naval tactics in a world of steam and sail.', description: 'Command a fleet in turn-based naval battles where wind, fog and ammunition matter. A branching campaign of 40 engagements and ranked online matches.', genres: ['strategy', 'tactics', 'multiplayer'], platforms: ['web', 'windows'], sol: 1.5, minAge: 12 },
    ],
  },
  {
    name: 'Ironclad Interactive',
    slug: 'ironclad',
    owner: 'rhea@ironclad.dev',
    country: 'SE',
    description: 'Competitive tactical shooters with hosted ranked servers.',
    games: [
      { title: 'Breach Protocol', slug: 'breach-protocol', short: 'Five rounds. One bomb site. No second chances.', description: 'A tactical 5v5 and 1v1 shooter played on Ironclad’s own servers. Plant, defuse, clutch. Supports head-to-head wager matches settled on PlayPort.', genres: ['shooter', 'tactical', 'multiplayer'], platforms: ['web', 'windows'], sol: 0, minAge: 16 },
    ],
  },
  {
    name: 'Honeycomb Games',
    slug: 'honeycomb',
    owner: 'bea@honeycomb.dev',
    country: 'DK',
    description: 'Bright, snackable puzzle games for every phone.',
    games: [
      { title: 'Sugarfall', slug: 'sugarfall', short: 'Swap, match and pop your way through a candy kingdom.', description: 'A sparkling match-3 with 900 levels, daily challenges and power-ups you can buy in-game with your PlayPort wallet.', genres: ['match-3', 'puzzle', 'casual'], platforms: ['web', 'ios', 'android'], sol: 0 },
    ],
  },
  {
    name: 'Glyph & Gear',
    slug: 'glyph-and-gear',
    owner: 'ines@glyphgear.dev',
    country: 'DE',
    description: 'Tiny team, big mechanics. Precision platformers and clever card games.',
    games: [
      { title: 'Clockwork Heart', slug: 'clockwork-heart', short: 'A precision platformer where time is your jump.', description: 'Rewind, pause and fast-forward the world around a tiny wind-up robot. 120 hand-built rooms, a speedrun mode and ghost races against friends.', genres: ['platformer', 'puzzle'], platforms: ['web', 'windows', 'macos', 'linux'], sol: 0.7 },
      { title: 'Runeshard', slug: 'runeshard', short: 'Deckbuilding duels with living cards.', description: 'Cards evolve as you play them. Build decks from shards of forgotten runes, draft in weekly expeditions and duel on the ranked ladder. Free to play, no pay-to-win.', genres: ['card', 'strategy', 'multiplayer'], platforms: ['web', 'ios', 'android'], sol: 0, minAge: 10 },
      { title: 'Neon Rally', slug: 'neon-rally', short: 'Top-down rally racing through a synthwave city.', description: 'Drift through rain-slick neon streets in a top-down racer tuned for tight controls. Split-screen for four, online time trials and a track editor.', genres: ['racing', 'arcade', 'multiplayer'], platforms: ['web', 'windows'], sol: 0.45 },
      { title: 'Paper Mechs', slug: 'paper-mechs', short: 'Fold, arm and battle origami robots.', description: 'Design mechs out of folded paper, test them in physics-driven arenas and watch them crumple gloriously. A sandbox builder with a surprisingly deep campaign.', genres: ['simulation', 'action', 'sandbox'], platforms: ['web', 'windows', 'macos'], sol: 0.55 },
      { title: 'Sigil', slug: 'sigil', short: 'Draw spells. Break the tower.', description: 'A gesture-driven roguelike: draw sigils with your mouse or finger to cast spells, combine strokes into combos and climb a tower that rearranges itself every night.', genres: ['roguelike', 'action'], platforms: ['web', 'ios'], sol: 0.35, minAge: 12 },
    ],
  },
];

const catalogGameIds: string[] = [];
for (const studio of STUDIOS) {
  let partnerId = nebula.id as string;
  let ownerToken = nora;
  if (studio.slug !== 'nebula-games') {
    ownerToken = await register({ accountType: 'partner', email: studio.owner, password: SEED_PASSWORD, displayName: studio.name });
    const partner = await call('POST', '/partners', {
      token: ownerToken,
      body: {
        name: studio.name,
        slug: studio.slug,
        websiteUrl: `https://${studio.slug}.example.com`,
        contactEmail: studio.owner,
        country: studio.country,
        description: studio.description,
        payoutWalletAddress: keypair(`${studio.slug}-payout`).publicKey.toBase58(),
      },
    });
    await call('POST', `/admin/partners/${partner.id}/review`, { token: admin, body: { decision: 'approve' } });
    partnerId = partner.id;
  }
  for (const g of studio.games) {
    const game = await createGame({ token: ownerToken }, partnerId, {
      title: g.title,
      slug: g.slug,
      shortDescription: g.short,
      description: g.description,
      genres: g.genres,
      platforms: g.platforms,
      priceLamports: String(Math.round(g.sol * 1e9)),
      ...(g.minAge !== undefined && { minAge: g.minAge }),
    });
    await call('POST', `/games/${game.id}/submit`, { token: ownerToken });
    await call('POST', `/admin/games/${game.id}/review`, { token: admin, body: { decision: 'publish' } });
    catalogGameIds.push(game.id);
  }
  note(`${studio.name}: ${studio.games.length} games published`);
}

step('Admin reviews games');
await call('POST', `/admin/games/${starDrifter.id}/review`, { token: admin, body: { decision: 'publish' } });
await call('POST', `/admin/games/${pixelPals.id}/review`, { token: admin, body: { decision: 'publish' } });
await call('POST', `/admin/games/${cloneWars.id}/review`, { token: admin, body: { decision: 'reject', reason: 'Uses copyrighted assets' } });
note('published: Star Drifter, Pixel Pals · rejected: Totally Original Game · still pending: Void Runner');

step("Nebula's backend gets an API key and creates a draft game with it");
const apiKey = await call('POST', `/partners/${nebula.id}/api-keys`, { token: nora, body: { name: 'CI pipeline', scopes: ['games:manage', 'payments:read_partner'] } });
await createGame({ apiKey: apiKey.key }, nebula.id, { title: 'Moon Miner', slug: 'moon-miner', genres: ['idle'] });
note(`key ${apiKey.prefix}… (full key: ${apiKey.key})`);
note('Moon Miner stays a draft');

step('Partner 2: Kai applies for "Kraken Studio" (left pending, no payout wallet yet)');
const kai = await register({ accountType: 'partner', email: 'kai@kraken.dev', password: SEED_PASSWORD, displayName: 'Kai Kraken' });
const kraken = await call('POST', '/partners', {
  token: kai,
  body: { name: 'Kraken Studio', slug: 'kraken-studio', websiteUrl: 'https://kraken.example.com', contactEmail: 'team@kraken.dev', country: 'PT' },
});
await createGame({ token: kai }, kraken.id, { title: 'Deep Dive', slug: 'deep-dive', genres: ['adventure'], priceLamports: '1000000000' });
note('Kraken Studio: pending · Deep Dive: draft (can’t be submitted until Kraken is approved)');

step('Partner 3: "Shady Games" applies and is rejected');
const shady = await register({ accountType: 'partner', email: 'owner@shady.dev', password: SEED_PASSWORD, displayName: 'Shady Owner' });
const shadyPartner = await call('POST', '/partners', {
  token: shady,
  body: { name: 'Shady Games', slug: 'shady-games', websiteUrl: 'https://shady.example.com', contactEmail: 'owner@shady.dev', payoutWalletAddress: keypair('shady-payout').publicKey.toBase58() },
});
await call('POST', `/admin/partners/${shadyPartner.id}/review`, { token: admin, body: { decision: 'reject', reason: 'Could not verify the business' } });

step('Spreading release dates over the last few months');
const published = await db.select({ id: games.id }).from(games).where(sql`${games.status} = 'published'`).orderBy(games.createdAt);
for (const [i, g] of published.entries()) {
  const daysAgo = (published.length - i) * 6 + (i % 3);
  await db.update(games).set({ publishedAt: new Date(Date.now() - daysAgo * 86_400_000) }).where(sql`${games.id} = ${g.id}`);
}
note(`${published.length} published games`);

step('Gamer Leo: email sign-up, verifies email, links a wallet, buys Star Drifter, claims Pixel Pals');
const leo = await register({ accountType: 'gamer', email: 'leo@gamer.dev', password: SEED_PASSWORD, username: 'leo' });
await call('POST', '/auth/verify-email', { body: { token: lastMailToken() } });
await call('PATCH', '/gamers/me', { token: leo, body: { bio: 'Speedrunner. Space games only.', country: 'IE', dateOfBirth: '1998-04-12' } });
const leoWallet = keypair('leo-phantom');
await linkWallet(leo, leoWallet, 'Phantom');
await buy(leo, starDrifter.id, leoWallet, 'leo-star-drifter');
await call('POST', `/games/${pixelPals.id}/claim`, { token: leo });
note(`wallet ${leoWallet.publicKey.toBase58()} · paid 0.5 SOL → Nebula · library: Star Drifter, Pixel Pals`);

step('Gamer Mia: email sign-up (unverified), links two wallets, starts a purchase but never pays');
const mia = await register({ accountType: 'gamer', email: 'mia@gamer.dev', password: SEED_PASSWORD, username: 'mia' });
await linkWallet(mia, keypair('mia-solflare'), 'Solflare');
await linkWallet(mia, keypair('mia-backpack'), 'Backpack');
await call('POST', '/payments', { token: mia, body: { gameId: starDrifter.id } });
note('payment left pending');

step('Gamer 3: signs in with only a wallet (no email, no password)');
const walletOnly = keypair('wallet-only-gamer');
const siws = await walletSignIn(walletOnly);
await call('POST', `/games/${pixelPals.id}/claim`, { token: siws.accessToken });
const me = await call('GET', '/gamers/me', { token: siws.accessToken });
note(`account auto-created as "${me.username}" · wallet ${walletOnly.publicKey.toBase58()} · claimed Pixel Pals`);

step('Gamer Sam: signs up, then an admin suspends them');
await register({ accountType: 'gamer', email: 'sam@gamer.dev', password: SEED_PASSWORD, username: 'sam' });
const [sam] = await db.select({ id: users.id }).from(users).where(sql`${users.email} = 'sam@gamer.dev'`);
await call('POST', `/admin/users/${sam!.id}/suspend`, { token: admin, body: { reason: 'Chargeback fraud' } });
note('sam can no longer log in; all sessions revoked');

server.close();
await pool.end();

console.log(`
Done. Email accounts all use the password in SEED_PASSWORD (src/scripts/seed.ts):

  ava@playport.dev    admin
  nora@nebula.dev     partner owner — Nebula Games (approved)
  rin@emberforge.dev, marco@tidewater.dev, ines@glyphgear.dev — owners of the other approved studios
  devon@nebula.dev    gamer + Nebula developer
  kai@kraken.dev      partner owner — Kraken Studio (pending)
  owner@shady.dev     partner owner — Shady Games (rejected)
  leo@gamer.dev       gamer, verified, 1 wallet, owns 2 games
  mia@gamer.dev       gamer, unverified, 2 wallets, 1 pending payment
  sam@gamer.dev       gamer, suspended
  (wallet-only)       gamer, signs in with keypair('wallet-only-gamer')

Browse it: npm run db:studio → https://local.drizzle.studio`);
