import { sql } from 'drizzle-orm';
import { check, index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { id, lamports, timestamps } from './_shared.js';
import { games } from './games.js';
import { partners } from './partners.js';
import { users } from './users.js';

export const paymentStatus = pgEnum('payment_status', ['pending', 'confirmed', 'failed', 'expired']);

/**
 * A purchase intent paid with SOL. The server fixes amount, recipient and a unique
 * `reference` public key (Solana Pay style); the client's transaction must include the
 * reference, so one on-chain transfer can only ever settle one payment.
 */
export const payments = pgTable(
  'payments',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    gameId: uuid()
      .notNull()
      .references(() => games.id, { onDelete: 'restrict' }),
    partnerId: uuid()
      .notNull()
      .references(() => partners.id, { onDelete: 'restrict' }),
    amountLamports: lamports().notNull(),
    recipientAddress: text().notNull(),
    reference: text().notNull().unique(),
    /** Set once verified; unique so a transaction can't be replayed against another payment. */
    txSignature: text().unique(),
    payerAddress: text(),
    status: paymentStatus().notNull().default('pending'),
    failureReason: text(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    confirmedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index('payments_user_idx').on(t.userId),
    index('payments_partner_idx').on(t.partnerId),
    check('payments_amount_positive', sql`${t.amountLamports} > 0`),
  ],
);
