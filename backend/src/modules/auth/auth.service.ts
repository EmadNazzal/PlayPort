import { randomBytes } from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import { authTokens, gamerProfiles, userRoles, users, walletNonces, wallets } from '../../db/schema/index.js';
import { audit } from '../../shared/audit.js';
import { config } from '../../shared/config.js';
import { randomToken, sha256 } from '../../shared/crypto.js';
import { ConflictError, ForbiddenError, UnauthorizedError, ValidationError } from '../../shared/errors.js';
import type { Mailer } from '../../shared/mailer.js';
import type { RegisterInput, WalletLoginInput } from './auth.schemas.js';
import { DUMMY_HASH, hashPassword, verifyPassword } from './passwords.js';
import type { ClientInfo, IssuedTokens, SessionService } from './sessions.js';
import { buildSiwsMessage, verifySolanaSignature } from './siws.js';
import { isUniqueViolation } from '../../shared/db-errors.js';

const NONCE_TTL_MS = 5 * 60_000;
const EMAIL_VERIFICATION_TTL_MS = 24 * 3_600_000;
const PASSWORD_RESET_TTL_MS = 30 * 60_000;


export type WalletNonceRequest = { address: string; purpose: 'login' | 'link'; userId?: string };

export const createAuthService = (db: Db, sessions: SessionService, mailer: Mailer) => {
  const issueEmailToken = async (userId: string, email: string, type: 'email_verification' | 'password_reset') => {
    const token = randomToken(32);
    const ttl = type === 'email_verification' ? EMAIL_VERIFICATION_TTL_MS : PASSWORD_RESET_TTL_MS;
    await db
      .update(authTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(authTokens.userId, userId), eq(authTokens.type, type), isNull(authTokens.usedAt)));
    await db.insert(authTokens).values({ userId, type, tokenHash: sha256(token), expiresAt: new Date(Date.now() + ttl) });

    const path = type === 'email_verification' ? 'verify-email' : 'reset-password';
    await mailer.send({
      to: email,
      subject: type === 'email_verification' ? 'Verify your PlayPort email' : 'Reset your PlayPort password',
      text: `${config.APP_URL}/${path}?token=${token}`,
    });
  };

  /** Marks a single-use email token used and returns its user, or throws. */
  const consumeEmailToken = async (token: string, type: 'email_verification' | 'password_reset') => {
    const [row] = await db
      .update(authTokens)
      .set({ usedAt: new Date() })
      .where(
        and(eq(authTokens.tokenHash, sha256(token)), eq(authTokens.type, type), isNull(authTokens.usedAt), gt(authTokens.expiresAt, new Date())),
      )
      .returning({ userId: authTokens.userId });
    if (!row) throw new ValidationError('Invalid or expired token');
    return row.userId;
  };

  return {
    async register(input: RegisterInput, client: ClientInfo): Promise<IssuedTokens> {
      const passwordHash = await hashPassword(input.password);
      try {
        const { user, tokens } = await db.transaction(async (tx) => {
          const [user] = await tx
            .insert(users)
            .values({
              email: input.email,
              passwordHash,
              displayName: input.accountType === 'gamer' ? input.username : input.displayName,
              lastLoginAt: new Date(),
            })
            .returning();
          if (input.accountType === 'gamer') {
            await tx.insert(userRoles).values({ userId: user!.id, role: 'gamer' });
            await tx.insert(gamerProfiles).values({ userId: user!.id, username: input.username });
          }
          await audit(tx, { actorUserId: user!.id, action: 'auth.registered', metadata: { accountType: input.accountType }, ip: client.ip });
          return { user: user!, tokens: await sessions.start(tx, user!, client) };
        });
        await issueEmailToken(user.id, input.email, 'email_verification');
        return tokens;
      } catch (err) {
        if (isUniqueViolation(err)) throw new ConflictError('Email or username already in use');
        throw err;
      }
    },

    async login(email: string, password: string, client: ClientInfo): Promise<IssuedTokens> {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      const ok = await verifyPassword(user?.passwordHash ?? DUMMY_HASH, password);
      if (!user || !user.passwordHash || !ok || user.status === 'deleted') {
        await audit(db, { actorUserId: user?.id, action: 'auth.login_failed', metadata: { method: 'password' }, ip: client.ip });
        throw new UnauthorizedError('Invalid email or password');
      }
      if (user.status !== 'active') throw new ForbiddenError('Account is suspended');

      await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
      await audit(db, { actorUserId: user.id, action: 'auth.login', metadata: { method: 'password' }, ip: client.ip });
      return sessions.start(db, user, client);
    },

    /** Step 1 of Sign-In With Solana (and of wallet linking): a one-time message to sign. */
    async createWalletNonce({ address, purpose, userId }: WalletNonceRequest) {
      const nonce = randomBytes(16).toString('hex');
      const issuedAt = new Date();
      const expiresAt = new Date(issuedAt.getTime() + NONCE_TTL_MS);
      const message = buildSiwsMessage({
        domain: config.APP_DOMAIN,
        uri: config.APP_URL,
        address,
        statement: purpose === 'login' ? 'Sign in to PlayPort.' : 'Link this wallet to your PlayPort account.',
        nonce,
        issuedAt,
        expiresAt,
      });
      await db.insert(walletNonces).values({ address, nonce, message, purpose, userId, expiresAt });
      return { nonce, message, expiresAt };
    },

    /** Atomically consumes a nonce and verifies the wallet signed its message. Returns the nonce's userId. */
    async consumeWalletSignature(input: WalletLoginInput, purpose: 'login' | 'link'): Promise<{ userId: string | null }> {
      const [row] = await db
        .update(walletNonces)
        .set({ usedAt: new Date() })
        .where(
          and(
            eq(walletNonces.nonce, input.nonce),
            eq(walletNonces.address, input.address),
            eq(walletNonces.purpose, purpose),
            isNull(walletNonces.usedAt),
            gt(walletNonces.expiresAt, new Date()),
          ),
        )
        .returning({ message: walletNonces.message, userId: walletNonces.userId });
      if (!row) throw new UnauthorizedError('Invalid or expired nonce');
      if (!verifySolanaSignature(row.message, input.signature, input.address)) {
        throw new UnauthorizedError('Signature verification failed');
      }
      return { userId: row.userId };
    },

    /** Step 2 of Sign-In With Solana. Unknown wallets get a new gamer account. */
    async walletLogin(input: WalletLoginInput, client: ClientInfo): Promise<IssuedTokens & { isNewUser: boolean }> {
      await this.consumeWalletSignature(input, 'login');

      const [existing] = await db
        .select({ user: users })
        .from(wallets)
        .innerJoin(users, eq(users.id, wallets.userId))
        .where(and(eq(wallets.chain, 'solana'), eq(wallets.address, input.address)));

      if (existing) {
        const { user } = existing;
        if (user.status !== 'active') throw new ForbiddenError('Account is suspended');
        await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
        await audit(db, { actorUserId: user.id, action: 'auth.login', metadata: { method: 'wallet' }, ip: client.ip });
        return { ...(await sessions.start(db, user, client)), isNewUser: false };
      }

      const tokens = await db.transaction(async (tx) => {
        const username = `player_${randomBytes(6).toString('hex')}`;
        const [user] = await tx.insert(users).values({ displayName: username, lastLoginAt: new Date() }).returning();
        await tx.insert(userRoles).values({ userId: user!.id, role: 'gamer' });
        await tx.insert(gamerProfiles).values({ userId: user!.id, username });
        await tx.insert(wallets).values({ userId: user!.id, address: input.address, isPrimary: true });
        await audit(tx, { actorUserId: user!.id, action: 'auth.registered', metadata: { accountType: 'gamer', method: 'wallet' }, ip: client.ip });
        return sessions.start(tx, user!, client);
      });
      return { ...tokens, isNewUser: true };
    },

    async verifyEmail(token: string): Promise<void> {
      const userId = await consumeEmailToken(token, 'email_verification');
      await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, userId));
      await audit(db, { actorUserId: userId, action: 'auth.email_verified' });
    },

    async resendVerification(userId: string): Promise<void> {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user?.email) throw new ValidationError('No email on this account');
      if (user.emailVerifiedAt) throw new ConflictError('Email already verified');
      await issueEmailToken(user.id, user.email, 'email_verification');
    },

    /** Always succeeds, whether or not the email exists, to avoid account enumeration. */
    async requestPasswordReset(email: string): Promise<void> {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      if (user?.email && user.status === 'active') await issueEmailToken(user.id, user.email, 'password_reset');
    },

    async resetPassword(token: string, newPassword: string): Promise<void> {
      const userId = await consumeEmailToken(token, 'password_reset');
      const passwordHash = await hashPassword(newPassword);
      await db.transaction(async (tx) => {
        await tx.update(users).set({ passwordHash }).where(eq(users.id, userId));
        await sessions.revokeAllForUser(tx, userId);
        await audit(tx, { actorUserId: userId, action: 'auth.password_reset' });
      });
    },

    async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user?.passwordHash || !(await verifyPassword(user.passwordHash, currentPassword))) {
        throw new UnauthorizedError('Current password is incorrect');
      }
      const passwordHash = await hashPassword(newPassword);
      await db.transaction(async (tx) => {
        await tx.update(users).set({ passwordHash }).where(eq(users.id, userId));
        await sessions.revokeAllForUser(tx, userId);
        await audit(tx, { actorUserId: userId, action: 'auth.password_changed' });
      });
    },

    async logoutEverywhere(userId: string): Promise<void> {
      await db.transaction(async (tx) => {
        await sessions.revokeAllForUser(tx, userId);
        await audit(tx, { actorUserId: userId, action: 'auth.logout_all' });
      });
    },

    async me(userId: string) {
      const [row] = await db
        .select({
          id: users.id,
          email: users.email,
          emailVerifiedAt: users.emailVerifiedAt,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          hasPassword: users.passwordHash,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, userId));
      if (!row) throw new UnauthorizedError();
      const roles = await db.select({ role: userRoles.role }).from(userRoles).where(eq(userRoles.userId, userId));
      return { ...row, hasPassword: row.hasPassword !== null, roles: roles.map((r) => r.role) };
    },
  };
};

export type AuthService = ReturnType<typeof createAuthService>;
