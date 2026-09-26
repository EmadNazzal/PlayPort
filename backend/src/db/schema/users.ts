import { sql } from 'drizzle-orm';
import { date, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { citext, id, timestamps } from './_shared.js';

export const userStatus = pgEnum('user_status', ['active', 'suspended', 'deleted']);

/**
 * Global roles. A user can hold several (e.g. a gamer who is also a partner member).
 * Partner-scoped permissions (owner/admin/developer) live in `partner_members`.
 */
export const roleName = pgEnum('role_name', ['admin', 'gamer', 'partner']);

export const users = pgTable(
  'users',
  {
    id: id(),
    /** Optional: wallet-only gamers may never set an email. */
    email: citext(),
    emailVerifiedAt: timestamp({ withTimezone: true }),
    /** argon2id hash. Null for wallet-only accounts. */
    passwordHash: text(),
    displayName: text(),
    avatarUrl: text(),
    status: userStatus().notNull().default('active'),
    /**
     * Bumped on password change, suspension or "log out everywhere".
     * Embedded in access tokens so they die with the sessions they came from.
     */
    tokenVersion: uuid().notNull().defaultRandom(),
    lastLoginAt: timestamp({ withTimezone: true }),
    deletedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex('users_email_unique').on(t.email).where(sql`${t.email} is not null`)],
);

export const userRoles = pgTable(
  'user_roles',
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: roleName().notNull(),
    grantedBy: uuid().references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.role] })],
);

export const gamerProfiles = pgTable('gamer_profiles', {
  userId: uuid()
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  username: citext().notNull().unique(),
  bio: text(),
  /** ISO 3166-1 alpha-2, for regional pricing and compliance. */
  country: text(),
  /** For age-rated games. */
  dateOfBirth: date({ mode: 'string' }),
  ...timestamps,
});
