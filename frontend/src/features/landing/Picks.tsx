import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { Link } from 'react-router';
import { Reveal } from '@/components/Reveal';
import { Price } from '@/components/ui/Price';
import { useGames } from '@/lib/queries';
import type { Game } from '@/lib/types';
import { GameCover } from '@/features/market/GameCover';

/** A card that leans toward the pointer. Decorative, so a springy follow is appropriate. */
const TiltCard = ({ game, index }: { game: Game; index: number }) => {
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 150, damping: 18, mass: 0.6 };
  const rotateY = useSpring(useTransform(px, [0, 1], [-10, 10]), spring);
  const rotateX = useSpring(useTransform(py, [0, 1], [8, -8]), spring);
  const glareX = useTransform(px, [0, 1], ['0%', '100%']);
  const glareY = useTransform(py, [0, 1], ['0%', '100%']);
  const glare = useTransform([glareX, glareY], ([x, y]) => `radial-gradient(circle at ${x} ${y}, rgb(255 255 255 / 0.18), transparent 45%)`);

  return (
    <Reveal delay={index * 80} className="[perspective:1000px]">
      <motion.div
        onPointerMove={(e) => {
          if (reduce || e.pointerType !== 'mouse') return;
          const r = e.currentTarget.getBoundingClientRect();
          px.set((e.clientX - r.left) / r.width);
          py.set((e.clientY - r.top) / r.height);
        }}
        onPointerLeave={() => {
          px.set(0.5);
          py.set(0.5);
        }}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      >
        <Link to={`/market/games/${game.slug}`} className="group relative block aspect-[3/4] overflow-hidden rounded-3xl ring-1 ring-white/10">
          <GameCover game={game} />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ background: glare }}
          />
        </Link>
      </motion.div>
      <div className="mt-4 flex items-start justify-between gap-3 px-1">
        <div>
          <p className="font-medium">{game.title}</p>
          <p className="text-sm text-muted">{game.partner.name}</p>
        </div>
        <Price lamports={game.priceLamports} />
      </div>
    </Reveal>
  );
};

export const Picks = () => {
  const { data: games } = useGames({ sort: 'price_desc' });
  const picks = games?.slice(0, 3) ?? [];
  if (!picks.length) return null;
  return (
    <section className="mx-auto max-w-[1400px] px-5 py-24 sm:px-8">
      <div className="mb-12 flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow mb-4">Tonight's picks</p>
          <h2 className="text-[clamp(2rem,4.5vw,3.75rem)] leading-[0.95] font-bold tracking-[-0.035em] [font-variation-settings:'wdth'_85]">Worth staying up for.</h2>
        </div>
      </div>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {picks.map((g, i) => (
          <TiltCard key={g.id} game={g} index={i} />
        ))}
      </div>
    </section>
  );
};
