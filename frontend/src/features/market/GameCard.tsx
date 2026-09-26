import { Check } from 'lucide-react';
import { Link } from 'react-router';
import { Price } from '@/components/ui/Price';
import { cn } from '@/lib/cn';
import { titleCase } from '@/lib/format';
import type { Game } from '@/lib/types';
import { GameCover } from './GameCover';

type Props = { game: Game; owned?: boolean; className?: string; priority?: boolean };

/** Title, studio and price are always visible — never hidden behind hover. */
export const GameCard = ({ game, owned, className }: Props) => (
  <Link to={`/market/games/${game.slug}`} className={cn('group block outline-offset-4', className)}>
    <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-surface ring-1 ring-white/[0.07] transition-[transform,box-shadow] duration-250 ease-(--ease-out) [@media(hover:hover)]:group-hover:-translate-y-1 [@media(hover:hover)]:group-hover:shadow-[0_24px_50px_-20px_rgb(0_0_0/0.9)] [@media(hover:hover)]:group-hover:ring-white/20">
      <div className="h-full w-full transition-transform duration-500 ease-(--ease-out) [@media(hover:hover)]:group-hover:scale-[1.04]">
        <GameCover game={game} />
      </div>
      {game.genres[0] && (
        <span className="absolute top-3 left-3 rounded-md bg-ink/70 px-2 py-1 font-mono text-[10px] tracking-wider text-text/80 uppercase backdrop-blur-md">
          {titleCase(game.genres[0])}
        </span>
      )}
      {owned && (
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-md bg-go px-2 py-1 text-[11px] font-semibold text-ink">
          <Check className="size-3" strokeWidth={3} /> Owned
        </span>
      )}
    </div>
    <div className="mt-3 flex items-start justify-between gap-3 px-0.5">
      <div className="min-w-0">
        <p className="truncate text-[15px] font-medium">{game.title}</p>
        <p className="truncate text-[13px] text-muted">{game.partner.name}</p>
      </div>
      <Price lamports={game.priceLamports} className="mt-0.5 shrink-0" />
    </div>
  </Link>
);

export const GameCardSkeleton = () => (
  <div>
    <div className="aspect-[3/4] animate-pulse rounded-2xl bg-surface" />
    <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-surface" />
    <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-surface" />
  </div>
);
