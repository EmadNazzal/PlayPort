import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { sql } from 'drizzle-orm';
import nacl from 'tweetnacl';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { db } from '../src/db/client.js';
import { userRoles } from '../src/db/schema/index.js';
import type { SolanaGateway, VerifiedTransaction } from '../src/modules/payments/index.js';
import type { Mail } from '../src/shared/mailer.js';

export const mails: Mail[] = [];
export const chainTxs = new Map<string, VerifiedTransaction>();

const solana: SolanaGateway = { getTransaction: async (sig) => chainTxs.get(sig) ?? null };

export const app = createApp({ db, mailer: { send: async (m) => void mails.push(m) }, solana });
export const api = () => request(app);

export const resetDb = async () => {
  mails.length = 0;
  chainTxs.clear();
  await db.execute(sql`truncate table audit_logs, payments, game_entitlements, games, partner_api_keys, partner_members, partners, wallets, wallet_nonces, auth_tokens, sessions, gamer_profiles, user_roles, users cascade`);
};

let n = 0;
export const uniq = () => `${Date.now().toString(36)}${n++}`;

export const registerGamer = async (overrides: Partial<{ email: string; username: string; password: string }> = {}) => {
  const id = uniq();
  const body = { accountType: 'gamer', email: `g${id}@test.dev`, username: `g_${id}`, password: 'correct-horse-battery', ...overrides };
  const res = await api().post('/auth/register').set('x-token-transport', 'body').send(body).expect(201);
  const me = await api().get('/auth/me').set('authorization', `Bearer ${res.body.accessToken}`).expect(200);
  return { ...body, userId: me.body.id as string, token: res.body.accessToken as string, refreshToken: res.body.refreshToken as string };
};

export const makeAdmin = async () => {
  const user = await registerGamer();
  await db.insert(userRoles).values({ userId: user.userId, role: 'admin' });
  return user;
};

export const auth = (token: string) => ({ authorization: `Bearer ${token}` });

export const signMessage = (kp: Keypair, message: string) =>
  bs58.encode(nacl.sign.detached(new TextEncoder().encode(message), kp.secretKey));

/** Runs the link-wallet flow for a signed-in user. */
export const linkWallet = async (token: string, kp = Keypair.generate()) => {
  const address = kp.publicKey.toBase58();
  const nonce = await api().post('/wallets/nonce').set(auth(token)).send({ address }).expect(201);
  await api()
    .post('/wallets')
    .set(auth(token))
    .send({ address, nonce: nonce.body.nonce, signature: signMessage(kp, nonce.body.message) })
    .expect(201);
  return kp;
};

/** Gamer applies as partner → admin approves → returns partner + owner token. */
export const approvedPartner = async (adminToken: string) => {
  const owner = await registerGamer();
  const id = uniq();
  const payout = Keypair.generate().publicKey.toBase58();
  const partner = await api()
    .post('/partners')
    .set(auth(owner.token))
    .send({ name: `Studio ${id}`, slug: `studio-${id}`, websiteUrl: 'https://studio.dev', contactEmail: `s${id}@studio.dev`, payoutWalletAddress: payout })
    .expect(201);
  await api().post(`/admin/partners/${partner.body.id}/review`).set(auth(adminToken)).send({ decision: 'approve' }).expect(200);
  return { owner, partnerId: partner.body.id as string, payout };
};

export const publishedGame = async (adminToken: string, ownerToken: string, partnerId: string, priceLamports = '0') => {
  const id = uniq();
  const game = await api()
    .post('/games')
    .set(auth(ownerToken))
    .send({ partnerId, title: `Game ${id}`, slug: `game-${id}`, launchUrl: 'https://studio.dev/play', priceLamports })
    .expect(201);
  await api().post(`/games/${game.body.id}/submit`).set(auth(ownerToken)).expect(200);
  await api().post(`/admin/games/${game.body.id}/review`).set(auth(adminToken)).send({ decision: 'publish' }).expect(200);
  return game.body as { id: string; slug: string };
};
