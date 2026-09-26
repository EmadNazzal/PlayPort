import { Keypair } from '@solana/web3.js';
import { and, desc, eq } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import { gameEntitlements, payments } from '../../db/schema/index.js';
import { audit } from '../../shared/audit.js';
import type { Principal } from '../../shared/auth/index.js';
import { config } from '../../shared/config.js';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors.js';
import type { GameService } from '../games/index.js';
import { assertPartnerAccess } from '../partner/index.js';
import type { WalletService } from '../wallets/index.js';
import type { SolanaGateway } from './solana.js';
import { isUniqueViolation } from '../../shared/db-errors.js';

const LAMPORTS_PER_SOL = 1_000_000_000n;

/** Exact decimal SOL string from lamports, without floating point. */
export const lamportsToSol = (lamports: bigint): string => {
  const whole = lamports / LAMPORTS_PER_SOL;
  const frac = (lamports % LAMPORTS_PER_SOL).toString().padStart(9, '0').replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole.toString();
};


export const createPaymentService = (db: Db, deps: { games: GameService; wallets: WalletService; solana: SolanaGateway }) => {
  const getOwn = async (userId: string, paymentId: string) => {
    const [payment] = await db.select().from(payments).where(and(eq(payments.id, paymentId), eq(payments.userId, userId)));
    if (!payment) throw new NotFoundError('Payment not found');
    return payment;
  };

  /**
   * Rejects a submitted signature without failing the intent: a gamer who pastes the wrong
   * signature must still be able to confirm with the right one, or they'd pay and get nothing.
   */
  const reject = (reason: string): never => {
    throw new ValidationError(reason);
  };

  return {
    /**
     * Creates a purchase intent. Amount, recipient and reference are fixed by the server;
     * the client builds a transfer (e.g. from the Solana Pay URL) that includes the reference.
     */
    async create(userId: string, gameId: string) {
      const { game, partner } = await deps.games.getListed(gameId);
      if (game.priceLamports === 0n) throw new ValidationError('This game is free — claim it instead');
      if (!partner.payoutWalletAddress) throw new ValidationError('This partner cannot receive payments yet');
      if (await deps.games.owns(userId, gameId)) throw new ConflictError('You already own this game');
      if ((await deps.wallets.addressesOf(userId)).length === 0) throw new ValidationError('Link a Solana wallet first');

      const reference = Keypair.generate().publicKey.toBase58();
      const [payment] = await db
        .insert(payments)
        .values({
          userId,
          gameId,
          partnerId: partner.id,
          amountLamports: game.priceLamports,
          recipientAddress: partner.payoutWalletAddress,
          reference,
          expiresAt: new Date(Date.now() + config.PAYMENT_TTL_MINUTES * 60_000),
        })
        .returning();

      const url = new URL(`solana:${payment!.recipientAddress}`);
      url.searchParams.set('amount', lamportsToSol(payment!.amountLamports));
      url.searchParams.set('reference', reference);
      url.searchParams.set('label', 'PlayPort');
      url.searchParams.set('message', game.title);

      return { ...payment!, solanaPayUrl: url.toString() };
    },

    /**
     * Verifies the transaction on-chain and, if it pays this intent, confirms it and grants
     * the game. Checks: confirmed and successful; includes this payment's reference; contains
     * a transfer from one of the buyer's linked wallets to the recipient of at least the amount;
     * landed before the intent expired. The unique tx_signature column stops replay.
     */
    async confirm(userId: string, paymentId: string, signature: string) {
      const payment = await getOwn(userId, paymentId);
      if (payment.status === 'confirmed') return payment;
      if (payment.status !== 'pending') throw new ValidationError(`Payment is ${payment.status}`);

      const tx = await deps.solana.getTransaction(signature);
      if (!tx) throw new ValidationError('Transaction not found or not yet confirmed; retry shortly');
      if (tx.err) return reject('Transaction failed on-chain');
      if (!tx.accountKeys.includes(payment.reference)) return reject('Transaction does not reference this payment');
      if (tx.blockTime && tx.blockTime > payment.expiresAt) return reject('Payment was sent after the intent expired');

      const payers = new Set(await deps.wallets.addressesOf(userId));
      const transfer = tx.transfers.find(
        (t) => t.destination === payment.recipientAddress && payers.has(t.source) && t.lamports >= payment.amountLamports,
      );
      if (!transfer) return reject('No matching transfer from your linked wallets');

      try {
        return await db.transaction(async (trx) => {
          const [confirmed] = await trx
            .update(payments)
            .set({ status: 'confirmed', txSignature: signature, payerAddress: transfer.source, confirmedAt: new Date() })
            .where(and(eq(payments.id, payment.id), eq(payments.status, 'pending')))
            .returning();
          if (!confirmed) throw new ConflictError('Payment was already processed');
          await trx.insert(gameEntitlements).values({ userId, gameId: payment.gameId, paymentId: payment.id }).onConflictDoNothing();
          await audit(trx, { actorUserId: userId, action: 'payment.confirmed', targetType: 'payment', targetId: payment.id, metadata: { signature, lamports: payment.amountLamports.toString() } });
          return confirmed;
        });
      } catch (err) {
        if (isUniqueViolation(err)) throw new ConflictError('This transaction has already been used for another payment');
        throw err;
      }
    },

    listMine: (userId: string) => db.select().from(payments).where(eq(payments.userId, userId)).orderBy(desc(payments.createdAt)),

    async listForPartner(principal: Principal, partnerId: string) {
      await assertPartnerAccess(db, principal, partnerId, 'admin');
      return db
        .select({
          id: payments.id,
          gameId: payments.gameId,
          amountLamports: payments.amountLamports,
          status: payments.status,
          txSignature: payments.txSignature,
          confirmedAt: payments.confirmedAt,
          createdAt: payments.createdAt,
        })
        .from(payments)
        .where(eq(payments.partnerId, partnerId))
        .orderBy(desc(payments.createdAt));
    },
  };
};

export type PaymentService = ReturnType<typeof createPaymentService>;
