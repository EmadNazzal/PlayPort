import { Keypair } from '@solana/web3.js';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../src/db/client.js';
import { sessions } from '../src/db/schema/index.js';
import { api, app, auth, mails, registerGamer, resetDb, signMessage } from './helpers.js';

beforeEach(resetDb);

describe('email + password', () => {
  it('registers a gamer with the gamer role and a refresh cookie', async () => {
    const res = await api()
      .post('/auth/register')
      .send({ accountType: 'gamer', email: 'Neo@Test.dev', username: 'neo', password: 'correct-horse-battery' })
      .expect(201);
    expect(res.body.refreshToken).toBeUndefined(); // browsers only get the cookie
    expect(res.headers['set-cookie']?.[0]).toMatch(/pp_refresh=.+HttpOnly.+SameSite=Strict/i);

    const me = await api().get('/auth/me').set(auth(res.body.accessToken)).expect(200);
    expect(me.body).toMatchObject({ email: 'neo@test.dev', roles: ['gamer'], hasPassword: true, emailVerifiedAt: null });
  });

  it('rejects duplicate emails (case-insensitive) and usernames', async () => {
    const g = await registerGamer();
    await api().post('/auth/register').send({ accountType: 'gamer', email: g.email.toUpperCase(), username: 'other_one', password: 'correct-horse-battery' }).expect(409);
    await api().post('/auth/register').send({ accountType: 'gamer', email: 'new@test.dev', username: g.username, password: 'correct-horse-battery' }).expect(409);
  });

  it('validates input with zod', async () => {
    const res = await api().post('/auth/register').send({ accountType: 'gamer', email: 'nope', username: 'x', password: 'short' }).expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    await api().post('/auth/register').send({ accountType: 'superuser' }).expect(400);
  });

  it('logs in with the right password only, with the same error for unknown emails', async () => {
    const g = await registerGamer();
    const wrong = await api().post('/auth/login').send({ email: g.email, password: 'wrong-password' }).expect(401);
    const unknown = await api().post('/auth/login').send({ email: 'ghost@test.dev', password: 'wrong-password' }).expect(401);
    expect(wrong.body).toEqual(unknown.body);
    await api().post('/auth/login').send({ email: g.email, password: g.password }).expect(200);
  });

  it('verifies email with a single-use token', async () => {
    const g = await registerGamer();
    const token = new URL(mails.at(-1)!.text).searchParams.get('token')!;
    await api().post('/auth/verify-email').send({ token }).expect(204);
    await api().post('/auth/verify-email').send({ token }).expect(400);
    const me = await api().get('/auth/me').set(auth(g.token)).expect(200);
    expect(me.body.emailVerifiedAt).not.toBeNull();
  });

  it('resets a password and kills existing sessions', async () => {
    const g = await registerGamer();
    await api().post('/auth/password/forgot').send({ email: 'ghost@test.dev' }).expect(202); // no enumeration
    await api().post('/auth/password/forgot').send({ email: g.email }).expect(202);
    const token = new URL(mails.at(-1)!.text).searchParams.get('token')!;
    await api().post('/auth/password/reset').send({ token, newPassword: 'a-brand-new-passphrase' }).expect(204);

    await api().get('/auth/me').set(auth(g.token)).expect(401);
    await api().post('/auth/login').send({ email: g.email, password: g.password }).expect(401);
    await api().post('/auth/login').send({ email: g.email, password: 'a-brand-new-passphrase' }).expect(200);
  });
});

describe('access tokens', () => {
  it('rejects missing, malformed and tampered tokens', async () => {
    const g = await registerGamer();
    await api().get('/auth/me').expect(401);
    await api().get('/auth/me').set('authorization', 'Token abc').expect(401);
    const [h, p, s] = g.token.split('.');
    const tampered = JSON.parse(Buffer.from(p!, 'base64url').toString());
    tampered.roles = ['admin'];
    await api().get('/auth/me').set(auth(`${h}.${Buffer.from(JSON.stringify(tampered)).toString('base64url')}.${s}`)).expect(401);
  });

  it('logout-all invalidates outstanding access tokens immediately', async () => {
    const g = await registerGamer();
    await api().post('/auth/logout-all').set(auth(g.token)).expect(204);
    await api().get('/auth/me').set(auth(g.token)).expect(401);
  });
});

describe('refresh token rotation', () => {
  it('rotates via the httpOnly cookie', async () => {
    const agent = request.agent(app);
    await agent.post('/auth/register').send({ accountType: 'gamer', email: 'r@test.dev', username: 'rotator', password: 'correct-horse-battery' }).expect(201);
    const refreshed = await agent.post('/auth/refresh').expect(200);
    await api().get('/auth/me').set(auth(refreshed.body.accessToken)).expect(200);
  });

  it('revokes the whole family when a rotated token is reused', async () => {
    const g = await registerGamer();
    const first = await api().post('/auth/refresh').set('x-token-transport', 'body').send({ refreshToken: g.refreshToken }).expect(200);

    // Push the rotation outside the benign-race grace window, then replay the old token.
    await db.update(sessions).set({ rotatedAt: new Date(Date.now() - 60_000) }).where(eq(sessions.userId, g.userId));
    await api().post('/auth/refresh').send({ refreshToken: g.refreshToken }).expect(401);

    // The attacker's (or victim's) newer token is dead too, and so is its access token.
    await api().post('/auth/refresh').send({ refreshToken: first.body.refreshToken }).expect(401);
    await api().get('/auth/me').set(auth(first.body.accessToken)).expect(401);
  });

  it('logout revokes the session', async () => {
    const g = await registerGamer();
    await api().post('/auth/logout').send({ refreshToken: g.refreshToken }).expect(204);
    await api().post('/auth/refresh').send({ refreshToken: g.refreshToken }).expect(401);
    await api().get('/auth/me').set(auth(g.token)).expect(401);
  });
});

describe('Sign-In With Solana', () => {
  const signIn = async (kp: Keypair) => {
    const address = kp.publicKey.toBase58();
    const nonce = await api().post('/auth/wallet/nonce').send({ address }).expect(201);
    expect(nonce.body.message).toContain(address);
    return { address, nonce: nonce.body.nonce as string, message: nonce.body.message as string };
  };

  it('creates a gamer on first sign-in and logs into the same account after', async () => {
    const kp = Keypair.generate();
    const a = await signIn(kp);
    const first = await api().post('/auth/wallet/verify').send({ address: a.address, nonce: a.nonce, signature: signMessage(kp, a.message) }).expect(201);
    expect(first.body.isNewUser).toBe(true);

    const b = await signIn(kp);
    const second = await api().post('/auth/wallet/verify').send({ address: b.address, nonce: b.nonce, signature: signMessage(kp, b.message) }).expect(200);
    expect(second.body.isNewUser).toBe(false);

    const [m1, m2] = await Promise.all([first, second].map((r) => api().get('/auth/me').set(auth(r.body.accessToken))));
    expect(m1!.body.id).toBe(m2!.body.id);
    expect(m1!.body).toMatchObject({ roles: ['gamer'], email: null, hasPassword: false });
  });

  it('rejects replayed nonces, wrong signers and invalid addresses', async () => {
    const kp = Keypair.generate();
    const a = await signIn(kp);
    const body = { address: a.address, nonce: a.nonce, signature: signMessage(kp, a.message) };
    await api().post('/auth/wallet/verify').send(body).expect(201);
    await api().post('/auth/wallet/verify').send(body).expect(401); // replay

    const b = await signIn(kp);
    await api().post('/auth/wallet/verify').send({ ...b, message: undefined, signature: signMessage(Keypair.generate(), b.message) }).expect(401);

    await api().post('/auth/wallet/nonce').send({ address: 'not-a-solana-address' }).expect(400);
  });
});
