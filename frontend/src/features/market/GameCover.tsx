import { memo } from 'react';
import { cn } from '@/lib/cn';
import { Poster, type PosterGame } from './poster/Poster';

type CoverProps = {
  game: PosterGame & { thumbnailUrl: string | null; bannerUrl: string | null };
  /** `portrait` 2:3 poster for cards, `wide` 16:9 art for heroes. */
  variant?: 'portrait' | 'wide';
  showTitle?: boolean;
  className?: string;
};

/**
 * A game's key art: the studio's uploaded image when there is one, otherwise an illustrated
 * poster generated from the game (see ./poster).
 */
export const GameCover = memo(({ game, variant = 'portrait', showTitle = true, className }: CoverProps) => {
  const image = variant === 'wide' ? (game.bannerUrl ?? game.thumbnailUrl) : (game.thumbnailUrl ?? game.bannerUrl);
  if (image) return <img src={image} alt="" loading="lazy" className={cn('h-full w-full object-cover', className)} />;
  return <Poster game={game} variant={variant} showTitle={showTitle} className={className} />;
});
GameCover.displayName = 'GameCover';
