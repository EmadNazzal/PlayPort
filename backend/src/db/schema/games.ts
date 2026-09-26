import { sql } from 'drizzle-orm';
import { check, index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { citext, id, lamports, timestamps } from './_shared.js';
import { partners } from './partners.js';
import { users } from './users.js';

/** draft → pending_review → published | rejected; published → archived. */
export const gameStatus = pgEnum('game_status', ['draft', 'pending_review', 'published', 'rejected', 'archived']);

/** A game hosted by a partner. PlayPort stores the listing and how to launch it, never the game. */
export const games = pgTable(
  'games',
  {
    id: id(),
    partnerId: uuid()
      .notNull()
      .references(() => partners.id, { onDelete: 'restrict' }),
    title: text().notNull(),
    slug: citext().notNull().unique(),
    shortDescription: text(),
    description: text(),
    genres: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    platforms: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    thumbnailUrl: text(),
    bannerUrl: text(),
    /** External HTTPS URL where the partner hosts the game. */
    launchUrl: text().notNull(),
    /** 0 = free. */
    priceLamports: lamports().notNull().default(sql`0`),
    /** Minimum player age; null = unrated. */
    minAge: integer(),
    status: gameStatus().notNull().default('draft'),
    statusReason: text(),
    reviewedBy: uuid().references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp({ withTimezone: true }),
    publishedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index('games_partner_idx').on(t.partnerId),
    index('games_status_idx').on(t.status),
    check('games_price_non_negative', sql`${t.priceLamports} >= 0`),
  ],
);

/** What a gamer owns. Created when a payment is confirmed (or on claiming a free game). */
export const gameEntitlements = pgTable(
  'game_entitlements',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    gameId: uuid()
      .notNull()
      .references(() => games.id, { onDelete: 'restrict' }),
    paymentId: uuid(),
    revokedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('game_entitlements_active_unique')
      .on(t.userId, t.gameId)
      .where(sql`${t.revokedAt} is null`),
  ],
);
