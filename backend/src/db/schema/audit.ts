import { index, inet, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { id } from './_shared.js';
import { users } from './users.js';

/** Append-only record of security-relevant and admin actions. */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: id(),
    actorUserId: uuid().references(() => users.id, { onDelete: 'set null' }),
    /** e.g. `auth.login`, `partner.approved`, `user.suspended`. */
    action: text().notNull(),
    targetType: text(),
    targetId: text(),
    metadata: jsonb().$type<Record<string, unknown>>(),
    ip: inet(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('audit_logs_actor_idx').on(t.actorUserId),
    index('audit_logs_target_idx').on(t.targetType, t.targetId),
  ],
);
