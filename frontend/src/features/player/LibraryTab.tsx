import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router';
import { buttonStyles } from '@/components/ui/Button';
import { formatDate } from '@/lib/format';
import { useGames, useLibrary } from '@/lib/queries';
import { GameCover } from '@/features/market/GameCover';

export default function LibraryTab() {
  const { data: library, isPending } = useLibrary();
  const { data: games = [] } = useGames();
  const bySlug = new Map(games.map((g) => [g.slug, g]));

  return (
    <div>

      {isPending ? (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => <div key={i} className="aspect-[2/3] animate-pulse rounded-2xl bg-surface" />)}
        </div>
      ) : !library?.length ? (
        <div className="rounded-3xl border border-dashed border-line-strong py-24 text-center">
          <p className="font-display text-2xl font-semibold">Your shelf is empty.</p>
          <p className="mt-2 text-muted">Start with something free — no wallet needed.</p>
          <Link to="/browse?price=free" className={buttonStyles({ intent: 'primary', className: 'mt-6' })}>
            Browse free games
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
          {library.map((item, i) => {
            const game = bySlug.get(item.slug) ?? { slug: item.slug, title: item.title, genres: [], thumbnailUrl: item.thumbnailUrl, bannerUrl: null };
            return (
              <div key={item.gameId} className="group animate-rise" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="relative aspect-[2/3] overflow-hidden rounded-2xl ring-1 ring-veil/[0.07]">
                  <GameCover game={game} />
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-ink/90 via-transparent p-3 opacity-100 transition-opacity duration-200 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100">
                    <a href={item.launchUrl} target="_blank" rel="noreferrer" className={buttonStyles({ intent: 'go', size: 'md', className: 'w-full' })}>
                      Play <ArrowUpRight />
                    </a>
                  </div>
                </div>
                <Link to={`/games/${item.slug}`} className="mt-3 block truncate font-medium hover:text-go-fg">
                  {item.title}
                </Link>
                <p className="text-xs text-muted">Added {formatDate(item.acquiredAt)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
