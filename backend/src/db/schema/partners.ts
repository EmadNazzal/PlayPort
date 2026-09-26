import { sql } from 'drizzle-orm';
import { index, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { citext, id, timestamps } from './_shared.js';
import { users } from './users.js';

export const partnerStatus = pgEnum('partner_status', ['pending', 'approved', 'rejected', 'suspended']);

/** A studio or developer that hosts its own games outside PlayPort. */
export const partners = pgTable('partners', {
  id: id(),
  name: text().notNull(),
  slug: citext().notNull().unique(),
  legalName: text(),
  websiteUrl: text().notNull(),
  contactEmail: citext().notNull(),
  logoUrl: text(),
  description: text(),
  /** ISO 3166-1 alpha-2 country of incorporation. */
  country: text(),
  /** Solana address that receives payments for this partner's games. */
  payoutWalletAddress: text(),
  /** HTTPS endpoint PlayPort calls with purchase events. */
  webhookUrl: text(),
  status: partnerStatus().notNull().default('pending'),
  statusReason: text(),
  reviewedBy: uuid().references(() => users.id, { onDelete: 'set null' }),
  reviewedAt: timestamp({ withTimezone: true }),
  ...timestamps,
});

/** Partner-scoped roles, independent of the user's global roles. */
export const partnerMemberRole = pgEnum('partner_member_role', ['owner', 'admin', 'developer']);

export const partnerMembers = pgTable(
  'partner_members',
  {
    partnerId: uuid()
      .notNull()
      .references(() => partners.id, { onDelete: 'cascade' }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: partnerMemberRole().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.partnerId, t.userId] }), index('partner_members_user_idx').on(t.userId)],
);

/**
 * Server-to-server credentials for partner backends. Format: `pp_<prefix>_<secret>`.
 * Only the prefix (for lookup) and a sha256 of the full key are stored.
 */
export const partnerApiKeys = pgTable(
  'partner_api_keys',
  {
    id: id(),
    partnerId: uuid()
      .notNull()
      .references(() => partners.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    prefix: text().notNull().unique(),
    keyHash: text().notNull(),
    scopes: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    createdBy: uuid().references(() => users.id, { onDelete: 'set null' }),
    lastUsedAt: timestamp({ withTimezone: true }),
    expiresAt: timestamp({ withTimezone: true }),
    revokedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('partner_api_keys_partner_idx').on(t.partnerId)],
);
