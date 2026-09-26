import { Router, type Request, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { getUser, requireUser } from '../../shared/auth/index.js';
import { config, isProduction } from '../../shared/config.js';
import { UnauthorizedError } from '../../shared/errors.js';
import { handler } from '../../shared/http.js';
import {
  ChangePasswordSchema,
  EmailOnlySchema,
  LoginSchema,
  RefreshSchema,
  RegisterSchema,
  ResetPasswordSchema,
  TokenSchema,
  WalletLoginSchema,
  WalletNonceSchema,
} from './auth.schemas.js';
import type { AuthService } from './auth.service.js';
import type { ClientInfo, IssuedTokens, SessionService } from './sessions.js';

const REFRESH_COOKIE = 'pp_refresh';

const clientInfo = (req: Request): ClientInfo => ({ userAgent: req.get('user-agent'), ip: req.ip });

/**
 * Browsers get the refresh token as an httpOnly cookie scoped to the auth routes, so page JS (and XSS)
 * can never read it. Native clients opt into receiving it in the body with `X-Token-Transport: body`.
 */
const sendTokens = (req: Request, res: Response, tokens: IssuedTokens, status = 200, extra: object = {}) => {
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: config.REFRESH_COOKIE_PATH,
    expires: tokens.refreshTokenExpiresAt,
  });
  const wantsBody = req.get('x-token-transport') === 'body';
  res.status(status).json({
    accessToken: tokens.accessToken,
    tokenType: 'Bearer',
    expiresIn: tokens.accessTokenExpiresIn,
    ...(wantsBody && { refreshToken: tokens.refreshToken }),
    ...extra,
  });
};

const readRefreshToken = (req: Request, body: { refreshToken?: string | undefined }): string => {
  const token = (req.cookies as Record<string, string | undefined>)[REFRESH_COOKIE] ?? body.refreshToken;
  if (!token) throw new UnauthorizedError('Missing refresh token');
  return token;
};

export const createAuthRouter = (auth: AuthService, sessions: SessionService): Router => {
  const router = Router();

  // Credential endpoints: strict per-IP limit against brute force and nonce spam.
  // In-memory store is per instance; use a Redis store when running more than one.
  const strict = rateLimit({
    windowMs: 15 * 60_000,
    limit: config.NODE_ENV === 'test' ? 10_000 : 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts, try again later' } },
  });

  router.post('/register', strict, handler({ body: RegisterSchema }, async ({ body }, req, res) => {
    sendTokens(req, res, await auth.register(body, clientInfo(req)), 201);
  }));

  router.post('/login', strict, handler({ body: LoginSchema }, async ({ body }, req, res) => {
    sendTokens(req, res, await auth.login(body.email, body.password, clientInfo(req)));
  }));

  router.post('/wallet/nonce', strict, handler({ body: WalletNonceSchema }, async ({ body }, _req, res) => {
    res.status(201).json(await auth.createWalletNonce({ address: body.address, purpose: 'login' }));
  }));

  router.post('/wallet/verify', strict, handler({ body: WalletLoginSchema }, async ({ body }, req, res) => {
    const { isNewUser, ...tokens } = await auth.walletLogin(body, clientInfo(req));
    sendTokens(req, res, tokens, isNewUser ? 201 : 200, { isNewUser });
  }));

  router.post('/refresh', handler({ body: RefreshSchema }, async ({ body }, req, res) => {
    sendTokens(req, res, await sessions.refresh(readRefreshToken(req, body), clientInfo(req)));
  }));

  router.post('/logout', handler({ body: RefreshSchema }, async ({ body }, req, res) => {
    const token = (req.cookies as Record<string, string | undefined>)[REFRESH_COOKIE] ?? body.refreshToken;
    if (token) await sessions.revoke(token);
    res.clearCookie(REFRESH_COOKIE, { path: config.REFRESH_COOKIE_PATH });
    res.status(204).end();
  }));

  router.post('/logout-all', requireUser, handler({}, async (_input, req, res) => {
    await auth.logoutEverywhere(getUser(req).userId);
    res.clearCookie(REFRESH_COOKIE, { path: config.REFRESH_COOKIE_PATH });
    res.status(204).end();
  }));

  router.post('/verify-email', strict, handler({ body: TokenSchema }, async ({ body }, _req, res) => {
    await auth.verifyEmail(body.token);
    res.status(204).end();
  }));

  router.post('/verify-email/resend', strict, requireUser, handler({}, async (_input, req, res) => {
    await auth.resendVerification(getUser(req).userId);
    res.status(202).end();
  }));

  router.post('/password/forgot', strict, handler({ body: EmailOnlySchema }, async ({ body }, _req, res) => {
    await auth.requestPasswordReset(body.email);
    res.status(202).json({ message: 'If that email is registered, a reset link is on its way.' });
  }));

  router.post('/password/reset', strict, handler({ body: ResetPasswordSchema }, async ({ body }, _req, res) => {
    await auth.resetPassword(body.token, body.newPassword);
    res.status(204).end();
  }));

  router.post('/password/change', strict, requireUser, handler({ body: ChangePasswordSchema }, async ({ body }, req, res) => {
    await auth.changePassword(getUser(req).userId, body.currentPassword, body.newPassword);
    res.clearCookie(REFRESH_COOKIE, { path: config.REFRESH_COOKIE_PATH });
    res.status(204).end();
  }));

  router.get('/me', requireUser, handler({}, async (_input, req, res) => {
    res.json(await auth.me(getUser(req).userId));
  }));

  return router;
};
