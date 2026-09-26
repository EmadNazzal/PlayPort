import { index, inet, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { id } from './_shared.js';
import { users } from './users.js';

/**
 * One row per refresh token. Tokens rotate on every refresh; all tokens descended from
 * one login share a `familyId`, so reuse of an already-rotated token revokes the family.
 */
export const sessions = pgTable(
  'sessions',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    familyId: uuid().notNull(),
    /** sha256 of the refresh token. The raw token is never stored. */
    tokenHash: text().notNull().unique(),
    userAgent: text(),
    ip: inet(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    /** Set when this token was exchanged for a new one. */
    rotatedAt: timestamp({ withTimezone: true }),
    revokedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('sessions_user_idx').on(t.userId), index('sessions_family_idx').on(t.familyId)],
);

export const authTokenType = pgEnum('auth_token_type', ['email_verification', 'password_reset']);

/** Single-use, short-lived tokens sent by email. */
export const authTokens = pgTable(
  'auth_tokens',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: authTokenType().notNull(),
    tokenHash: text().notNull().unique(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    usedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('auth_tokens_user_idx').on(t.userId, t.type)],
);

export const walletNoncePurpose = pgEnum('wallet_nonce_purpose', ['login', 'link']);

/** Sign-In With Solana challenges. Consumed atomically, exactly once. */
export const walletNonces = pgTable(
  'wallet_nonces',
  {
    id: id(),
    address: text().notNull(),
    nonce: text().notNull().unique(),
    /** The exact message the wallet must sign. */
    message: text().notNull(),
    purpose: walletNoncePurpose().notNull(),
    /** For `link`: the signed-in user the wallet will be attached to. */
    userId: uuid().references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    usedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('wallet_nonces_address_idx').on(t.address)],
);
