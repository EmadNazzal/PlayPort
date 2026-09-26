import { Link } from 'react-router';
import { cn } from '@/lib/cn';
import { lamportsToSol, titleCase } from '@/lib/format';
import { useGames, useGenres, useLibrary } from '@/lib/queries';
import type { Game } from '@/lib/types';
import { GameCard, GameCardSkeleton } from './GameCard';
import { GameCover } from './GameCover';
import { Rail, RailItem } from './Rail';
import { Spotlight } from './Spotlight';

const GameRail = ({ title, eyebrow, href, games, owned }: { title: string; eyebrow?: string; href?: string; games: Game[]; owned: Set<string> }) =>
  games.length === 0 ? null : (
    <Rail title={title} eyebrow={eyebrow} href={href}>
      {games.map((g) => (
        <RailItem key={g.id}>
          <GameCard game={g} owned={owned.has(g.id)} />
        </RailItem>
      ))}
    </Rail>
  );

const Studios = ({ games }: { games: Game[] }) => {
  const studios = [...games.reduce((m, g) => m.set(g.partner.slug, [...(m.get(g.partner.slug) ?? []), g]), new Map<string, Game[]>())];
  return (
    <section className="mx-auto max-w-[1400px] px-4 sm:px-8">
      <p className="eyebrow mb-1.5">The stalls</p>
      <h2 className="mb-5 font-display text-2xl font-semibold tracking-[-0.02em] sm:text-[28px]">Studios on PlayPort</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {studios.map(([slug, list]) => (
          <Link key={slug} to={`/browse?partner=${slug}`} className="group pressable relative overflow-hidden rounded-2xl border border-line bg-surface p-5 transition-colors duration-200 hover:border-line-strong">
            <div className="mb-8 flex -space-x-3">
              {list.slice(0, 4).map((g) => (
                <span key={g.id} className="aspect-[3/4] w-12 overflow-hidden rounded-lg ring-2 ring-surface transition-transform duration-300 ease-(--ease-out) group-hover:-translate-y-1 [&:nth-child(2)]:delay-[30ms] [&:nth-child(3)]:delay-[60ms] [&:nth-child(4)]:delay-[90ms]">
                  <GameCover game={g} showTitle={false} />
                </span>
              ))}
            </div>
            <p className="font-medium">{list[0]!.partner.name}</p>
            <p className="text-sm text-muted">
              {list.length} {list.length === 1 ? 'game' : 'games'}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default function StorePage() {
  const { data: games, isPending } = useGames();
  const { data: genres = [] } = useGenres();
  const { data: library = [] } = useLibrary();
  const owned = new Set(library.map((l) => l.gameId));

  if (isPending || !games) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 pt-6 sm:px-8">
        <div className="aspect-[16/9] animate-pulse rounded-3xl bg-surface lg:aspect-[21/9]" />
        <div className="mt-12 grid grid-cols-2 gap-5 sm:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <GameCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  const paid = games.filter((g) => g.priceLamports !== '0');
  const spotlight = [...paid].sort((a, b) => Number(BigInt(b.priceLamports) - BigInt(a.priceLamports))).slice(0, 5);
  const free = games.filter((g) => g.priceLamports === '0');
  const budget = paid.filter((g) => lamportsToSol(g.priceLamports) <= 0.5);
  const topGenres = genres.slice(0, 3);

  return (
    <div className="space-y-16 pb-8">
      <Spotlight games={spotlight} />

      <div className="no-scrollbar mx-auto flex max-w-[1400px] gap-2 overflow-x-auto px-4 sm:px-8">
        {genres.map(({ genre, games: count }, i) => (
          <Link
            key={genre}
            to={`/browse?genre=${genre}`}
            className={cn(
              'pressable shrink-0 rounded-full border border-line bg-veil/[0.02] px-4 py-2 text-sm text-text/80 transition-colors duration-150 hover:border-line-strong hover:bg-veil/[0.06] hover:text-text animate-rise',
            )}
            style={{ animationDelay: `${i * 30}ms` }}
          >
            {titleCase(genre)} <span className="ml-1 font-mono text-xs text-faint">{count}</span>
          </Link>
        ))}
      </div>

      <GameRail title="New & noteworthy" eyebrow="Just opened" href="/browse?sort=newest" games={games.slice(0, 10)} owned={owned} />
      <GameRail title="Free to play" eyebrow="No wallet needed" href="/browse?price=free" games={free} owned={owned} />
      <GameRail title="Under 0.5 SOL" eyebrow="Pocket money" href="/browse?price=paid&sort=price_asc" games={budget} owned={owned} />
      {topGenres.map(({ genre }) => (
        <GameRail key={genre} title={titleCase(genre)} eyebrow="Genre" href={`/browse?genre=${genre}`} games={games.filter((g) => g.genres.includes(genre))} owned={owned} />
      ))}
      <Studios games={games} />
    </div>
  );
}
