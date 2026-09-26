import { memo, useId } from 'react';
import { cn } from '@/lib/cn';
import type { Game } from '@/lib/types';

/**
 * Generative key art for games without uploaded images. Deterministic per slug, styled by
 * genre, so every game has a recognisable "poster" that stays the same everywhere it appears.
 */

type Palette = { bg: string; mid: string; hi: string; ink: string };

// Each palette: a deep ground, a body colour, a light/emissive highlight, and ink for linework.
const PALETTES: Record<Family, Palette[]> = {
  space: [
    { bg: '#070B1F', mid: '#2A2F8F', hi: '#7CF7FF', ink: '#E9F7FF' },
    { bg: '#0B0716', mid: '#5B1E8C', hi: '#FF6AD5', ink: '#FFE9FA' },
  ],
  racing: [
    { bg: '#12040A', mid: '#B0153D', hi: '#FFB547', ink: '#FFF2E0' },
    { bg: '#030E12', mid: '#0A6B7A', hi: '#D4FF3A', ink: '#EFFFF4' },
  ],
  rpg: [
    { bg: '#0E0906', mid: '#6E2A12', hi: '#FFB35C', ink: '#FFF1DE' },
    { bg: '#0A0C0A', mid: '#3D4A2C', hi: '#E8D27A', ink: '#F7F3E1' },
  ],
  horror: [
    { bg: '#020608', mid: '#0D3440', hi: '#9BFFE4', ink: '#DFFFF6' },
    { bg: '#080303', mid: '#3A0A0A', hi: '#FF3B2F', ink: '#FFE3E0' },
  ],
  puzzle: [
    { bg: '#0B0A1A', mid: '#3B3B98', hi: '#FFD95A', ink: '#FFF9E2' },
    { bg: '#06120F', mid: '#1F6F5C', hi: '#FF9D7A', ink: '#F2FFF9' },
  ],
  strategy: [
    { bg: '#050C14', mid: '#1B4B6B', hi: '#F0C36A', ink: '#F4EEDD' },
    { bg: '#0D0B07', mid: '#5C4A1C', hi: '#9FE870', ink: '#F5F0DE' },
  ],
  casual: [
    { bg: '#140A1C', mid: '#E04F8B', hi: '#FFE66D', ink: '#FFF7FB' },
    { bg: '#051418', mid: '#1AA39A', hi: '#FFE9A8', ink: '#F0FFFD' },
  ],
  default: [
    { bg: '#08090D', mid: '#2B3350', hi: '#14F195', ink: '#EAFFF6' },
    { bg: '#0B0714', mid: '#4B2A8F', hi: '#9945FF', ink: '#F3EBFF' },
  ],
};

const GENRE_FAMILY: Record<string, Family> = {
  space: 'space', 'tower-defense': 'space',
  racing: 'racing', sports: 'racing', arcade: 'racing', runner: 'racing',
  rpg: 'rpg', 'souls-like': 'rpg', adventure: 'rpg', fighting: 'rpg',
  horror: 'horror', survival: 'horror',
  puzzle: 'puzzle', platformer: 'puzzle', roguelike: 'puzzle',
  strategy: 'strategy', tactics: 'strategy', card: 'strategy', simulation: 'strategy', sandbox: 'strategy',
  casual: 'casual', multiplayer: 'casual',
};

type Composition = 'horizon' | 'eclipse' | 'shards' | 'rings' | 'monolith' | 'waves' | 'peaks' | 'glyphs';
type Family = 'space' | 'racing' | 'rpg' | 'horror' | 'puzzle' | 'strategy' | 'casual' | 'default';
const FAMILY_COMPOSITIONS: Record<Family, Composition[]> = {
  space: ['rings', 'eclipse', 'glyphs'],
  racing: ['horizon', 'shards', 'peaks'],
  rpg: ['eclipse', 'monolith', 'peaks'],
  horror: ['monolith', 'waves', 'eclipse'],
  puzzle: ['rings', 'glyphs', 'shards'],
  strategy: ['monolith', 'peaks', 'glyphs'],
  casual: ['waves', 'glyphs', 'rings'],
  default: ['eclipse', 'shards', 'rings', 'peaks'],
};

/** Small seeded PRNG (mulberry32) so covers are stable per slug. */
const rng = (seedText: string) => {
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

export const coverStyle = (game: Pick<Game, 'slug' | 'genres'>) => {
  const family: Family = GENRE_FAMILY[game.genres.find((g) => GENRE_FAMILY[g]) ?? ''] ?? 'default';
  const r = rng(game.slug);
  const palettes = PALETTES[family];
  const comps = FAMILY_COMPOSITIONS[family];
  return { palette: palettes[Math.floor(r() * palettes.length)]!, composition: comps[Math.floor(r() * comps.length)]!, r };
};

type CoverProps = {
  game: Pick<Game, 'slug' | 'genres' | 'title' | 'thumbnailUrl' | 'bannerUrl'>;
  /** `portrait` 3:4 for cards, `wide` 16:9 for heroes. */
  variant?: 'portrait' | 'wide';
  showTitle?: boolean;
  className?: string;
};

export const GameCover = memo(({ game, variant = 'portrait', showTitle = true, className }: CoverProps) => {
  const uid = useId().replace(/:/g, '');
  const image = variant === 'wide' ? (game.bannerUrl ?? game.thumbnailUrl) : (game.thumbnailUrl ?? game.bannerUrl);
  if (image) {
    return <img src={image} alt="" loading="lazy" className={cn('h-full w-full object-cover', className)} />;
  }

  const { palette: c, composition, r } = coverStyle(game);
  const W = variant === 'wide' ? 1600 : 600;
  const H = 900;
  const cx = W * (0.35 + r() * 0.3);
  const cy = H * (0.3 + r() * 0.25);
  const rot = Math.floor(r() * 360);
  const pad = variant === 'wide' ? 80 : 40;
  // Condensed uppercase runs about 0.5em per glyph; shrink long titles to fit the width.
  const titleSize = Math.min(variant === 'wide' ? 128 : 84, (W - pad * 2) / (game.title.length * 0.5));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className={cn('h-full w-full', className)} role="img" aria-label={`${game.title} cover art`}>
      <defs>
        <radialGradient id={`glow-${uid}`} cx={cx / W} cy={cy / H} r="0.75">
          <stop offset="0" stopColor={c.hi} stopOpacity="0.55" />
          <stop offset="0.35" stopColor={c.mid} stopOpacity="0.75" />
          <stop offset="1" stopColor={c.bg} />
        </radialGradient>
        <linearGradient id={`fade-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.45" stopColor={c.bg} stopOpacity="0" />
          <stop offset="1" stopColor={c.bg} stopOpacity="0.95" />
        </linearGradient>
        <filter id={`grain-${uid}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={Math.floor(r() * 100)} />
          <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.09 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
        <filter id={`blur-${uid}`}>
          <feGaussianBlur stdDeviation="30" />
        </filter>
      </defs>

      <rect width={W} height={H} fill={c.bg} />
      <rect width={W} height={H} fill={`url(#glow-${uid})`} />

      {composition === 'horizon' && (
        <g>
          <circle cx={cx} cy={H * 0.52} r={H * 0.26} fill={c.hi} opacity="0.9" />
          {Array.from({ length: 7 }, (_, i) => (
            <rect key={i} x="0" y={H * 0.44 + i * i * 4.5 + i * 8} width={W} height={3 + i * 1.6} fill={c.bg} />
          ))}
          <rect y={H * 0.62} width={W} height={H * 0.38} fill={c.bg} />
          <g stroke={c.hi} strokeOpacity="0.55" strokeWidth="2">
            {Array.from({ length: 13 }, (_, i) => (
              <line key={`v${i}`} x1={cx} y1={H * 0.62} x2={cx + (i - 6) * W * 0.22} y2={H} />
            ))}
            {Array.from({ length: 8 }, (_, i) => {
              const y = H * 0.62 + Math.pow(i / 8, 1.8) * H * 0.38;
              return <line key={`h${i}`} x1="0" y1={y} x2={W} y2={y} />;
            })}
          </g>
        </g>
      )}

      {composition === 'eclipse' && (
        <g>
          <circle cx={cx} cy={cy} r={H * 0.3} fill={c.hi} filter={`url(#blur-${uid})`} opacity="0.8" />
          <circle cx={cx} cy={cy} r={H * 0.27} fill={c.hi} />
          <circle cx={cx + H * 0.05} cy={cy - H * 0.03} r={H * 0.265} fill={c.bg} />
          {Array.from({ length: 5 }, (_, i) => (
            <path
              key={i}
              d={`M0 ${H * (0.7 + i * 0.07)} Q ${W * 0.3} ${H * (0.6 + i * 0.06 - r() * 0.1)} ${W * 0.55} ${H * (0.72 + i * 0.05)} T ${W} ${H * (0.66 + i * 0.07)} V ${H} H 0 Z`}
              fill={c.mid}
              opacity={0.35 + i * 0.13}
            />
          ))}
        </g>
      )}

      {composition === 'shards' && (
        <g transform={`rotate(${(rot % 40) - 20} ${cx} ${cy})`}>
          {Array.from({ length: 9 }, (_, i) => {
            const x = cx + (r() - 0.5) * W * 0.9;
            const y = cy + (r() - 0.5) * H * 0.9;
            const s = 60 + r() * 220;
            return (
              <polygon
                key={i}
                points={`${x},${y - s} ${x + s * 0.35},${y} ${x},${y + s * 1.4} ${x - s * 0.3},${y}`}
                fill={i % 3 === 0 ? c.hi : c.mid}
                opacity={i % 3 === 0 ? 0.9 : 0.55}
              />
            );
          })}
          <line x1={-W} y1={cy} x2={W * 2} y2={cy} stroke={c.ink} strokeOpacity="0.5" strokeWidth="2" />
        </g>
      )}

      {composition === 'rings' && (
        <g fill="none">
          {Array.from({ length: 9 }, (_, i) => (
            <ellipse
              key={i}
              cx={cx}
              cy={cy}
              rx={80 + i * 58}
              ry={(80 + i * 58) * 0.38}
              stroke={i % 3 === 0 ? c.hi : c.ink}
              strokeOpacity={i % 3 === 0 ? 0.9 : 0.22}
              strokeWidth={i % 3 === 0 ? 3 : 1.5}
              transform={`rotate(${-18 + (rot % 12)} ${cx} ${cy})`}
            />
          ))}
          <circle cx={cx} cy={cy} r="70" fill={c.hi} />
          <circle cx={cx - 18} cy={cy - 20} r="70" fill={c.mid} opacity="0.55" />
          {Array.from({ length: 40 }, (_, i) => (
            <circle key={`s${i}`} cx={r() * W} cy={r() * H} r={r() * 2.2} fill={c.ink} opacity={0.3 + r() * 0.6} />
          ))}
        </g>
      )}

      {composition === 'monolith' && (
        <g>
          {Array.from({ length: 6 }, (_, i) => {
            const w = 50 + r() * 120;
            const x = (i / 6) * W + r() * 60;
            const h = H * (0.35 + r() * 0.5);
            return <rect key={i} x={x} y={H - h} width={w} height={h} fill={c.bg} opacity={0.55 + i * 0.07} />;
          })}
          <rect x={cx - 40} y={H * 0.18} width="80" height={H * 0.82} fill={c.hi} />
          <rect x={cx - 40} y={H * 0.18} width="80" height={H * 0.82} fill={c.hi} filter={`url(#blur-${uid})`} opacity="0.7" />
          <rect x="0" y={H * 0.86} width={W} height={H * 0.14} fill={c.bg} />
        </g>
      )}

      {composition === 'waves' && (
        <g fill="none" strokeWidth="3">
          {Array.from({ length: 16 }, (_, i) => {
            const y = H * 0.2 + i * (H * 0.05);
            const a = 40 + r() * 60;
            return (
              <path
                key={i}
                d={`M -50 ${y} C ${W * 0.25} ${y - a}, ${W * 0.5} ${y + a}, ${W * 0.75} ${y - a * 0.5} S ${W + 50} ${y + a * 0.4}, ${W + 50} ${y}`}
                stroke={i % 4 === 0 ? c.hi : c.ink}
                strokeOpacity={i % 4 === 0 ? 0.95 : 0.18}
              />
            );
          })}
          <circle cx={cx} cy={cy} r={H * 0.12} fill={c.hi} opacity="0.9" />
        </g>
      )}

      {composition === 'peaks' && (
        <g>
          <circle cx={cx} cy={H * 0.3} r={H * 0.13} fill={c.hi} />
          <circle cx={cx} cy={H * 0.3} r={H * 0.16} fill={c.hi} opacity="0.35" filter={`url(#blur-${uid})`} />
          {Array.from({ length: 5 }, (_, i) => {
            const base = H * (0.5 + i * 0.1);
            const pts = Array.from({ length: 9 }, (_, k) => `${(k / 8) * W},${base - r() * H * (0.22 - i * 0.03)}`).join(' L ');
            return <path key={i} d={`M 0 ${H} L ${pts} L ${W} ${H} Z`} fill={i === 4 ? c.bg : c.mid} opacity={0.3 + i * 0.16} />;
          })}
        </g>
      )}

      {composition === 'glyphs' && (
        <g fill="none" strokeWidth="10" strokeLinejoin="round">
          {(() => {
            const s = W * (variant === 'wide' ? 0.1 : 0.2);
            const gx = W * 0.5;
            const gy = H * 0.42;
            const filled = Math.floor(r() * 4);
            const glyphs = [
              <polygon key="t" points={`${gx},${gy - s * 1.3} ${gx + s * 0.75},${gy - s * 0.1} ${gx - s * 0.75},${gy - s * 0.1}`} />,
              <circle key="o" cx={gx + s * 1.25} cy={gy + s * 0.55} r={s * 0.55} />,
              <path key="x" d={`M ${gx - s * 1.7} ${gy + s * 0.05} l ${s} ${s} m 0 ${-s} l ${-s} ${s}`} />,
              <rect key="s" x={gx - s * 0.5} y={gy + s * 0.7} width={s} height={s} rx="6" />,
            ];
            return glyphs.map((g, i) => (
              <g key={i} stroke={i === filled ? c.hi : c.ink} strokeOpacity={i === filled ? 1 : 0.35} fill={i === filled ? c.hi : 'none'} fillOpacity={i === filled ? 0.9 : 0} transform={`rotate(${(rot % 30) - 15} ${gx} ${gy})`}>
                {g}
              </g>
            ));
          })()}
        </g>
      )}

      <rect width={W} height={H} fill={`url(#fade-${uid})`} />
      <rect width={W} height={H} filter={`url(#grain-${uid})`} />

      {showTitle && (
        <text
          x={pad}
          y={H - (variant === 'wide' ? 90 : 56)}
          fill={c.ink}
          fontSize={titleSize}
          fontWeight="700"
          letterSpacing="-0.02em"
          // CSS variables don't resolve in SVG presentation attributes, so font goes in style.
          style={{ fontFamily: 'var(--font-display)', fontVariationSettings: "'wdth' 78, 'opsz' 96", textTransform: 'uppercase' }}
        >
          {game.title}
        </text>
      )}
    </svg>
  );
});
GameCover.displayName = 'GameCover';
