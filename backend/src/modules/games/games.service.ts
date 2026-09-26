import { and, arrayContains, desc, eq, ilike, isNull, or, type SQL } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import { gameEntitlements, games, partners } from '../../db/schema/index.js';
import { audit } from '../../shared/audit.js';
import type { Principal } from '../../shared/auth/index.js';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors.js';
import { assertPartnerAccess } from '../partner/index.js';
import { isUniqueViolation } from '../../shared/db-errors.js';

export type GameInput = {
  title: string;
  slug: string;
  launchUrl: string;
  shortDescription?: string | null | undefined;
  description?: string | null | undefined;
  genres?: string[] | undefined;
  platforms?: string[] | undefined;
  thumbnailUrl?: string | null | undefined;
  bannerUrl?: string | null | undefined;
  priceLamports?: bigint | undefined;
  minAge?: number | null | undefined;
};

export type GameStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived';

/** Changing these on a live game sends it back for review. */
const REVIEWED_FIELDS = ['launchUrl', 'priceLamports'] as const;


const actorId = (p: Principal): string | null => (p.kind === 'user' ? p.userId : null);

/** Fields visible to the public catalog. */
const publicColumns = {
  id: games.id,
  title: games.title,
  slug: games.slug,
  shortDescription: games.shortDescription,
  description: games.description,
  genres: games.genres,
  platforms: games.platforms,
  thumbnailUrl: games.thumbnailUrl,
  bannerUrl: games.bannerUrl,
  priceLamports: games.priceLamports,
  minAge: games.minAge,
  publishedAt: games.publishedAt,
  partner: { id: partners.id, name: partners.name, slug: partners.slug, logoUrl: partners.logoUrl },
};

const isListed = and(eq(games.status, 'published'), eq(partners.status, 'approved'));

export const createGameService = (db: Db) => {
  const getById = async (id: string) => {
    const [game] = await db.select().from(games).where(eq(games.id, id));
    if (!game) throw new NotFoundError('Game not found');
    return game;
  };

  /** Loads a game and checks the caller may manage it (404 for outsiders). */
  const getManaged = async (principal: Principal, id: string) => {
    const game = await getById(id);
    await assertPartnerAccess(db, principal, game.partnerId);
    return game;
  };

  const setStatus = async (principal: Principal, id: string, status: GameStatus, extra: Partial<typeof games.$inferInsert> = {}) => {
    const [game] = await db.update(games).set({ status, ...extra }).where(eq(games.id, id)).returning();
    await audit(db, { actorUserId: actorId(principal), action: `game.${status}`, targetType: 'game', targetId: id, metadata: { via: principal.kind } });
    return game!;
  };

  return {
    getById,

    /** A published game from an approved partner, or 404. */
    async getListed(id: string) {
      const [row] = await db.select({ game: games, partner: partners }).from(games).innerJoin(partners, eq(partners.id, games.partnerId)).where(and(eq(games.id, id), isListed));
      if (!row) throw new NotFoundError('Game not found');
      return row;
    },

    listPublic(filter: { search?: string | undefined; genre?: string | undefined; limit: number; offset: number }) {
      const conditions: (SQL | undefined)[] = [isListed];
      if (filter.search) {
        const term = `%${filter.search.replace(/[%_\\]/g, '\\$&')}%`;
        conditions.push(or(ilike(games.title, term), ilike(games.shortDescription, term)));
      }
      if (filter.genre) conditions.push(arrayContains(games.genres, [filter.genre]));
      return db
        .select(publicColumns)
        .from(games)
        .innerJoin(partners, eq(partners.id, games.partnerId))
        .where(and(...conditions))
        .orderBy(desc(games.publishedAt))
        .limit(filter.limit)
        .offset(filter.offset);
    },

    async getPublicBySlug(slug: string) {
      const [row] = await db.select(publicColumns).from(games).innerJoin(partners, eq(partners.id, games.partnerId)).where(and(eq(games.slug, slug), isListed));
      if (!row) throw new NotFoundError('Game not found');
      return row;
    },

    async listForPartner(principal: Principal, partnerId: string) {
      await assertPartnerAccess(db, principal, partnerId);
      return db.select().from(games).where(eq(games.partnerId, partnerId)).orderBy(desc(games.createdAt));
    },

    async create(principal: Principal, partnerId: string, input: GameInput) {
      await assertPartnerAccess(db, principal, partnerId);
      try {
        const [game] = await db.insert(games).values({ ...input, partnerId }).returning();
        await audit(db, { actorUserId: actorId(principal), action: 'game.created', targetType: 'game', targetId: game!.id, metadata: { partnerId, via: principal.kind } });
        return game!;
      } catch (err) {
        if (isUniqueViolation(err)) throw new ConflictError('That game slug is taken');
        throw err;
      }
    },

    async update(principal: Principal, id: string, input: Partial<GameInput>) {
      const game = await getManaged(principal, id);
      if (game.status === 'archived') throw new ValidationError('Archived games cannot be edited');
      const needsReview =
        game.status === 'published' &&
        REVIEWED_FIELDS.some((f) => input[f] !== undefined && input[f] !== game[f]);
      try {
        const [updated] = await db
          .update(games)
          .set({ ...input, ...(needsReview && { status: 'pending_review' as const }) })
          .where(eq(games.id, id))
          .returning();
        await audit(db, { actorUserId: actorId(principal), action: 'game.updated', targetType: 'game', targetId: id, metadata: { fields: Object.keys(input), needsReview, via: principal.kind } });
        return updated!;
      } catch (err) {
        if (isUniqueViolation(err)) throw new ConflictError('That game slug is taken');
        throw err;
      }
    },

    async submitForReview(principal: Principal, id: string) {
      const game = await getManaged(principal, id);
      if (game.status !== 'draft' && game.status !== 'rejected') {
        throw new ValidationError(`A ${game.status} game cannot be submitted`);
      }
      const [partner] = await db.select({ status: partners.status }).from(partners).where(eq(partners.id, game.partnerId));
      if (partner?.status !== 'approved') throw new ValidationError('Your partner account must be approved first');
      return setStatus(principal, id, 'pending_review', { statusReason: null });
    },

    async archive(principal: Principal, id: string) {
      await getManaged(principal, id);
      return setStatus(principal, id, 'archived');
    },

    /** Free games: add to the library without a payment. */
    async claimFree(userId: string, gameId: string) {
      const { game } = await this.getListed(gameId);
      if (game.priceLamports !== 0n) throw new ValidationError('This game is not free');
      if (await this.owns(userId, gameId)) throw new ConflictError('You already own this game');
      const [entitlement] = await db.insert(gameEntitlements).values({ userId, gameId }).onConflictDoNothing().returning();
      if (!entitlement) throw new ConflictError('You already own this game');
      return entitlement;
    },

    async owns(userId: string, gameId: string): Promise<boolean> {
      const [row] = await db
        .select({ id: gameEntitlements.id })
        .from(gameEntitlements)
        .where(and(eq(gameEntitlements.userId, userId), eq(gameEntitlements.gameId, gameId), isNull(gameEntitlements.revokedAt)));
      return Boolean(row);
    },

    // ----- admin -----

    listByStatus: (status: GameStatus | undefined, limit: number, offset: number) =>
      db.select().from(games).where(status ? eq(games.status, status) : undefined).orderBy(desc(games.updatedAt)).limit(limit).offset(offset),

    async review(principal: Principal, id: string, decision: 'publish' | 'reject', reason?: string) {
      const game = await getById(id);
      if (game.status !== 'pending_review') throw new ValidationError('Only games pending review can be reviewed');
      const reviewer = { reviewedBy: actorId(principal), reviewedAt: new Date(), statusReason: reason ?? null };
      return decision === 'publish'
        ? setStatus(principal, id, 'published', { ...reviewer, publishedAt: game.publishedAt ?? new Date() })
        : setStatus(principal, id, 'rejected', reviewer);
    },
  };
};

export type GameService = ReturnType<typeof createGameService>;
