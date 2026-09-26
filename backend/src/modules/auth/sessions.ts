import { randomUUID } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import type { Db, DbOrTx } from '../../db/client.js';
import { sessions, userRoles, users } from '../../db/schema/index.js';
import { signAccessToken, type Role } from '../../shared/auth/index.js';
import { config } from '../../shared/config.js';
import { randomToken, sha256 } from '../../shared/crypto.js';
import { ForbiddenError, UnauthorizedError } from '../../shared/errors.js';

/** A rotated token presented again within this window is treated as a benign race (two tabs), not theft. */
const REUSE_GRACE_MS = 10_000;

export type ClientInfo = { userAgent?: string | undefined; ip?: string | undefined };

export type IssuedTokens = {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
};

const loadRoles = async (db: DbOrTx, userId: string): Promise<Role[]> =>
  (await db.select({ role: userRoles.role }).from(userRoles).where(eq(userRoles.userId, userId))).map((r) => r.role);

const issue = async (
  db: DbOrTx,
  user: { id: string; tokenVersion: string },
  familyId: string,
  client: ClientInfo,
): Promise<IssuedTokens> => {
  const refreshToken = randomToken(32);
  const refreshTokenExpiresAt = new Date(Date.now() + config.REFRESH_TOKEN_TTL_DAYS * 86_400_000);
  const [session] = await db
    .insert(sessions)
    .values({
      userId: user.id,
      familyId,
      tokenHash: sha256(refreshToken),
      userAgent: client.userAgent?.slice(0, 512),
      ip: client.ip,
      expiresAt: refreshTokenExpiresAt,
    })
    .returning({ id: sessions.id });

  const accessToken = await signAccessToken({
    sub: user.id,
    sid: session!.id,
    ver: user.tokenVersion,
    roles: await loadRoles(db, user.id),
  });
  return { accessToken, accessTokenExpiresIn: config.ACCESS_TOKEN_TTL_SECONDS, refreshToken, refreshTokenExpiresAt };
};

export const createSessionService = (db: Db) => ({
  /** Starts a new session family (a fresh login). */
  start: (tx: DbOrTx, user: { id: string; tokenVersion: string }, client: ClientInfo) =>
    issue(tx, user, randomUUID(), client),

  /**
   * Exchanges a refresh token for a new pair. Each token works once; presenting an
   * already-rotated token outside the grace window revokes the whole family, since it
   * means the token was stolen and someone else has already used it (or will).
   */
  async refresh(refreshToken: string, client: ClientInfo): Promise<IssuedTokens> {
    const result = await db.transaction(async (tx) => {
      const [session] = await tx.select().from(sessions).where(eq(sessions.tokenHash, sha256(refreshToken))).for('update');
      if (!session || session.revokedAt || session.expiresAt < new Date()) return { kind: 'invalid' } as const;
      if (session.rotatedAt) {
        const reused = Date.now() - session.rotatedAt.getTime() > REUSE_GRACE_MS;
        return reused ? ({ kind: 'reused', familyId: session.familyId } as const) : ({ kind: 'invalid' } as const);
      }

      const [user] = await tx
        .select({ id: users.id, status: users.status, tokenVersion: users.tokenVersion })
        .from(users)
        .where(eq(users.id, session.userId));
      if (!user || user.status !== 'active') return { kind: 'inactive' } as const;

      await tx.update(sessions).set({ rotatedAt: new Date() }).where(eq(sessions.id, session.id));
      return { kind: 'ok', tokens: await issue(tx, user, session.familyId, client) } as const;
    });

    switch (result.kind) {
      case 'ok':
        return result.tokens;
      case 'reused':
        // Committed outside the transaction above so the revocation survives the 401.
        await db
          .update(sessions)
          .set({ revokedAt: new Date() })
          .where(and(eq(sessions.familyId, result.familyId), isNull(sessions.revokedAt)));
        throw new UnauthorizedError('Invalid refresh token');
      case 'inactive':
        throw new ForbiddenError('Account is not active');
      case 'invalid':
        throw new UnauthorizedError('Invalid refresh token');
    }
  },

  /** Revokes the family of the given refresh token (this device). Idempotent. */
  async revoke(refreshToken: string): Promise<void> {
    const [session] = await db.select({ familyId: sessions.familyId }).from(sessions).where(eq(sessions.tokenHash, sha256(refreshToken)));
    if (!session) return;
    await db.update(sessions).set({ revokedAt: new Date() }).where(and(eq(sessions.familyId, session.familyId), isNull(sessions.revokedAt)));
  },

  /** Logs the user out everywhere: revokes all sessions and invalidates outstanding access tokens. */
  async revokeAllForUser(tx: DbOrTx, userId: string): Promise<void> {
    await tx.update(sessions).set({ revokedAt: new Date() }).where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
    await tx.update(users).set({ tokenVersion: randomUUID() }).where(eq(users.id, userId));
  },
});

export type SessionService = ReturnType<typeof createSessionService>;
