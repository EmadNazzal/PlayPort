import { Link } from 'react-router';
import { useGames } from '@/lib/queries';
import type { Game } from '@/lib/types';
import { GameCover } from '@/features/market/GameCover';

const Row = ({ games, reverse, duration }: { games: Game[]; reverse?: boolean; duration: number }) => (
  <div className="flex w-max gap-5" style={{ ['--marquee-duration' as string]: `${duration}s` }}>
    {/* Two copies back to back make the loop seamless at translateX(-50%). */}
    <div className={`flex gap-5 ${reverse ? 'animate-marquee-reverse' : 'animate-marquee'} [animation-play-state:var(--play,running)]`}>
      {[...games, ...games].map((g, i) => (
        <Link
          key={`${g.id}-${i}`}
          to={`/market/games/${g.slug}`}
          tabIndex={i >= games.length ? -1 : 0}
          aria-hidden={i >= games.length}
          className="relative block aspect-[3/4] w-[190px] shrink-0 overflow-hidden rounded-2xl ring-1 ring-white/10 transition-transform duration-300 ease-(--ease-out) sm:w-[230px] [@media(hover:hover)]:hover:-translate-y-2"
        >
          <GameCover game={g} />
        </Link>
      ))}
    </div>
  </div>
);

/** A tilted wall of real game art drifting in two directions. Pauses while hovered. */
export const Montage = () => {
  const { data: games } = useGames();
  if (!games?.length) return <div className="h-[520px]" />;
  const half = Math.ceil(games.length / 2);
  const a = games.slice(0, half);
  // Second row: the other half first, so the two rows never show the same art side by side.
  const b = [...games.slice(half), ...games.slice(0, half)].reverse();

  return (
    <section aria-label="Games on PlayPort" className="relative overflow-hidden py-20 sm:py-28">
      <div className="mx-auto mb-14 flex max-w-[1400px] flex-col gap-4 px-5 sm:flex-row sm:items-end sm:justify-between sm:px-8">
        <h2 className="max-w-2xl text-[clamp(2rem,4.5vw,3.75rem)] leading-[0.95] font-bold tracking-[-0.035em] [font-variation-settings:'wdth'_85]">
          {games.length} worlds tonight.
          <span className="block text-muted">More every week.</span>
        </h2>
        <Link to="/market" className="text-sm text-muted underline-offset-4 transition-colors duration-150 hover:text-text hover:underline">
          Browse them all →
        </Link>
      </div>
      <div
        className="[perspective:1400px] hover:[--play:paused]"
        style={{ maskImage: 'linear-gradient(90deg, transparent, black 12%, black 88%, transparent)' }}
      >
        <div className="flex flex-col gap-5 [transform:rotateX(14deg)_rotateZ(-5deg)_scale(1.08)] [transform-style:preserve-3d]">
          <Row games={a} duration={70} />
          <Row games={b} duration={85} reverse />
        </div>
      </div>
    </section>
  );
};
