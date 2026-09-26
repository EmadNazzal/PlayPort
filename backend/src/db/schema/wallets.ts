import { sql } from 'drizzle-orm';
import { boolean, index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { id } from './_shared.js';
import { users } from './users.js';

export const chain = pgEnum('chain', ['solana']);

/** Wallets proven (by signature) to belong to a user. An address belongs to one user. */
export const wallets = pgTable(
  'wallets',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    chain: chain().notNull().default('solana'),
    /** base58 public key. */
    address: text().notNull(),
    label: text(),
    isPrimary: boolean().notNull().default(false),
    verifiedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('wallets_chain_address_unique').on(t.chain, t.address),
    index('wallets_user_idx').on(t.userId),
    uniqueIndex('wallets_one_primary_per_user')
      .on(t.userId)
      .where(sql`${t.isPrimary}`),
  ],
);
