import { and, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import { auditLogs, gamerProfiles, userRoles, users } from '../../db/schema/index.js';
import { audit } from '../../shared/audit.js';
import type { Role, UserPrincipal } from '../../shared/auth/index.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors.js';
import type { SessionService } from '../auth/index.js';

const userColumns = {
  id: users.id,
  email: users.email,
  emailVerifiedAt: users.emailVerifiedAt,
  displayName: users.displayName,
  status: users.status,
  lastLoginAt: users.lastLoginAt,
  createdAt: users.createdAt,
  username: gamerProfiles.username,
  roles: sql<Role[]>`coalesce(array_agg(${userRoles.role}) filter (where ${userRoles.role} is not null), '{}')`,
};

export const createAdminService = (db: Db, sessions: SessionService) => {
  const getUser = async (id: string) => {
    const [user] = await db
      .select(userColumns)
      .from(users)
      .leftJoin(gamerProfiles, eq(gamerProfiles.userId, users.id))
      .leftJoin(userRoles, eq(userRoles.userId, users.id))
      .where(eq(users.id, id))
      .groupBy(users.id, gamerProfiles.username);
    if (!user) throw new NotFoundError('User not found');
    return user;
  };

  const notSelf = (admin: UserPrincipal, userId: string, what: string) => {
    if (admin.userId === userId) throw new ForbiddenError(`You cannot ${what} yourself`);
  };

  return {
    getUser,

    listUsers(filter: { search?: string | undefined; status?: 'active' | 'suspended' | 'deleted' | undefined; role?: Role | undefined; limit: number; offset: number }) {
      const conditions: (SQL | undefined)[] = [];
      if (filter.search) {
        const term = `%${filter.search.replace(/[%_\\]/g, '\\$&')}%`;
        conditions.push(or(ilike(users.email, term), ilike(users.displayName, term), ilike(gamerProfiles.username, term)));
      }
      if (filter.status) conditions.push(eq(users.status, filter.status));
      if (filter.role) {
        conditions.push(sql`exists (select 1 from ${userRoles} ur where ur.user_id = ${users.id} and ur.role = ${filter.role})`);
      }
      return db
        .select(userColumns)
        .from(users)
        .leftJoin(gamerProfiles, eq(gamerProfiles.userId, users.id))
        .leftJoin(userRoles, eq(userRoles.userId, users.id))
        .where(and(...conditions))
        .groupBy(users.id, gamerProfiles.username)
        .orderBy(desc(users.createdAt))
        .limit(filter.limit)
        .offset(filter.offset);
    },

    async suspend(admin: UserPrincipal, userId: string, reason: string) {
      notSelf(admin, userId, 'suspend');
      await getUser(userId);
      await db.transaction(async (tx) => {
        await tx.update(users).set({ status: 'suspended' }).where(eq(users.id, userId));
        await sessions.revokeAllForUser(tx, userId);
        await audit(tx, { actorUserId: admin.userId, action: 'user.suspended', targetType: 'user', targetId: userId, metadata: { reason } });
      });
      return getUser(userId);
    },

    async reactivate(admin: UserPrincipal, userId: string) {
      await getUser(userId);
      await db.update(users).set({ status: 'active' }).where(eq(users.id, userId));
      await audit(db, { actorUserId: admin.userId, action: 'user.reactivated', targetType: 'user', targetId: userId });
      return getUser(userId);
    },

    async grantRole(admin: UserPrincipal, userId: string, role: Role) {
      await getUser(userId);
      await db.insert(userRoles).values({ userId, role, grantedBy: admin.userId }).onConflictDoNothing();
      await audit(db, { actorUserId: admin.userId, action: 'user.role_granted', targetType: 'user', targetId: userId, metadata: { role } });
      return getUser(userId);
    },

    async revokeRole(admin: UserPrincipal, userId: string, role: Role) {
      if (role === 'admin') notSelf(admin, userId, 'remove admin from');
      await getUser(userId);
      await db.delete(userRoles).where(and(eq(userRoles.userId, userId), eq(userRoles.role, role)));
      await audit(db, { actorUserId: admin.userId, action: 'user.role_revoked', targetType: 'user', targetId: userId, metadata: { role } });
      return getUser(userId);
    },

    listAuditLogs: (filter: { actorUserId?: string | undefined; action?: string | undefined; targetId?: string | undefined; limit: number; offset: number }) =>
      db
        .select()
        .from(auditLogs)
        .where(
          and(
            filter.actorUserId ? eq(auditLogs.actorUserId, filter.actorUserId) : undefined,
            filter.action ? eq(auditLogs.action, filter.action) : undefined,
            filter.targetId ? eq(auditLogs.targetId, filter.targetId) : undefined,
          ),
        )
        .orderBy(desc(auditLogs.createdAt))
        .limit(filter.limit)
        .offset(filter.offset),
  };
};

export type AdminService = ReturnType<typeof createAdminService>;
