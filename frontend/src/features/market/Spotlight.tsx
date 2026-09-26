import { ArrowRight } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router';
import { buttonStyles } from '@/components/ui/Button';
import { Price } from '@/components/ui/Price';
import { cn } from '@/lib/cn';
import { titleCase } from '@/lib/format';
import type { Game } from '@/lib/types';
import { GameCover } from './GameCover';

const SLIDE_MS = 7000;

/**
 * Hero spotlight with a visible queue. Auto-advances every 7s with a progress bar, pauses on
 * hover or keyboard focus, and crossfades with a touch of blur so the swap reads as one motion.
 * The progress bar is a CSS animation; its `animationend` advances the slide.
 */
export const Spotlight = ({ games }: { games: Game[] }) => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();
  if (!games[index]) return null;
  const next = () => setIndex((i) => (i + 1) % games.length);

  return (
    <section
      className="mx-auto grid max-w-[1400px] gap-4 px-4 pt-6 sm:px-8 lg:grid-cols-[1fr_300px]"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured games"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-surface ring-1 ring-white/[0.07] sm:aspect-[16/9]">
        {/* All slides stay mounted and crossfade in CSS, so a swap never waits on JS frames. */}
        {games.map((g, i) => (
          <div key={g.id} className="fade-layer absolute inset-0" data-active={i === index ? '' : undefined} aria-hidden={i !== index}>
            <GameCover game={g} variant="wide" showTitle={false} />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent sm:bg-gradient-to-r sm:from-ink/95 sm:via-ink/40" />
          </div>
        ))}

        {games.map((g, i) => (
          <div
            key={g.id}
            className="fade-copy absolute inset-x-0 bottom-0 p-6 sm:top-0 sm:flex sm:max-w-xl sm:flex-col sm:justify-end sm:p-12"
            data-active={i === index ? '' : undefined}
            aria-hidden={i !== index}
            inert={i !== index}
          >
            <p className="eyebrow mb-3 text-text/60">
              {g.partner.name} · {g.genres.slice(0, 2).map(titleCase).join(' / ')}
            </p>
            <h2 className="text-[clamp(2.4rem,5.5vw,4.75rem)] leading-[0.9] font-bold tracking-[-0.04em] uppercase [font-variation-settings:'wdth'_78]">{g.title}</h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-text/75">{g.shortDescription}</p>
            <div className="mt-7 flex items-center gap-5">
              <Link to={`/market/games/${g.slug}`} className={buttonStyles({ intent: 'primary', size: 'lg' })}>
                View game <ArrowRight />
              </Link>
              <Price lamports={g.priceLamports} size="md" showFiat />
            </div>
          </div>
        ))}
      </div>

      <ol className="flex gap-2 lg:flex-col" aria-label="Queue">
        {games.map((g, i) => {
          const active = i === index;
          return (
            <li key={g.id} className="flex-1 lg:flex-none">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-current={active}
                aria-label={`Show ${g.title}`}
                className={cn(
                  'pressable relative flex w-full items-center gap-3 overflow-hidden rounded-2xl p-2 text-left transition-colors duration-200',
                  active ? 'bg-raised' : 'hover:bg-white/[0.04]',
                )}
              >
                <span className="hidden aspect-[3/4] w-12 shrink-0 overflow-hidden rounded-lg lg:block">
                  <GameCover game={g} showTitle={false} />
                </span>
                <span className="hidden min-w-0 flex-1 lg:block">
                  <span className={cn('block truncate text-sm', active ? 'text-text' : 'text-muted')}>{g.title}</span>
                  <span className="block truncate text-xs text-faint">{g.partner.name}</span>
                </span>
                <span className="absolute inset-x-0 bottom-0 h-[3px] bg-white/[0.06] lg:inset-x-2 lg:bottom-1 lg:rounded-full">
                  {active && (
                    <span
                      key={`${g.id}-${index}`}
                      onAnimationEnd={next}
                      className="block h-full origin-left rounded-full bg-go"
                      style={{
                        animation: reduce ? undefined : `spotlight-progress ${SLIDE_MS}ms linear forwards`,
                        animationPlayState: paused ? 'paused' : 'running',
                        transform: reduce ? 'scaleX(1)' : undefined,
                      }}
                    />
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <style>{`@keyframes spotlight-progress { from { transform: scaleX(0) } to { transform: scaleX(1) } }`}</style>
    </section>
  );
};
