import { and, eq, isNull } from 'drizzle-orm';
import type { RequestHandler } from 'express';
import type { Db } from '../../db/client.js';
import { partnerApiKeys, partners, sessions, userRoles, users } from '../../db/schema/index.js';
import { safeEqual, sha256 } from '../crypto.js';
import { ForbiddenError, UnauthorizedError } from '../errors.js';
import { permissionsForRoles, type ApiKeyScope, type Permission, type Role } from './permissions.js';
import type { ApiKeyPrincipal, Principal, UserPrincipal } from './principal.js';
import { verifyAccessToken } from './tokens.js';

const API_KEY_PATTERN = /^pp_([a-zA-Z0-9]{12})_([a-zA-Z0-9_-]{32,})$/;

/**
 * Resolves the caller from `Authorization: Bearer <jwt>` or `X-API-Key: pp_...`.
 * Never rejects on its own — guards below decide. An invalid credential is treated
 * as an error (401) rather than silently as anonymous, so clients notice.
 *
 * Every authenticated request re-checks the user's status, token version, session and
 * roles in one query, so suspension, "log out everywhere" and role changes take effect
 * immediately rather than when the access token expires.
 */
export const createAuthenticate = (db: Db): RequestHandler => {
  const resolveUser = async (token: string): Promise<UserPrincipal | null> => {
    const claims = await verifyAccessToken(token);
    if (!claims) return null;

    const rows = await db
      .select({ status: users.status, tokenVersion: users.tokenVersion, role: userRoles.role, sessionRevokedAt: sessions.revokedAt, sessionExpiresAt: sessions.expiresAt })
      .from(users)
      .innerJoin(sessions, and(eq(sessions.id, claims.sid), eq(sessions.userId, users.id)))
      .leftJoin(userRoles, eq(userRoles.userId, users.id))
      .where(eq(users.id, claims.sub));

    const user = rows[0];
    if (!user || user.status !== 'active' || user.tokenVersion !== claims.ver) return null;
    if (user.sessionRevokedAt || user.sessionExpiresAt < new Date()) return null;

    const roles = rows.map((r) => r.role).filter((r): r is Role => r !== null);
    return { kind: 'user', userId: claims.sub, sessionId: claims.sid, roles, permissions: permissionsForRoles(roles) };
  };

  const resolveApiKey = async (key: string): Promise<ApiKeyPrincipal | null> => {
    const match = API_KEY_PATTERN.exec(key);
    if (!match?.[1]) return null;

    const [row] = await db
      .select({ key: partnerApiKeys, partnerStatus: partners.status })
      .from(partnerApiKeys)
      .innerJoin(partners, eq(partners.id, partnerApiKeys.partnerId))
      .where(and(eq(partnerApiKeys.prefix, match[1]), isNull(partnerApiKeys.revokedAt)));

    if (!row || !safeEqual(row.key.keyHash, sha256(key))) return null;
    if (row.partnerStatus !== 'approved') return null;
    if (row.key.expiresAt && row.key.expiresAt < new Date()) return null;

    void db.update(partnerApiKeys).set({ lastUsedAt: new Date() }).where(eq(partnerApiKeys.id, row.key.id)).catch(() => {});

    return {
      kind: 'api_key',
      partnerId: row.key.partnerId,
      keyId: row.key.id,
      permissions: new Set(row.key.scopes as ApiKeyScope[]),
    };
  };

  return (req, _res, next) => {
    const header = req.headers.authorization;
    const apiKey = req.headers['x-api-key'];

    const resolve = async (): Promise<Principal | undefined> => {
      if (header) {
        const [scheme, token] = header.split(' ');
        if (scheme !== 'Bearer' || !token) throw new UnauthorizedError('Malformed Authorization header');
        const principal = await resolveUser(token);
        if (!principal) throw new UnauthorizedError('Invalid or expired access token');
        return principal;
      }
      if (typeof apiKey === 'string') {
        const principal = await resolveApiKey(apiKey);
        if (!principal) throw new UnauthorizedError('Invalid API key');
        return principal;
      }
      return undefined;
    };

    resolve()
      .then((principal) => {
        req.principal = principal;
        next();
      })
      .catch(next);
  };
};

/** Any authenticated caller (user or API key). */
export const requireAuth: RequestHandler = (req, _res, next) => {
  next(req.principal ? undefined : new UnauthorizedError());
};

/** A signed-in user (not an API key). */
export const requireUser: RequestHandler = (req, _res, next) => {
  if (!req.principal) return next(new UnauthorizedError());
  next(req.principal.kind === 'user' ? undefined : new ForbiddenError('This endpoint requires a user session'));
};

/** Caller must hold every listed permission. */
export const requirePermission =
  (...required: Permission[]): RequestHandler =>
  (req, _res, next) => {
    const principal = req.principal;
    if (!principal) return next(new UnauthorizedError());
    const missing = required.filter((p) => !principal.permissions.has(p));
    next(missing.length ? new ForbiddenError() : undefined);
  };

/** Narrowing helpers for handlers that sit behind the guards above. */
export const getPrincipal = (req: { principal?: Principal }): Principal => {
  if (!req.principal) throw new UnauthorizedError();
  return req.principal;
};

export const getUser = (req: { principal?: Principal }): UserPrincipal => {
  const principal = getPrincipal(req);
  if (principal.kind !== 'user') throw new ForbiddenError('This endpoint requires a user session');
  return principal;
};
