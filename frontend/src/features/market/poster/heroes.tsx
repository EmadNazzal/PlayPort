import type { ReactNode } from 'react';

/**
 * Hero silhouettes for posters. Drawn with feet at (0, 0), growing upward (negative y),
 * roughly 300 units tall. `body` is filled with the silhouette colour; `accent` is the
 * emissive detail (visor, lantern, sigil…) drawn in the light colour with a glow.
 */
/** `height`/`width` are the silhouette's extent, used to fit it in the frame. */
export type Hero = { body: ReactNode; accent?: ReactNode; height: number; width: number; floating?: boolean };

export type HeroName =
  | 'knight'
  | 'samurai'
  | 'pilot'
  | 'ship'
  | 'car'
  | 'surfer'
  | 'diver'
  | 'lanternkid'
  | 'fox'
  | 'mage'
  | 'robot'
  | 'mech'
  | 'pet'
  | 'galleons'
  | 'lighthouse'
  | 'cards';

const knight: Hero = {
  height: 320,
  width: 220,
  body: (
    <>
      <path d="M-30 -250 C -80 -200 -120 -100 -150 -6 C -100 -18 -60 -10 -20 0 L 30 -240 Z" />
      <path d="M-17 -262 C -17 -302 17 -302 17 -262 L 14 -250 L -14 -250 Z" />
      <path d="M0 -296 C 20 -324 48 -322 64 -302 C 42 -308 22 -302 6 -288 Z" />
      <path d="M-44 -246 Q 0 -262 44 -246 L 40 -222 L 28 -216 L 22 -150 L -22 -150 L -28 -216 L -40 -222 Z" />
      <path d="M-26 -155 L 26 -155 L 34 -118 L -34 -118 Z" />
      <path d="M-30 -120 L -8 -120 L -10 -4 L -36 0 Z" />
      <path d="M8 -120 L 30 -120 L 38 0 L 12 -4 Z" />
      <path d="M34 -240 L 50 -236 L 62 -170 L 54 -166 L 38 -214 Z" />
      <path d="M-36 -236 L -48 -232 L -56 -170 L -46 -168 L -40 -212 Z" />
      <path d="M57 -165 L 65 -165 L 64 0 L 61 12 L 58 0 Z" />
      <rect x="44" y="-172" width="34" height="7" rx="2" />
      <rect x="58" y="-198" width="6" height="28" />
      <circle cx="61" cy="-201" r="5" />
    </>
  ),
  accent: <path d="M-10 -272 L 10 -272 L 8 -266 L -8 -266 Z" />,
};

const samurai: Hero = {
  height: 300,
  width: 240,
  body: (
    <>
      <path d="M-20 -238 C -60 -252 -100 -236 -150 -254 C -110 -224 -64 -226 -24 -224 Z" />
      <path d="M-64 -256 L 0 -292 L 64 -256 Q 0 -248 -64 -256 Z" />
      <circle cx="0" cy="-242" r="13" />
      <path d="M-34 -234 L 34 -234 L 40 -150 L -40 -150 Z" />
      <path d="M-34 -232 L -72 -178 L -52 -158 L -30 -194 Z" />
      <path d="M34 -232 L 66 -194 L 52 -178 L 30 -204 Z" />
      <path d="M-40 -152 L 40 -152 L 64 0 L 8 0 L 0 -60 L -8 0 L -64 0 Z" />
      <path d="M50 -186 L 176 -104 L 172 -98 L 46 -178 Z" />
      <path d="M34 -198 L 52 -186 L 46 -178 L 30 -190 Z" />
    </>
  ),
};

const pilot: Hero = {
  height: 290,
  width: 150,
  body: (
    <>
      <circle cx="0" cy="-250" r="32" />
      <path d="M-42 -222 Q 0 -234 42 -222 L 48 -130 L -48 -130 Z" />
      <rect x="-56" y="-228" width="16" height="84" rx="6" />
      <path d="M-40 -132 L -6 -132 L -10 -8 L -46 0 L -46 -10 Z" />
      <path d="M6 -132 L 40 -132 L 46 -10 L 46 0 L 10 -8 Z" />
      <path d="M-42 -216 L -64 -150 L -50 -144 L -30 -196 Z" />
      <path d="M42 -216 L 74 -160 L 62 -150 L 32 -196 Z" />
    </>
  ),
  accent: <ellipse cx="7" cy="-252" rx="20" ry="13" />,
};

const ship: Hero = {
  height: 160,
  width: 370,
  floating: true,
  body: (
    <>
      <path d="M-160 -20 L 110 -64 L 176 -52 L 116 -36 L -160 0 L -128 -16 Z" />
      <path d="M-30 -46 L -104 -126 L -70 -126 L 30 -52 Z" />
      <path d="M-30 -8 L -116 60 L -80 60 L 20 -12 Z" />
      <path d="M-150 -18 L -186 -44 L -170 -14 L -186 16 Z" />
    </>
  ),
  accent: (
    <>
      <ellipse cx="-168" cy="-9" rx="22" ry="8" />
      <path d="M86 -58 L 128 -58 L 110 -48 Z" />
    </>
  ),
};

const car: Hero = {
  height: 100,
  width: 360,
  body: (
    <>
      <path d="M-170 -12 L -160 -42 L -96 -54 L -44 -84 L 52 -88 L 104 -58 L 166 -50 L 178 -22 L 168 -12 Z" />
      <path d="M-176 -56 L -130 -56 L -128 -46 L -176 -44 Z" />
      <circle cx="-104" cy="-12" r="24" />
      <circle cx="112" cy="-12" r="24" />
    </>
  ),
  accent: (
    <>
      <rect x="156" y="-44" width="22" height="6" rx="3" />
      <rect x="-172" y="-40" width="14" height="5" rx="2" />
      <ellipse cx="0" cy="4" rx="170" ry="6" opacity="0.7" />
    </>
  ),
};

const surfer: Hero = {
  height: 180,
  width: 240,
  body: (
    <>
      <path d="M-120 -8 Q 0 -32 120 -18 Q 0 6 -120 -8 Z" />
      <circle cx="12" cy="-156" r="14" />
      <path d="M-4 -142 L 26 -140 L 32 -82 L 0 -78 Z" />
      <path d="M0 -134 L -64 -114 L -62 -104 L 4 -120 Z" />
      <path d="M24 -134 L 86 -146 L 86 -136 L 26 -122 Z" />
      <path d="M0 -82 L -32 -46 L -26 -14 L -12 -14 L -14 -42 L 14 -78 Z" />
      <path d="M28 -82 L 46 -42 L 40 -16 L 54 -16 L 58 -46 L 36 -82 Z" />
    </>
  ),
};

const diver: Hero = {
  height: 300,
  width: 170,
  floating: true,
  body: (
    <>
      <path d="M22 -256 C 50 -320 20 -400 70 -500" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
      <circle cx="0" cy="-232" r="36" />
      <path d="M-44 -202 Q 0 -214 44 -202 L 50 -110 L -50 -110 Z" />
      <path d="M-42 -112 L -6 -112 L -8 -14 L -48 -8 Z" />
      <path d="M6 -112 L 42 -112 L 48 -8 L 8 -14 Z" />
      <rect x="-54" y="-18" width="48" height="18" rx="4" />
      <rect x="6" y="-18" width="48" height="18" rx="4" />
      <path d="M-44 -198 L -74 -140 L -60 -132 L -34 -178 Z" />
      <path d="M44 -198 L 80 -154 L 68 -142 L 36 -178 Z" />
    </>
  ),
  accent: (
    <>
      <circle cx="8" cy="-234" r="15" />
      <path d="M22 -236 L 260 -300 L 260 -150 Z" opacity="0.18" />
    </>
  ),
};

const lanternkid: Hero = {
  height: 230,
  width: 120,
  body: (
    <>
      <circle cx="0" cy="-156" r="20" />
      <path d="M-22 -164 C -26 -190 22 -192 22 -166 C 30 -150 18 -140 22 -130 C 8 -140 -8 -140 -24 -130 C -20 -142 -30 -150 -22 -164 Z" />
      <path d="M-14 -134 L 14 -134 L 36 -32 L -36 -32 Z" />
      <rect x="-16" y="-34" width="8" height="34" />
      <rect x="8" y="-34" width="8" height="34" />
      <path d="M10 -126 L 52 -176 L 58 -170 L 16 -118 Z" />
      <path d="M54 -174 L 60 -174 L 62 -210 L 56 -210 Z" />
    </>
  ),
  accent: <rect x="44" y="-236" width="30" height="36" rx="10" />,
};

const fox: Hero = {
  height: 230,
  width: 190,
  body: (
    <>
      {/* Nine tails fanning up behind the body, thin at the tips. */}
      {[-58, -40, -22, -6, 10].map((a, i) => (
        <path
          key={i}
          d={`M-20 -30 C ${-80 - i * 4} ${-40 + a * 0.2} ${-104 + i * 6} ${-120 + a} ${-70 + i * 18} ${-200 + a * 0.6} C ${-86 + i * 16} ${-150 + a} ${-70 - i * 2} ${-60 + a * 0.2} -10 -14 Z`}
        />
      ))}
      <path d="M-42 0 C -52 -60 -32 -120 -2 -140 C 18 -150 26 -170 22 -192 L 38 -214 L 42 -184 L 58 -200 L 56 -160 C 64 -140 52 -120 42 -100 C 52 -60 52 -20 42 0 Z" />
    </>
  ),
  accent: <circle cx="40" cy="-170" r="4" />,
};

const mage: Hero = {
  height: 300,
  width: 180,
  body: (
    <>
      <path d="M-22 -248 L 22 -248 L 64 0 L -64 0 Z" />
      <path d="M-28 -246 C -34 -304 34 -304 28 -246 C 20 -258 -20 -258 -28 -246 Z" />
      <path d="M16 -236 L 72 -300 L 82 -292 L 26 -220 Z" />
      <path d="M-44 -210 L -52 12" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
    </>
  ),
  accent: (
    <>
      <circle cx="-45" cy="-218" r="9" />
      <g fill="none" stroke="currentColor" strokeWidth="4">
        <circle cx="96" cy="-346" r="44" />
        <circle cx="96" cy="-346" r="30" />
        <path d="M96 -390 L 122 -324 L 62 -366 L 130 -366 L 70 -324 Z" />
      </g>
    </>
  ),
};

const robot: Hero = {
  height: 240,
  width: 170,
  body: (
    <>
      <rect x="-42" y="-160" width="84" height="104" rx="18" />
      <rect x="-32" y="-218" width="64" height="52" rx="14" />
      <rect x="-3" y="-240" width="6" height="22" />
      <circle cx="0" cy="-244" r="7" />
      <rect x="-34" y="-58" width="22" height="58" rx="6" />
      <rect x="12" y="-58" width="22" height="58" rx="6" />
      <rect x="-64" y="-150" width="20" height="62" rx="8" />
      <rect x="44" y="-150" width="20" height="62" rx="8" />
      <path d="M-42 -120 L -80 -120 M -80 -138 L -80 -102" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
    </>
  ),
  accent: (
    <>
      <circle cx="-13" cy="-192" r="7" />
      <circle cx="13" cy="-192" r="7" />
      <path d="M0 -92 C -20 -106 -20 -126 -6 -126 C -2 -126 0 -122 0 -120 C 0 -122 2 -126 6 -126 C 20 -126 20 -106 0 -92 Z" />
    </>
  ),
};

const mech: Hero = {
  height: 280,
  width: 370,
  body: (
    <>
      <path d="M-58 -140 L -92 -72 L -62 0 L -38 0 L -64 -72 L -36 -130 Z" />
      <path d="M58 -140 L 92 -72 L 62 0 L 38 0 L 64 -72 L 36 -130 Z" />
      <path d="M-82 -244 L 82 -244 L 100 -192 L 62 -140 L -62 -140 L -100 -192 Z" />
      <rect x="98" y="-236" width="82" height="26" rx="4" />
      <rect x="-180" y="-236" width="82" height="26" rx="4" />
      <path d="M-40 -244 L -30 -282 M 40 -244 L 46 -270" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    </>
  ),
  accent: (
    <>
      <rect x="-44" y="-212" width="88" height="10" rx="4" />
      <circle cx="184" cy="-223" r="7" />
      <circle cx="-184" cy="-223" r="7" />
    </>
  ),
};

// 12×11 pixel sprite — "." empty, "b" body, "e" eye, "w" eye highlight, "m" mouth, "c" cheek.
const PET = ['..b......b..', '.bbb....bbb.', '.bbbbbbbbbb.', 'bbbbbbbbbbbb', 'bbwebbbbwebb', 'bbeebbbbeebb', 'bbbbbbbbbbbb', 'bcbbbmmbbbcb', 'bbbbbbbbbbbb', '.bbbbbbbbbb.', '..bb....bb..'];
const PET_COLORS: Record<string, string> = { e: '#1B1030', w: '#FFFFFF', m: '#1B1030', c: '#FF6FA5' };
const pet: Hero = {
  height: 220,
  width: 240,
  body: (
    <g transform="translate(-120 -220)">
      {PET.flatMap((row, y) =>
        [...row].map((px, x) =>
          px === '.' ? null : (
            <rect key={`${x}-${y}`} x={x * 20} y={y * 20} width="20.5" height="20.5" fill={PET_COLORS[px] ?? 'currentColor'} />
          ),
        ),
      )}
    </g>
  ),
};

const galleons: Hero = {
  height: 260,
  width: 420,
  body: (
    <>
      {[
        { x: -40, s: 1 },
        { x: 170, s: 0.62 },
      ].map(({ x, s }) => (
        <g key={x} transform={`translate(${x} 0) scale(${s})`}>
          <path d="M-150 -40 L 150 -40 L 118 0 L -128 0 Z" />
          <path d="M-150 -40 L -170 -64 L -120 -48 Z" />
          <rect x="-62" y="-250" width="6" height="210" />
          <rect x="38" y="-220" width="6" height="180" />
          <path d="M-110 -70 L -8 -70 L -18 -150 L -100 -150 Z M -104 -160 L -14 -160 L -24 -226 L -94 -226 Z" />
          <path d="M-4 -64 L 90 -64 L 82 -130 L 4 -130 Z M 4 -140 L 80 -140 L 72 -196 L 12 -196 Z" />
          <path d="M-56 -250 L -20 -240 L -56 -230 Z" />
        </g>
      ))}
    </>
  ),
  accent: (
    <>
      <circle cx="-120" cy="-30" r="4" />
      <circle cx="-80" cy="-30" r="4" />
      <circle cx="-40" cy="-30" r="4" />
      <circle cx="0" cy="-30" r="4" />
    </>
  ),
};

const lighthouse: Hero = {
  height: 340,
  width: 340,
  body: (
    <>
      <path d="M-160 0 C -120 -40 -60 -50 -30 -40 L 40 -40 C 90 -60 150 -30 180 0 Z" />
      <path d="M-26 -40 L -16 -270 L 16 -270 L 26 -40 Z" />
      <rect x="-24" y="-300" width="48" height="30" rx="4" />
      <path d="M-30 -300 L 0 -330 L 30 -300 Z" />
      <rect x="-30" y="-272" width="60" height="6" />
      <rect x="90" y="-80" width="44" height="40" />
      <path d="M84 -80 L 112 -104 L 140 -80 Z" />
    </>
  ),
  accent: (
    <>
      <rect x="-14" y="-296" width="28" height="22" rx="3" />
      <path d="M0 -286 L -420 -360 L -420 -230 Z" opacity="0.16" />
      <rect x="104" y="-66" width="10" height="12" />
    </>
  ),
};

const cards: Hero = {
  height: 300,
  width: 230,
  floating: true,
  body: (
    <>
      {[-28, -14, 0, 14, 28].map((deg, i) => (
        <g key={deg} transform={`rotate(${deg} 0 60)`}>
          <rect x="-60" y={-230 + Math.abs(deg) * 0.6} width="120" height="180" rx="12" opacity={i === 2 ? 1 : 0.85} />
        </g>
      ))}
    </>
  ),
  accent: (
    <g fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round">
      <rect x="-50" y="-220" width="100" height="160" rx="8" strokeWidth="3" />
      <path d="M0 -196 L 0 -84 M -26 -170 L 26 -110 M 26 -170 L -26 -110" />
      <circle cx="0" cy="-140" r="20" />
    </g>
  ),
};

export const HEROES: Record<HeroName, Hero> = { knight, samurai, pilot, ship, car, surfer, diver, lanternkid, fox, mage, robot, mech, pet, galleons, lighthouse, cards };
