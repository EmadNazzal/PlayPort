import { useId } from 'react';
import { cn } from '@/lib/cn';
import { HEROES } from './heroes';
import { recipeFor, type Particles } from './recipes';
import { renderScene, type Palette, type SceneCtx } from './scenes';

export type PosterGame = {
  slug: string;
  title: string;
  genres: string[];
  shortDescription?: string | null;
  minAge?: number | null;
  platforms?: string[];
  partner?: { name: string };
};

type Props = { game: PosterGame; variant?: 'portrait' | 'wide'; showTitle?: boolean; className?: string };

/** Seeded PRNG (mulberry32) — a poster looks the same everywhere it appears. */
export const seeded = (seedText: string) => {
  let h = 1779033703 ^ seedText.length;
  for (let i = 0; i < seedText.length; i++) h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353);
  let a = (h << 13) | (h >>> 19);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const ParticleLayer = ({ kind, ctx }: { kind: Particles; ctx: SceneCtx }) => {
  if (kind === 'none') return null;
  const { W, H, p, r } = ctx;
  const n = ctx.wide ? 70 : 36;
  return (
    <g filter={kind === 'petals' ? undefined : `url(#glow-${ctx.uid})`}>
      {Array.from({ length: n }, (_, i) => {
        const x = r() * W;
        const y = r() * H * 0.9;
        const s = r();
        if (kind === 'petals') {
          return <ellipse key={i} cx={x} cy={y} rx={4 + s * 6} ry={2 + s * 3} fill={p.light} opacity={0.5 + s * 0.5} transform={`rotate(${r() * 180} ${x} ${y})`} />;
        }
        if (kind === 'sparks') {
          return <line key={i} x1={x} y1={y} x2={x + (r() - 0.5) * 16} y2={y - 6 - s * 14} stroke={p.light} strokeWidth="2" opacity={0.4 + s * 0.6} />;
        }
        const fill = kind === 'embers' ? p.light : p.ink;
        return <circle key={i} cx={x} cy={y} r={kind === 'embers' ? 1.5 + s * 3 : 0.6 + s * 1.6} fill={fill} opacity={0.3 + s * 0.7} />;
      })}
    </g>
  );
};

/** Splits "Totally Original Game" into balanced lines for the logo block. */
const titleLines = (title: string): string[] => {
  const words = title.toUpperCase().split(' ');
  if (title.length <= 11 || words.length === 1) return [words.join(' ')];
  let best = [title.toUpperCase()];
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const diff = Math.abs(a.length - b.length);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = [a, b];
    }
  }
  return best;
};

const Filters = ({ uid, p }: { uid: string; p: Palette }) => (
  <defs>
    <filter id={`soft-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="40" />
    </filter>
    <filter id={`glow-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b" />
      <feMerge>
        <feMergeNode in="b" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    {/* Rim light: a blurred halo of the light colour hugging the silhouette. */}
    <filter id={`rim-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
      <feMorphology in="SourceAlpha" operator="dilate" radius="2.5" result="d" />
      <feGaussianBlur in="d" stdDeviation="3.5" result="b" />
      <feFlood floodColor={p.light} floodOpacity="0.9" />
      <feComposite in2="b" operator="in" result="rim" />
      <feMerge>
        <feMergeNode in="rim" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <filter id={`grain-${uid}`}>
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
      <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.08 0" />
      <feComposite in2="SourceGraphic" operator="in" />
    </filter>
    <radialGradient id={`vig-${uid}`} cx="0.5" cy="0.45" r="0.75">
      <stop offset="0.55" stopColor="#000" stopOpacity="0" />
      <stop offset="1" stopColor="#000" stopOpacity="0.55" />
    </radialGradient>
    <linearGradient id={`foot-${uid}`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.5" stopColor={p.near} stopOpacity="0" />
      <stop offset="0.78" stopColor={p.near} stopOpacity="0.85" />
      <stop offset="1" stopColor={p.near} stopOpacity="1" />
    </linearGradient>
  </defs>
);

/**
 * Illustrated key art: environment → backlight → rim-lit hero → particles → poster typography
 * (studio credit, logo title, tagline, billing block, age badge). Portrait posters carry the
 * type; wide heroes are art only because the page overlays its own copy.
 */
export const Poster = ({ game, variant = 'portrait', showTitle = true, className }: Props) => {
  const uid = useId().replace(/:/g, '');
  const wide = variant === 'wide';
  const W = wide ? 1600 : 600;
  const H = 900;
  const r = seeded(game.slug);
  const recipe = recipeFor(game.slug, game.genres, r);
  const p = recipe.palette;
  const ctx: SceneCtx = { W, H, p, r, uid, wide };
  const scene = renderScene(recipe.env, ctx);
  const hero = HEROES[recipe.hero];

  const heroX = W * (wide ? (recipe.wideHeroX ?? 0.7) : (recipe.heroX ?? 0.5));
  // Fit by height for standing figures and by width for vehicles, ships and wide scenes.
  const scale = Math.min((wide ? H * 0.52 : H * 0.42) / hero.height, (wide ? W * 0.42 : W * 0.78) / hero.width) * (recipe.heroScale ?? 1);
  const heroY = hero.floating ? H * (wide ? 0.62 : 0.56) : scene.groundY + 4;
  const withType = showTitle && !wide;
  const lines = titleLines(game.title);
  const longest = Math.max(...lines.map((l) => l.length));
  const titleSize = Math.min(118, (W - 70) / (longest * 0.52));
  const tagline = game.shortDescription && game.shortDescription.length > 58 ? `${game.shortDescription.slice(0, 55).trimEnd()}…` : game.shortDescription;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className={cn('h-full w-full', className)} role="img" aria-label={`${game.title} poster`}>
      <Filters uid={uid} p={p} />
      {scene.back}

      {!recipe.daylight && (
        <circle cx={heroX} cy={heroY - hero.height * scale * 0.55} r={hero.height * scale * 0.75} fill={p.light} opacity="0.22" filter={`url(#soft-${uid})`} />
      )}

      <g transform={`translate(${heroX} ${heroY}) scale(${scale})`}>
        <g fill={recipe.heroFill ?? p.near} color={recipe.heroFill ?? p.near} filter={recipe.daylight ? undefined : `url(#rim-${uid})`}>
          {hero.body}
        </g>
        {hero.accent && (
          <g fill={p.light} color={p.light} filter={`url(#glow-${uid})`}>
            {hero.accent}
          </g>
        )}
      </g>

      {scene.front}
      <ParticleLayer kind={recipe.particles} ctx={ctx} />

      <rect width={W} height={H} fill={`url(#vig-${uid})`} />
      {withType && <rect width={W} height={H} fill={`url(#foot-${uid})`} />}
      <rect width={W} height={H} filter={`url(#grain-${uid})`} />

      {withType && (
        <g fill={p.ink} textAnchor="middle" style={{ fontFamily: 'var(--font-display)' }}>
          {game.partner && (
            <text x={W / 2} y="62" fontSize="17" letterSpacing="0.34em" opacity="0.78" style={{ fontFamily: 'var(--font-mono)' }}>
              {game.partner.name.toUpperCase()} PRESENTS
            </text>
          )}
          {lines.map((line, i) => (
            <text
              key={line}
              x={W / 2}
              y={H - 150 - (lines.length - 1 - i) * titleSize * 0.9}
              fontSize={titleSize}
              fontWeight="800"
              letterSpacing="-0.01em"
              style={{ fontVariationSettings: "'wdth' 76, 'opsz' 96" }}
            >
              {line}
            </text>
          ))}
          {tagline && (
            <text x={W / 2} y={H - 104} fontSize="21" fontStyle="italic" opacity="0.82" style={{ fontFamily: 'var(--font-sans)' }}>
              {tagline}
            </text>
          )}
          <g opacity="0.45" style={{ fontFamily: 'var(--font-sans)', fontVariationSettings: "'wdth' 70" }}>
            <text x={W / 2} y={H - 58} fontSize="11.5" letterSpacing="0.12em">
              A {(game.partner?.name ?? 'PlayPort').toUpperCase()} PRODUCTION · {game.genres.slice(0, 3).join(' · ').toUpperCase()}
            </text>
            <text x={W / 2} y={H - 40} fontSize="11.5" letterSpacing="0.12em">
              {(game.platforms?.length ? `PLAYABLE ON ${game.platforms.join(' · ')}` : 'NOW PLAYING').toUpperCase()} · ON PLAYPORT
            </text>
          </g>
          <g transform={`translate(${W - 72} ${H - 72})`} opacity="0.85">
            <rect width="40" height="40" rx="6" fill="none" stroke={p.ink} strokeWidth="2" />
            <text x="20" y="27" fontSize="17" fontWeight="700" style={{ fontFamily: 'var(--font-sans)' }}>
              {game.minAge ? `${game.minAge}+` : 'E'}
            </text>
          </g>
        </g>
      )}
    </svg>
  );
};
