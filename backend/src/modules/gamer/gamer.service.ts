import { and, desc, eq, isNull } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import { gameEntitlements, gamerProfiles, games, users } from '../../db/schema/index.js';
import { ConflictError, NotFoundError } from '../../shared/errors.js';
import { isUniqueViolation } from '../../shared/db-errors.js';

export type UpdateGamerInput = {
  username?: string | undefined;
  displayName?: string | undefined;
  avatarUrl?: string | null | undefined;
  bio?: string | null | undefined;
  country?: string | null | undefined;
  dateOfBirth?: string | null | undefined;
};


export const createGamerService = (db: Db) => {
  const getMe = async (userId: string) => {
    const [row] = await db
      .select({
        userId: users.id,
        username: gamerProfiles.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        bio: gamerProfiles.bio,
        country: gamerProfiles.country,
        dateOfBirth: gamerProfiles.dateOfBirth,
        createdAt: users.createdAt,
      })
      .from(gamerProfiles)
      .innerJoin(users, eq(users.id, gamerProfiles.userId))
      .where(eq(gamerProfiles.userId, userId));
    if (!row) throw new NotFoundError('No gamer profile for this account');
    return row;
  };

  return {
    getMe,

    async updateMe(userId: string, input: UpdateGamerInput) {
      await getMe(userId);
      const { displayName, avatarUrl, ...profile } = input;
      try {
        await db.transaction(async (tx) => {
          if (Object.keys(profile).length) await tx.update(gamerProfiles).set(profile).where(eq(gamerProfiles.userId, userId));
          if (displayName !== undefined || avatarUrl !== undefined) {
            await tx.update(users).set({ displayName, avatarUrl }).where(eq(users.id, userId));
          }
        });
      } catch (err) {
        if (isUniqueViolation(err)) throw new ConflictError('Username already taken');
        throw err;
      }
      return getMe(userId);
    },

    /** Public profile: no email, country or date of birth. */
    async getPublic(username: string) {
      const [row] = await db
        .select({ username: gamerProfiles.username, displayName: users.displayName, avatarUrl: users.avatarUrl, bio: gamerProfiles.bio, joinedAt: users.createdAt })
        .from(gamerProfiles)
        .innerJoin(users, eq(users.id, gamerProfiles.userId))
        .where(and(eq(gamerProfiles.username, username), eq(users.status, 'active')));
      if (!row) throw new NotFoundError('Gamer not found');
      return row;
    },

    library: (userId: string) =>
      db
        .select({
          gameId: games.id,
          title: games.title,
          slug: games.slug,
          thumbnailUrl: games.thumbnailUrl,
          launchUrl: games.launchUrl,
          acquiredAt: gameEntitlements.createdAt,
        })
        .from(gameEntitlements)
        .innerJoin(games, eq(games.id, gameEntitlements.gameId))
        .where(and(eq(gameEntitlements.userId, userId), isNull(gameEntitlements.revokedAt)))
        .orderBy(desc(gameEntitlements.createdAt)),
  };
};

export type GamerService = ReturnType<typeof createGamerService>;
