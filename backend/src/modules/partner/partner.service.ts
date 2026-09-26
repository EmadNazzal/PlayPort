import { randomBytes } from 'node:crypto';
import { and, asc, count, desc, eq, isNull } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import { partnerApiKeys, partnerMembers, partners, userRoles, users } from '../../db/schema/index.js';
import { audit } from '../../shared/audit.js';
import type { ApiKeyScope, Principal, UserPrincipal } from '../../shared/auth/index.js';
import { randomToken, sha256 } from '../../shared/crypto.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../shared/errors.js';
import { assertPartnerAccess, type PartnerMemberRole } from './partner.policy.js';
import { isUniqueViolation } from '../../shared/db-errors.js';

export type PartnerInput = {
  name: string;
  slug: string;
  websiteUrl: string;
  contactEmail: string;
  legalName?: string | null | undefined;
  logoUrl?: string | null | undefined;
  description?: string | null | undefined;
  country?: string | null | undefined;
  payoutWalletAddress?: string | null | undefined;
  webhookUrl?: string | null | undefined;
};

export type PartnerReviewDecision = 'approve' | 'reject' | 'suspend';


const ALPHANUMERIC = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const keyPrefix = (): string => Array.from(randomBytes(12), (b) => ALPHANUMERIC[b % ALPHANUMERIC.length]).join('');

export const createPartnerService = (db: Db) => {
  const getById = async (id: string) => {
    const [partner] = await db.select().from(partners).where(eq(partners.id, id));
    if (!partner) throw new NotFoundError('Partner not found');
    return partner;
  };

  return {
    getById,

    /** Any signed-in user can apply; they become the owner and gain the `partner` role. */
    async apply(principal: UserPrincipal, input: PartnerInput) {
      try {
        return await db.transaction(async (tx) => {
          const [partner] = await tx.insert(partners).values(input).returning();
          await tx.insert(partnerMembers).values({ partnerId: partner!.id, userId: principal.userId, role: 'owner' });
          await tx.insert(userRoles).values({ userId: principal.userId, role: 'partner' }).onConflictDoNothing();
          await audit(tx, { actorUserId: principal.userId, action: 'partner.applied', targetType: 'partner', targetId: partner!.id });
          return partner!;
        });
      } catch (err) {
        if (isUniqueViolation(err)) throw new ConflictError('That partner slug is taken');
        throw err;
      }
    },

    listMine: (userId: string) =>
      db
        .select({ partner: partners, role: partnerMembers.role })
        .from(partnerMembers)
        .innerJoin(partners, eq(partners.id, partnerMembers.partnerId))
        .where(eq(partnerMembers.userId, userId))
        .orderBy(asc(partners.name)),

    async get(principal: Principal, partnerId: string) {
      await assertPartnerAccess(db, principal, partnerId);
      return getById(partnerId);
    },

    async update(principal: UserPrincipal, partnerId: string, input: Partial<PartnerInput>) {
      await assertPartnerAccess(db, principal, partnerId, 'admin');
      try {
        const [partner] = await db.update(partners).set(input).where(eq(partners.id, partnerId)).returning();
        await audit(db, {
          actorUserId: principal.userId,
          action: 'partner.updated',
          targetType: 'partner',
          targetId: partnerId,
          // Payout address changes redirect money; always keep them in the audit trail.
          metadata: { fields: Object.keys(input), payoutWalletAddress: input.payoutWalletAddress },
        });
        return partner!;
      } catch (err) {
        if (isUniqueViolation(err)) throw new ConflictError('That partner slug is taken');
        throw err;
      }
    },

    async listMembers(principal: Principal, partnerId: string) {
      await assertPartnerAccess(db, principal, partnerId);
      return db
        .select({ userId: users.id, email: users.email, displayName: users.displayName, role: partnerMembers.role, addedAt: partnerMembers.createdAt })
        .from(partnerMembers)
        .innerJoin(users, eq(users.id, partnerMembers.userId))
        .where(eq(partnerMembers.partnerId, partnerId))
        .orderBy(asc(partnerMembers.createdAt));
    },

    async addMember(principal: UserPrincipal, partnerId: string, email: string, role: PartnerMemberRole) {
      await assertPartnerAccess(db, principal, partnerId, role === 'owner' ? 'owner' : 'admin');
      const [user] = await db.select({ id: users.id }).from(users).where(and(eq(users.email, email), eq(users.status, 'active')));
      if (!user) throw new NotFoundError('No active PlayPort account with that email; ask them to sign up first');
      try {
        await db.transaction(async (tx) => {
          await tx.insert(partnerMembers).values({ partnerId, userId: user.id, role });
          await tx.insert(userRoles).values({ userId: user.id, role: 'partner' }).onConflictDoNothing();
          await audit(tx, { actorUserId: principal.userId, action: 'partner.member_added', targetType: 'partner', targetId: partnerId, metadata: { userId: user.id, role } });
        });
      } catch (err) {
        if (isUniqueViolation(err)) throw new ConflictError('Already a member');
        throw err;
      }
    },

    async removeMember(principal: UserPrincipal, partnerId: string, userId: string) {
      const self = userId === principal.userId;
      if (!self) await assertPartnerAccess(db, principal, partnerId, 'admin');
      await db.transaction(async (tx) => {
        const [member] = await tx
          .select({ role: partnerMembers.role })
          .from(partnerMembers)
          .where(and(eq(partnerMembers.partnerId, partnerId), eq(partnerMembers.userId, userId)));
        if (!member) throw new NotFoundError('Member not found');
        if (member.role === 'owner') {
          if (!self) await assertPartnerAccess(tx, principal, partnerId, 'owner');
          const [{ owners } = { owners: 0 }] = await tx
            .select({ owners: count() })
            .from(partnerMembers)
            .where(and(eq(partnerMembers.partnerId, partnerId), eq(partnerMembers.role, 'owner')));
          if (owners <= 1) throw new ForbiddenError('A partner must keep at least one owner');
        }
        await tx.delete(partnerMembers).where(and(eq(partnerMembers.partnerId, partnerId), eq(partnerMembers.userId, userId)));
        await audit(tx, { actorUserId: principal.userId, action: 'partner.member_removed', targetType: 'partner', targetId: partnerId, metadata: { userId } });
      });
    },

    /** Returns the full key exactly once. Only a hash is stored. */
    async createApiKey(principal: UserPrincipal, partnerId: string, input: { name: string; scopes: ApiKeyScope[]; expiresInDays?: number | undefined }) {
      await assertPartnerAccess(db, principal, partnerId, 'admin');
      const prefix = keyPrefix();
      const key = `pp_${prefix}_${randomToken(32)}`;
      const [row] = await db
        .insert(partnerApiKeys)
        .values({
          partnerId,
          name: input.name,
          prefix,
          keyHash: sha256(key),
          scopes: input.scopes,
          createdBy: principal.userId,
          expiresAt: input.expiresInDays ? new Date(Date.now() + input.expiresInDays * 86_400_000) : null,
        })
        .returning({ id: partnerApiKeys.id, name: partnerApiKeys.name, prefix: partnerApiKeys.prefix, scopes: partnerApiKeys.scopes, expiresAt: partnerApiKeys.expiresAt, createdAt: partnerApiKeys.createdAt });
      await audit(db, { actorUserId: principal.userId, action: 'partner.api_key_created', targetType: 'partner', targetId: partnerId, metadata: { keyId: row!.id, scopes: input.scopes } });
      return { ...row!, key };
    },

    async listApiKeys(principal: UserPrincipal, partnerId: string) {
      await assertPartnerAccess(db, principal, partnerId, 'admin');
      return db
        .select({ id: partnerApiKeys.id, name: partnerApiKeys.name, prefix: partnerApiKeys.prefix, scopes: partnerApiKeys.scopes, lastUsedAt: partnerApiKeys.lastUsedAt, expiresAt: partnerApiKeys.expiresAt, revokedAt: partnerApiKeys.revokedAt, createdAt: partnerApiKeys.createdAt })
        .from(partnerApiKeys)
        .where(eq(partnerApiKeys.partnerId, partnerId))
        .orderBy(desc(partnerApiKeys.createdAt));
    },

    async revokeApiKey(principal: UserPrincipal, partnerId: string, keyId: string) {
      await assertPartnerAccess(db, principal, partnerId, 'admin');
      const [row] = await db
        .update(partnerApiKeys)
        .set({ revokedAt: new Date() })
        .where(and(eq(partnerApiKeys.id, keyId), eq(partnerApiKeys.partnerId, partnerId), isNull(partnerApiKeys.revokedAt)))
        .returning({ id: partnerApiKeys.id });
      if (!row) throw new NotFoundError('API key not found');
      await audit(db, { actorUserId: principal.userId, action: 'partner.api_key_revoked', targetType: 'partner', targetId: partnerId, metadata: { keyId } });
    },

    // ----- admin -----

    list: (status?: 'pending' | 'approved' | 'rejected' | 'suspended', limit = 20, offset = 0) =>
      db
        .select()
        .from(partners)
        .where(status ? eq(partners.status, status) : undefined)
        .orderBy(desc(partners.createdAt))
        .limit(limit)
        .offset(offset),

    async review(adminUserId: string, partnerId: string, decision: PartnerReviewDecision, reason?: string) {
      const partner = await getById(partnerId);
      const next = ({ approve: 'approved', reject: 'rejected', suspend: 'suspended' } as const)[decision];
      if (decision === 'approve' && !partner.payoutWalletAddress) {
        throw new ValidationError('Partner needs a payout wallet address before approval');
      }
      const [updated] = await db
        .update(partners)
        .set({ status: next, statusReason: reason ?? null, reviewedBy: adminUserId, reviewedAt: new Date() })
        .where(eq(partners.id, partnerId))
        .returning();
      await audit(db, { actorUserId: adminUserId, action: `partner.${next}`, targetType: 'partner', targetId: partnerId, metadata: { reason } });
      return updated!;
    },
  };
};

export type PartnerService = ReturnType<typeof createPartnerService>;
