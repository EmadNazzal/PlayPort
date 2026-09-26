import { and, eq } from 'drizzle-orm';
import type { DbOrTx } from '../../db/client.js';
import { partnerMembers } from '../../db/schema/index.js';
import { isAdmin, type Principal } from '../../shared/auth/index.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors.js';

export type PartnerMemberRole = 'owner' | 'admin' | 'developer';

const RANK: Record<PartnerMemberRole, number> = { developer: 1, admin: 2, owner: 3 };

/**
 * Resource-scoped authorization for anything owned by a partner.
 * - Platform admins pass.
 * - API keys pass only for their own partner (their scopes are checked by route guards).
 * - Users must be a member with at least `minRole`.
 * Non-members get 404, not 403, so partner IDs can't be probed.
 */
export const assertPartnerAccess = async (
  db: DbOrTx,
  principal: Principal,
  partnerId: string,
  minRole: PartnerMemberRole = 'developer',
): Promise<void> => {
  if (isAdmin(principal)) return;
  if (principal.kind === 'api_key') {
    if (principal.partnerId !== partnerId) throw new NotFoundError('Partner not found');
    return;
  }
  const [member] = await db
    .select({ role: partnerMembers.role })
    .from(partnerMembers)
    .where(and(eq(partnerMembers.partnerId, partnerId), eq(partnerMembers.userId, principal.userId)));
  if (!member) throw new NotFoundError('Partner not found');
  if (RANK[member.role] < RANK[minRole]) throw new ForbiddenError(`Requires the partner ${minRole} role`);
};
