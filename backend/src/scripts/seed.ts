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
import { userRoles, users } from '../db/schema/index.js';
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
  genres: ['arcade', 'space'],
  platforms: ['web'],
  priceLamports: '500000000',
  minAge: 12,
});
const pixelPals = await createGame({ token: devon }, nebula.id, {
  title: 'Pixel Pals',
  slug: 'pixel-pals',
  shortDescription: 'A cosy free-to-play pet collector.',
  genres: ['casual'],
  platforms: ['web', 'ios', 'android'],
});
const voidRunner = await createGame({ token: devon }, nebula.id, { title: 'Void Runner', slug: 'void-runner', genres: ['runner'], priceLamports: '250000000' });
const cloneWars = await createGame({ token: nora }, nebula.id, { title: 'Totally Original Game', slug: 'totally-original-game', genres: ['arcade'] });
for (const g of [starDrifter, pixelPals, voidRunner, cloneWars]) await call('POST', `/games/${g.id}/submit`, { token: nora });
note('Star Drifter (0.5 SOL), Pixel Pals (free), Void Runner (0.25 SOL), Totally Original Game — all submitted for review');

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
  devon@nebula.dev    gamer + Nebula developer
  kai@kraken.dev      partner owner — Kraken Studio (pending)
  owner@shady.dev     partner owner — Shady Games (rejected)
  leo@gamer.dev       gamer, verified, 1 wallet, owns 2 games
  mia@gamer.dev       gamer, unverified, 2 wallets, 1 pending payment
  sam@gamer.dev       gamer, suspended
  (wallet-only)       gamer, signs in with keypair('wallet-only-gamer')

Browse it: npm run db:studio → https://local.drizzle.studio`);
