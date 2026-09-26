import { and, asc, count, eq, ne } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import { users, wallets } from '../../db/schema/index.js';
import { audit } from '../../shared/audit.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors.js';
import type { AuthService } from '../auth/index.js';
import { isUniqueViolation } from '../../shared/db-errors.js';


export const createWalletService = (db: Db, auth: AuthService) => {
  const getOwned = async (userId: string, walletId: string) => {
    const [wallet] = await db.select().from(wallets).where(and(eq(wallets.id, walletId), eq(wallets.userId, userId)));
    if (!wallet) throw new NotFoundError('Wallet not found');
    return wallet;
  };

  return {
    list: (userId: string) =>
      db.select().from(wallets).where(eq(wallets.userId, userId)).orderBy(asc(wallets.createdAt)),

    /** The linked wallet addresses of a user, for payment verification. */
    async addressesOf(userId: string): Promise<string[]> {
      return (await db.select({ address: wallets.address }).from(wallets).where(eq(wallets.userId, userId))).map((w) => w.address);
    },

    requestLinkNonce: (userId: string, address: string) =>
      auth.createWalletNonce({ address, purpose: 'link', userId }),

    async link(userId: string, input: { address: string; nonce: string; signature: string; label?: string | undefined }) {
      const { userId: nonceUserId } = await auth.consumeWalletSignature(input, 'link');
      if (nonceUserId !== userId) throw new ForbiddenError('This nonce was issued to another account');

      try {
        return await db.transaction(async (tx) => {
          const [{ total } = { total: 0 }] = await tx.select({ total: count() }).from(wallets).where(eq(wallets.userId, userId));
          const [wallet] = await tx
            .insert(wallets)
            .values({ userId, address: input.address, label: input.label, isPrimary: total === 0 })
            .returning();
          await audit(tx, { actorUserId: userId, action: 'wallet.linked', targetType: 'wallet', targetId: wallet!.id, metadata: { address: input.address } });
          return wallet!;
        });
      } catch (err) {
        if (isUniqueViolation(err)) throw new ConflictError('This wallet is already linked to an account');
        throw err;
      }
    },

    async update(userId: string, walletId: string, input: { label?: string | null | undefined; isPrimary?: true | undefined }) {
      await getOwned(userId, walletId);
      return db.transaction(async (tx) => {
        if (input.isPrimary) {
          await tx.update(wallets).set({ isPrimary: false }).where(and(eq(wallets.userId, userId), ne(wallets.id, walletId)));
        }
        const [wallet] = await tx
          .update(wallets)
          .set({ ...(input.label !== undefined && { label: input.label }), ...(input.isPrimary && { isPrimary: true }) })
          .where(eq(wallets.id, walletId))
          .returning();
        return wallet!;
      });
    },

    async unlink(userId: string, walletId: string): Promise<void> {
      const wallet = await getOwned(userId, walletId);
      const [user] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, userId));
      const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(wallets).where(eq(wallets.userId, userId));
      if (!user?.passwordHash && total <= 1) {
        throw new ForbiddenError('This is your only way to sign in. Set a password or link another wallet first.');
      }
      await db.transaction(async (tx) => {
        await tx.delete(wallets).where(eq(wallets.id, walletId));
        if (wallet.isPrimary) {
          const [next] = await tx.select({ id: wallets.id }).from(wallets).where(eq(wallets.userId, userId)).orderBy(asc(wallets.createdAt)).limit(1);
          if (next) await tx.update(wallets).set({ isPrimary: true }).where(eq(wallets.id, next.id));
        }
        await audit(tx, { actorUserId: userId, action: 'wallet.unlinked', targetType: 'wallet', targetId: walletId, metadata: { address: wallet.address } });
      });
    },
  };
};

export type WalletService = ReturnType<typeof createWalletService>;
