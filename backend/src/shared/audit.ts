import type { DbOrTx } from '../db/client.js';
import { auditLogs } from '../db/schema/index.js';
import { logger } from './logger.js';

export type AuditEntry = {
  actorUserId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
};

/** Pass a transaction handle to make the audit row commit/roll back with the change. */
export const audit = async (db: DbOrTx, entry: AuditEntry): Promise<void> => {
  try {
    await db.insert(auditLogs).values(entry);
  } catch (err) {
    logger.error({ err, action: entry.action }, 'Failed to write audit log');
  }
};
