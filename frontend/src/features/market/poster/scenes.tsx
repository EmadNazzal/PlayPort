import type { ReactNode } from 'react';

export type Palette = {
  skyTop: string;
  skyBottom: string;
  /** Sun / moon / portal — also the backlight and rim colour. */
  light: string;
  far: string;
  mid: string;
  /** Ground and the hero silhouette. */
  near: string;
  ink: string;
};

export type EnvName =
  | 'ruins'
  | 'city'
  | 'space'
  | 'ocean'
  | 'wave'
  | 'underwater'
  | 'festival'
  | 'forest'
  | 'meadow'
  | 'workshop'
  | 'arena'
  | 'void'
  | 'mountains'
  | 'storm'
  | 'dust';

export type SceneCtx = { W: number; H: number; p: Palette; r: () => number; uid: string; wide: boolean };
export type Scene = { back: ReactNode; front?: ReactNode; groundY: number; lightAt: { x: number; y: number; r: number } };

/** A jagged, softly curved ridgeline closed to the bottom edge. */
const ridge = (ctx: SceneCtx, baseY: number, amp: number, n: number) => {
  const { W, H, r } = ctx;
  const pts = Array.from({ length: n + 1 }, (_, i) => [(i / n) * W, baseY - r() * amp] as const);
  let d = `M 0 ${H} L ${pts[0]![0]} ${pts[0]![1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]!;
    const [x1, y1] = pts[i]!;
    d += ` Q ${(x0 + x1) / 2 + (r() - 0.5) * 30} ${Math.min(y0, y1) - r() * amp * 0.4} ${x1} ${y1}`;
  }
  return `${d} L ${W} ${H} Z`;
};

const gear = (cx: number, cy: number, radius: number, teeth: number) => {
  const pts: string[] = [];
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const rr = i % 2 === 0 ? radius : radius * 0.84;
    const a2 = a + Math.PI / teeth;
    pts.push(`${cx + Math.cos(a) * rr},${cy + Math.sin(a) * rr}`, `${cx + Math.cos(a2 - 0.08) * rr},${cy + Math.sin(a2 - 0.08) * rr}`);
  }
  return `M ${pts.join(' L ')} Z`;
};

const Sky = ({ ctx }: { ctx: SceneCtx }) => (
  <>
    <defs>
      <linearGradient id={`sky-${ctx.uid}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={ctx.p.skyTop} />
        <stop offset="1" stopColor={ctx.p.skyBottom} />
      </linearGradient>
    </defs>
    <rect width={ctx.W} height={ctx.H} fill={`url(#sky-${ctx.uid})`} />
  </>
);

const Disc = ({ ctx, x, y, r, crescent }: { ctx: SceneCtx; x: number; y: number; r: number; crescent?: boolean }) => (
  <g>
    <circle cx={x} cy={y} r={r * 2.4} fill={ctx.p.light} opacity="0.16" filter={`url(#soft-${ctx.uid})`} />
    <circle cx={x} cy={y} r={r} fill={ctx.p.light} />
    {crescent && <circle cx={x + r * 0.28} cy={y - r * 0.12} r={r * 0.94} fill={ctx.p.skyTop} />}
  </g>
);

const Stars = ({ ctx, n, maxY }: { ctx: SceneCtx; n: number; maxY: number }) => (
  <g fill={ctx.p.ink}>
    {Array.from({ length: n }, (_, i) => (
      <circle key={i} cx={ctx.r() * ctx.W} cy={ctx.r() * maxY} r={ctx.r() * 1.8 + 0.3} opacity={0.25 + ctx.r() * 0.7} />
    ))}
  </g>
);

const Mist = ({ ctx, y, opacity = 0.35 }: { ctx: SceneCtx; y: number; opacity?: number }) => (
  <rect x={-ctx.W * 0.1} y={y - 60} width={ctx.W * 1.2} height="120" fill={ctx.p.skyBottom} opacity={opacity} filter={`url(#soft-${ctx.uid})`} />
);

const envs: Record<EnvName, (ctx: SceneCtx) => Scene> = {
  // `dust` is defined below the map.
  dust: () => ({ back: null, groundY: 0, lightAt: { x: 0, y: 0, r: 0 } }),
  ruins: (ctx) => {
    const { W, H, p, r } = ctx;
    const g = H * 0.74;
    const lx = W * (ctx.wide ? 0.66 : 0.5);
    const towers = Array.from({ length: ctx.wide ? 9 : 5 }, (_, i) => {
      const w = 40 + r() * 50;
      const x = (i / (ctx.wide ? 9 : 5)) * W + r() * 40;
      const h = 120 + r() * 200;
      const broken = r() > 0.5;
      return (
        <g key={i}>
          <rect x={x} y={g - 40 - h} width={w} height={h + 40} />
          {!broken && Array.from({ length: 3 }, (_, k) => <rect key={k} x={x + k * (w / 3)} y={g - 40 - h - 14} width={w / 5} height="14" />)}
          {broken && <path d={`M ${x} ${g - 40 - h} L ${x + w * 0.4} ${g - 60 - h} L ${x + w} ${g - 30 - h} Z`} />}
          <rect x={x + w * 0.35} y={g - h} width={w * 0.3} height={h * 0.3} rx={w * 0.15} fill={p.light} opacity="0.35" />
        </g>
      );
    });
    return {
      groundY: g,
      lightAt: { x: lx, y: H * 0.36, r: H * 0.16 },
      back: (
        <>
          <Sky ctx={ctx} />
          <Disc ctx={ctx} x={lx} y={H * 0.36} r={H * 0.16} crescent />
          <path d={ridge(ctx, H * 0.58, 90, 7)} fill={p.far} opacity="0.8" />
          <g fill={p.mid}>{towers}</g>
          <Mist ctx={ctx} y={g - 30} />
          <path d={`M 0 ${H} L 0 ${g + 30} Q ${W * 0.3} ${g - 10} ${W * 0.5} ${g} Q ${W * 0.75} ${g + 8} ${W} ${g + 40} L ${W} ${H} Z`} fill={p.near} />
        </>
      ),
    };
  },

  city: (ctx) => {
    const { W, H, p, r } = ctx;
    // Portrait posters raise the road so the car clears the title block.
    const g = H * (ctx.wide ? 0.8 : 0.66);
    // Separate towers with gaps, antennas and lit windows; the road is lighter than the car so
    // the rim-lit silhouette reads against it.
    const layer = (n: number, base: number, maxH: number, fill: string, windows: boolean) => {
      let x = -20;
      const out = [];
      for (let i = 0; x < W && i < n * 3; i++) {
        const w = 36 + r() * (W / n);
        const h = maxH * (0.35 + r() * 0.65);
        out.push(
          <g key={i}>
            <rect x={x} y={base - h} width={w} height={h + H} fill={fill} />
            {r() > 0.6 && <rect x={x + w * 0.45} y={base - h - 40} width="3" height="40" fill={fill} />}
            {windows &&
              Array.from({ length: Math.floor(h / 24) }, (_, k) =>
                Array.from({ length: Math.floor(w / 18) }, (_, c) =>
                  r() > 0.7 ? <rect key={`${k}-${c}`} x={x + 6 + c * 18} y={base - h + 12 + k * 24} width="7" height="10" fill={r() > 0.4 ? p.light : p.ink} opacity={0.4 + r() * 0.6} /> : null,
                ),
              )}
          </g>,
        );
        x += w + 6 + r() * 18;
      }
      return out;
    };
    return {
      groundY: g,
      lightAt: { x: W * 0.5, y: H * 0.3, r: H * 0.12 },
      back: (
        <>
          <Sky ctx={ctx} />
          <Disc ctx={ctx} x={W * (ctx.wide ? 0.7 : 0.5)} y={H * 0.28} r={H * 0.12} />
          {layer(ctx.wide ? 14 : 7, g - H * 0.2, H * 0.3, p.far, false)}
          <Mist ctx={ctx} y={g - H * 0.2} opacity={0.3} />
          {layer(ctx.wide ? 11 : 5, g - H * 0.1, H * 0.3, p.mid, true)}
          <rect y={g - 22} width={W} height={H - g + 22} fill={p.far} />
          <rect y={g - 22} width={W} height="4" fill={p.light} opacity="0.7" />
          <g stroke={p.light} strokeWidth="3">
            {Array.from({ length: 7 }, (_, i) => (
              <line key={i} x1={W * 0.5} y1={g - 18} x2={W * 0.5 + (i - 3) * W * 0.34} y2={H} strokeOpacity={i === 3 ? 0 : 0.35} />
            ))}
          </g>
          <line x1={W * 0.5} y1={g - 12} x2={W * 0.5} y2={H} stroke={p.ink} strokeWidth="6" strokeDasharray="24 36" opacity="0.5" />
        </>
      ),
      front: (
        <g stroke={p.ink} strokeWidth="1.5" opacity="0.3">
          {Array.from({ length: 70 }, (_, i) => {
            const x = r() * W;
            const y = r() * H;
            return <line key={i} x1={x} y1={y} x2={x - 10} y2={y + 34} />;
          })}
        </g>
      ),
    };
  },

  space: (ctx) => {
    const { W, H, p, r } = ctx;
    const px = W * (ctx.wide ? 0.2 : 0.78);
    return {
      groundY: H * 0.62,
      lightAt: { x: W * 0.5, y: H * 0.42, r: H * 0.1 },
      back: (
        <>
          <Sky ctx={ctx} />
          <ellipse cx={W * 0.3} cy={H * 0.3} rx={W * 0.5} ry={H * 0.16} fill={p.mid} opacity="0.55" filter={`url(#soft-${ctx.uid})`} transform={`rotate(-20 ${W * 0.3} ${H * 0.3})`} />
          <ellipse cx={W * 0.7} cy={H * 0.5} rx={W * 0.4} ry={H * 0.1} fill={p.light} opacity="0.18" filter={`url(#soft-${ctx.uid})`} transform={`rotate(15 ${W * 0.7} ${H * 0.5})`} />
          <Stars ctx={ctx} n={ctx.wide ? 180 : 90} maxY={H} />
          <circle cx={px} cy={H * 0.86} r={H * 0.3} fill={p.far} />
          <circle cx={px - H * 0.06} cy={H * 0.82} r={H * 0.3} fill={p.mid} opacity="0.6" />
          <ellipse cx={px} cy={H * 0.84} rx={H * 0.5} ry={H * 0.07} fill="none" stroke={p.light} strokeWidth="5" opacity="0.6" transform={`rotate(-12 ${px} ${H * 0.84})`} />
          {Array.from({ length: 6 }, (_, i) => {
            const x = r() * W;
            const y = H * (0.1 + r() * 0.5);
            const s = 8 + r() * 22;
            return <path key={i} d={`M ${x} ${y - s} L ${x + s} ${y - s * 0.2} L ${x + s * 0.6} ${y + s} L ${x - s * 0.8} ${y + s * 0.5} Z`} fill={p.near} />;
          })}
        </>
      ),
    };
  },

  ocean: (ctx) => {
    const { W, H, p, r } = ctx;
    const hz = H * 0.6;
    const sx = W * (ctx.wide ? 0.72 : 0.5);
    return {
      groundY: H * 0.8,
      lightAt: { x: sx, y: hz, r: H * 0.18 },
      back: (
        <>
          <Sky ctx={ctx} />
          <Disc ctx={ctx} x={sx} y={hz} r={H * 0.18} />
          <path d={ridge(ctx, hz, 30, 5)} fill={p.far} opacity="0.7" />
          <rect y={hz} width={W} height={H - hz} fill={p.mid} />
          <g fill={p.light}>
            {Array.from({ length: 22 }, (_, i) => {
              const y = hz + 8 + i * i * 0.9;
              const w = (40 + r() * 120) * (1 + i * 0.08);
              return <rect key={i} x={sx - w / 2 + (r() - 0.5) * 60} y={y} width={w} height={2 + i * 0.3} opacity={0.7 - i * 0.025} />;
            })}
          </g>
        </>
      ),
      front: <path d={`M 0 ${H} L 0 ${H * 0.86} Q ${W * 0.25} ${H * 0.8} ${W * 0.5} ${H * 0.86} T ${W} ${H * 0.84} L ${W} ${H} Z`} fill={p.near} />,
    };
  },

  wave: (ctx) => {
    const { W, H, p } = ctx;
    return {
      groundY: H * 0.66,
      lightAt: { x: W * 0.62, y: H * 0.28, r: H * 0.1 },
      back: (
        <>
          <Sky ctx={ctx} />
          <Disc ctx={ctx} x={W * 0.7} y={H * 0.26} r={H * 0.09} />
          <path d={`M 0 ${H * 0.62} C ${W * 0.2} ${H * 0.2} ${W * 0.62} ${H * 0.12} ${W * 0.86} ${H * 0.34} C ${W * 0.7} ${H * 0.3} ${W * 0.6} ${H * 0.4} ${W * 0.66} ${H * 0.5} C ${W * 0.8} ${H * 0.58} ${W} ${H * 0.6} ${W} ${H * 0.6} L ${W} ${H} L 0 ${H} Z`} fill={p.mid} />
          <path d={`M ${W * 0.1} ${H * 0.5} C ${W * 0.3} ${H * 0.22} ${W * 0.62} ${H * 0.16} ${W * 0.84} ${H * 0.34}`} fill="none" stroke={p.ink} strokeWidth="10" strokeLinecap="round" opacity="0.8" />
          <path d={`M ${W * 0.2} ${H * 0.56} C ${W * 0.35} ${H * 0.36} ${W * 0.55} ${H * 0.3} ${W * 0.7} ${H * 0.42}`} fill="none" stroke={p.light} strokeWidth="4" opacity="0.5" />
          <rect y={H * 0.7} width={W} height={H * 0.3} fill={p.near} />
        </>
      ),
    };
  },

  underwater: (ctx) => {
    const { W, H, p, r } = ctx;
    return {
      groundY: H * 0.66,
      lightAt: { x: W * 0.5, y: H * 0.05, r: H * 0.1 },
      back: (
        <>
          <Sky ctx={ctx} />
          <g fill={p.light} opacity="0.1" filter={`url(#soft-${ctx.uid})`}>
            {Array.from({ length: 5 }, (_, i) => {
              const x = W * (0.1 + i * 0.2 + (r() - 0.5) * 0.1);
              return <path key={i} d={`M ${x - 20} 0 L ${x + 20} 0 L ${x + 140} ${H} L ${x - 60} ${H} Z`} />;
            })}
          </g>
          <ellipse cx={W * 0.72} cy={H * 0.36} rx={W * 0.12} ry={H * 0.035} fill={p.light} opacity="0.5" filter={`url(#soft-${ctx.uid})`} />
          <ellipse cx={W * 0.72} cy={H * 0.36} rx={W * 0.05} ry={H * 0.018} fill={p.light} opacity="0.9" />
          <ellipse cx={W * 0.72} cy={H * 0.36} rx={W * 0.012} ry={H * 0.017} fill={p.skyTop} />
          <path d={ridge(ctx, H * 0.82, 120, 6)} fill={p.far} />
          <g fill="none" stroke={p.mid} strokeWidth="14" strokeLinecap="round">
            {Array.from({ length: ctx.wide ? 10 : 5 }, (_, i) => {
              const x = r() * W;
              return <path key={i} d={`M ${x} ${H} C ${x - 40} ${H * 0.8} ${x + 40} ${H * 0.7} ${x - 10} ${H * (0.45 + r() * 0.2)}`} />;
            })}
          </g>
          <path d={ridge(ctx, H * 0.92, 60, 5)} fill={p.near} />
        </>
      ),
      front: (
        <g fill="none" stroke={p.ink} strokeWidth="2" opacity="0.45">
          {Array.from({ length: 26 }, (_, i) => (
            <circle key={i} cx={W * (0.45 + r() * 0.2)} cy={H * (0.05 + r() * 0.5)} r={2 + r() * 7} />
          ))}
        </g>
      ),
    };
  },

  festival: (ctx) => {
    const { W, H, p, r } = ctx;
    const g = H * 0.78;
    const roof = (x: number, y: number, w: number) => `M ${x - w * 0.62} ${y} Q ${x - w * 0.3} ${y - 10} ${x - w * 0.2} ${y - 46} L ${x + w * 0.2} ${y - 46} Q ${x + w * 0.3} ${y - 10} ${x + w * 0.62} ${y} Z`;
    return {
      groundY: g,
      lightAt: { x: W * 0.5, y: H * 0.34, r: H * 0.1 },
      back: (
        <>
          <Sky ctx={ctx} />
          <Stars ctx={ctx} n={50} maxY={H * 0.5} />
          <Disc ctx={ctx} x={W * (ctx.wide ? 0.78 : 0.72)} y={H * 0.2} r={H * 0.07} />
          <g fill={p.far}>
            {Array.from({ length: ctx.wide ? 7 : 4 }, (_, i) => {
              const x = (i + 0.5) * (W / (ctx.wide ? 7 : 4));
              const y = H * (0.62 + r() * 0.06);
              return (
                <g key={i}>
                  <path d={roof(x, y, 150)} />
                  <rect x={x - 50} y={y} width="100" height="70" />
                  <path d={roof(x, y + 70, 180)} />
                  <rect x={x - 70} y={y + 70} width="140" height={H} />
                </g>
              );
            })}
          </g>
          <path d={`M 0 ${g} L ${W} ${g - 30} L ${W} ${H} L 0 ${H} Z`} fill={p.near} />
        </>
      ),
      front: (
        <g>
          {Array.from({ length: ctx.wide ? 40 : 22 }, (_, i) => {
            const x = r() * W;
            const y = H * (0.08 + r() * 0.6);
            const s = 6 + r() * 12;
            return (
              <g key={i} opacity={0.5 + r() * 0.5}>
                <rect x={x - s} y={y - s * 1.3} width={s * 2} height={s * 2.4} rx={s * 0.8} fill={p.light} filter={`url(#glow-${ctx.uid})`} />
              </g>
            );
          })}
        </g>
      ),
    };
  },

  forest: (ctx) => {
    const { W, H, p, r } = ctx;
    const g = H * 0.78;
    const tx = W * (ctx.wide ? 0.66 : 0.5);
    return {
      groundY: g,
      lightAt: { x: tx, y: H * 0.34, r: H * 0.13 },
      back: (
        <>
          <Sky ctx={ctx} />
          <Disc ctx={ctx} x={tx} y={H * 0.3} r={H * 0.13} />
          {[p.far, p.mid].map((fill, layer) => (
            <g key={layer} fill={fill}>
              {Array.from({ length: ctx.wide ? 30 : 14 }, (_, i) => {
                const x = r() * W;
                const w = 10 + r() * (layer ? 26 : 14);
                return <rect key={i} x={x} y={0} width={w} height={H} opacity={layer ? 1 : 0.7} />;
              })}
            </g>
          ))}
          <Mist ctx={ctx} y={H * 0.6} opacity={0.5} />
          <g fill={p.near}>
            <rect x={tx - 150} y={g - 330} width="22" height="330" />
            <rect x={tx + 128} y={g - 330} width="22" height="330" />
            <path d={`M ${tx - 200} ${g - 350} Q ${tx} ${g - 372} ${tx + 200} ${g - 350} L ${tx + 190} ${g - 324} Q ${tx} ${g - 340} ${tx - 190} ${g - 324} Z`} />
            <rect x={tx - 170} y={g - 300} width="340" height="16" />
          </g>
          <path d={`M 0 ${g} Q ${W * 0.5} ${g - 16} ${W} ${g} L ${W} ${H} L 0 ${H} Z`} fill={p.near} />
        </>
      ),
    };
  },

  meadow: (ctx) => {
    const { W, H, p, r } = ctx;
    const cloud = (x: number, y: number, s: number) => (
      <g fill={p.ink} opacity="0.95">
        <circle cx={x} cy={y} r={30 * s} />
        <circle cx={x + 34 * s} cy={y - 14 * s} r={38 * s} />
        <circle cx={x + 74 * s} cy={y} r={30 * s} />
        <rect x={x} y={y} width={74 * s} height={30 * s} />
      </g>
    );
    return {
      groundY: H * 0.72,
      lightAt: { x: W * 0.5, y: H * 0.4, r: H * 0.1 },
      back: (
        <>
          <Sky ctx={ctx} />
          <Disc ctx={ctx} x={W * 0.78} y={H * 0.16} r={H * 0.07} />
          {cloud(W * 0.08, H * 0.2, 0.9)}
          {cloud(W * 0.6, H * 0.34, 0.6)}
          {ctx.wide && cloud(W * 0.3, H * 0.12, 0.7)}
          <ellipse cx={W * 0.2} cy={H * 0.84} rx={W * 0.6} ry={H * 0.24} fill={p.far} />
          <ellipse cx={W * 0.85} cy={H * 0.9} rx={W * 0.6} ry={H * 0.24} fill={p.mid} />
          <g fill={p.light}>
            {Array.from({ length: 40 }, (_, i) => (
              <circle key={i} cx={r() * W} cy={H * (0.76 + r() * 0.22)} r={3 + r() * 3} />
            ))}
          </g>
        </>
      ),
    };
  },

  workshop: (ctx) => {
    const { W, H, p, r } = ctx;
    return {
      groundY: H * 0.76,
      lightAt: { x: W * 0.5, y: H * 0.4, r: H * 0.16 },
      back: (
        <>
          <Sky ctx={ctx} />
          <circle cx={W * 0.5} cy={H * 0.36} r={H * 0.24} fill={p.light} opacity="0.2" filter={`url(#soft-${ctx.uid})`} />
          <g fill="none" stroke={p.light} strokeWidth="4" opacity="0.5">
            <circle cx={W * 0.5} cy={H * 0.36} r={H * 0.22} />
            {Array.from({ length: 12 }, (_, i) => {
              const a = (i / 12) * Math.PI * 2;
              return <line key={i} x1={W * 0.5 + Math.cos(a) * H * 0.19} y1={H * 0.36 + Math.sin(a) * H * 0.19} x2={W * 0.5 + Math.cos(a) * H * 0.215} y2={H * 0.36 + Math.sin(a) * H * 0.215} />;
            })}
            <line x1={W * 0.5} y1={H * 0.36} x2={W * 0.5} y2={H * 0.2} strokeWidth="8" />
            <line x1={W * 0.5} y1={H * 0.36} x2={W * 0.6} y2={H * 0.4} strokeWidth="8" />
          </g>
          <path d={gear(W * 0.12, H * 0.2, H * 0.16, 12)} fill={p.far} />
          <path d={gear(W * 0.92, H * 0.5, H * 0.2, 14)} fill={p.far} />
          <path d={gear(W * 0.18 + r() * 20, H * 0.62, H * 0.12, 10)} fill={p.mid} />
          <path d={gear(W * 0.8, H * 0.14, H * 0.1, 9)} fill={p.mid} />
          <rect y={H * 0.76} width={W} height={H * 0.24} fill={p.near} />
        </>
      ),
    };
  },

  arena: (ctx) => {
    const { W, H, p } = ctx;
    const g = H * 0.78;
    const arches = ctx.wide ? 16 : 8;
    return {
      groundY: g,
      lightAt: { x: W * 0.5, y: H * 0.45, r: H * 0.1 },
      back: (
        <>
          <Sky ctx={ctx} />
          <g fill={p.light} opacity="0.14" filter={`url(#soft-${ctx.uid})`}>
            <path d={`M ${W * 0.05} 0 L ${W * 0.2} 0 L ${W * 0.56} ${g} L ${W * 0.42} ${g} Z`} />
            <path d={`M ${W * 0.8} 0 L ${W * 0.95} 0 L ${W * 0.6} ${g} L ${W * 0.46} ${g} Z`} />
          </g>
          <g fill={p.far}>
            <rect y={H * 0.44} width={W} height={H * 0.36} />
          </g>
          <g fill={p.skyBottom} opacity="0.9">
            {[0, 1].map((row) =>
              Array.from({ length: arches }, (_, i) => {
                const w = W / arches;
                const x = i * w + w * 0.18;
                const y = H * (0.48 + row * 0.14);
                return <path key={`${row}-${i}`} d={`M ${x} ${y + H * 0.1} L ${x} ${y + 20} Q ${x + w * 0.32} ${y - 10} ${x + w * 0.64} ${y + 20} L ${x + w * 0.64} ${y + H * 0.1} Z`} />;
              }),
            )}
          </g>
          <rect y={g} width={W} height={H - g} fill={p.near} />
        </>
      ),
    };
  },

  void: (ctx) => {
    const { W, H, p, r } = ctx;
    const cx = W * (ctx.wide ? 0.66 : 0.5);
    return {
      groundY: H * 0.72,
      lightAt: { x: cx, y: H * 0.36, r: H * 0.2 },
      back: (
        <>
          <Sky ctx={ctx} />
          <Stars ctx={ctx} n={60} maxY={H} />
          <circle cx={cx} cy={H * 0.36} r={H * 0.26} fill={p.light} opacity="0.12" filter={`url(#soft-${ctx.uid})`} />
          <circle cx={cx} cy={H * 0.36} r={H * 0.2} fill="none" stroke={p.light} strokeWidth="6" opacity="0.8" />
          <circle cx={cx} cy={H * 0.36} r={H * 0.23} fill="none" stroke={p.light} strokeWidth="1.5" strokeDasharray="4 12" opacity="0.6" />
          <g fill="none" stroke={p.mid} strokeWidth="5" strokeLinecap="round" opacity="0.8">
            {Array.from({ length: 10 }, (_, i) => {
              const x = r() * W;
              const y = r() * H * 0.7;
              const s = 14 + r() * 20;
              return <path key={i} d={`M ${x} ${y - s} L ${x} ${y + s} M ${x - s * 0.7} ${y - s * 0.3} L ${x + s * 0.7} ${y + s * 0.4}`} />;
            })}
          </g>
          <path d={ridge(ctx, H * 0.74, 40, 6)} fill={p.near} />
        </>
      ),
    };
  },

  mountains: (ctx) => {
    const { W, H, p } = ctx;
    const sx = W * (ctx.wide ? 0.68 : 0.52);
    return {
      groundY: H * 0.76,
      lightAt: { x: sx, y: H * 0.38, r: H * 0.15 },
      back: (
        <>
          <Sky ctx={ctx} />
          <Disc ctx={ctx} x={sx} y={H * 0.38} r={H * 0.15} />
          <path d={ridge(ctx, H * 0.5, 120, 6)} fill={p.far} opacity="0.55" />
          <path d={ridge(ctx, H * 0.6, 100, 7)} fill={p.far} />
          <Mist ctx={ctx} y={H * 0.66} opacity={0.4} />
          <path d={ridge(ctx, H * 0.7, 60, 8)} fill={p.mid} />
          <path d={`M 0 ${H} L 0 ${H * 0.78} Q ${W * 0.5} ${H * 0.74} ${W} ${H * 0.8} L ${W} ${H} Z`} fill={p.near} />
        </>
      ),
      front: (
        <g fill={p.near}>
          <path d={`M ${W} ${H * 0.02} C ${W * 0.8} ${H * 0.06} ${W * 0.7} ${H * 0.1} ${W * 0.55} ${H * 0.08} L ${W * 0.56} ${H * 0.1} C ${W * 0.72} ${H * 0.13} ${W * 0.85} ${H * 0.1} ${W} ${H * 0.08} Z`} />
          {Array.from({ length: 16 }, (_, i) => (
            <circle key={i} cx={W * (0.55 + (i / 16) * 0.45)} cy={H * (0.07 + ((i * 7) % 5) * 0.012)} r={12 + (i % 3) * 5} fill={p.light} opacity="0.55" />
          ))}
        </g>
      ),
    };
  },

  storm: (ctx) => {
    const { W, H, p, r } = ctx;
    const hz = H * 0.66;
    const bx = W * (0.2 + r() * 0.2);
    return {
      groundY: H * 0.78,
      lightAt: { x: bx, y: H * 0.2, r: H * 0.08 },
      back: (
        <>
          <Sky ctx={ctx} />
          <g fill={p.far} opacity="0.9">
            {Array.from({ length: 8 }, (_, i) => (
              <ellipse key={i} cx={r() * W} cy={H * (0.1 + r() * 0.25)} rx={W * (0.2 + r() * 0.2)} ry={H * 0.06} filter={`url(#soft-${ctx.uid})`} />
            ))}
          </g>
          <path d={`M ${bx} 0 L ${bx + 30} ${H * 0.2} L ${bx + 6} ${H * 0.22} L ${bx + 44} ${H * 0.48} L ${bx - 4} ${H * 0.26} L ${bx + 18} ${H * 0.24} Z`} fill={p.light} filter={`url(#glow-${ctx.uid})`} />
          <rect y={hz} width={W} height={H - hz} fill={p.mid} />
          <Mist ctx={ctx} y={hz} opacity={0.6} />
        </>
      ),
      front: (
        <path d={`M 0 ${H} L 0 ${H * 0.84} Q ${W * 0.2} ${H * 0.76} ${W * 0.4} ${H * 0.84} T ${W * 0.8} ${H * 0.82} T ${W} ${H * 0.8} L ${W} ${H} Z`} fill={p.near} />
      ),
    };
  },
};

/** Sun-baked compound: arches, crates, heat haze. */
envs.dust = (ctx) => {
  const { W, H, p, r } = ctx;
  const g = H * 0.76;
  const walls = Array.from({ length: ctx.wide ? 7 : 4 }, (_, i) => {
    const w = W / (ctx.wide ? 7 : 4);
    const x = i * w;
    const h = H * (0.2 + r() * 0.14);
    return (
      <g key={i}>
        <rect x={x} y={g - h - 60} width={w + 2} height={h + 60} fill={i % 2 ? p.far : p.mid} />
        <path d={`M ${x + w * 0.3} ${g - 60} L ${x + w * 0.3} ${g - h * 0.55 - 60} Q ${x + w * 0.5} ${g - h * 0.8 - 60} ${x + w * 0.7} ${g - h * 0.55 - 60} L ${x + w * 0.7} ${g - 60} Z`} fill={p.skyBottom} opacity="0.85" />
        <rect x={x + w * 0.08} y={g - h - 40} width={w * 0.12} height={h * 0.2} fill={p.near} opacity="0.5" />
      </g>
    );
  });
  return {
    groundY: g,
    lightAt: { x: W * 0.62, y: H * 0.22, r: H * 0.1 },
    back: (
      <>
        <defs>
          <linearGradient id={`sky-${ctx.uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={p.skyTop} />
            <stop offset="1" stopColor={p.skyBottom} />
          </linearGradient>
        </defs>
        <rect width={W} height={H} fill={`url(#sky-${ctx.uid})`} />
        <circle cx={W * (ctx.wide ? 0.78 : 0.66)} cy={H * 0.2} r={H * 0.09} fill={p.light} />
        <circle cx={W * (ctx.wide ? 0.78 : 0.66)} cy={H * 0.2} r={H * 0.22} fill={p.light} opacity="0.18" filter={`url(#soft-${ctx.uid})`} />
        {walls}
        <rect x={-W * 0.1} y={g - 140} width={W * 1.2} height="160" fill={p.skyBottom} opacity="0.35" filter={`url(#soft-${ctx.uid})`} />
        <rect y={g - 60} width={W} height={H} fill={p.near} />
        <g fill={p.mid}>
          <rect x={W * 0.06} y={g - 130} width="90" height="80" />
          <rect x={W * 0.06 + 20} y={g - 180} width="60" height="50" />
          <rect x={W * 0.8} y={g - 110} width="80" height="60" />
        </g>
      </>
    ),
  };
};

export const renderScene = (name: EnvName, ctx: SceneCtx) => envs[name](ctx);
