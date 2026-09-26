import type { HeroName } from './heroes';
import type { EnvName, Palette } from './scenes';

export type Particles = 'embers' | 'petals' | 'stars' | 'sparks' | 'snow' | 'none';

export type Recipe = {
  env: EnvName;
  hero: HeroName;
  palette: Palette;
  particles: Particles;
  /** Hero position as a fraction of width (portrait / wide). */
  heroX?: number;
  wideHeroX?: number;
  /** Multiplier on the default hero size. */
  heroScale?: number;
  /** Override the silhouette colour (e.g. a coloured mascot instead of a backlit silhouette). */
  heroFill?: string;
  /** Bright daytime scenes skip the dramatic backlight and rim glow. */
  daylight?: boolean;
};

const P = (skyTop: string, skyBottom: string, light: string, far: string, mid: string, near: string, ink: string): Palette => ({ skyTop, skyBottom, light, far, mid, near, ink });

/** Hand-directed posters for the launch catalogue. */
export const RECIPES: Record<string, Recipe> = {
  'ashen-crown': { env: 'ruins', hero: 'knight', particles: 'embers', palette: P('#1A0906', '#8A2A0C', '#FFB35C', '#3A130A', '#240B06', '#0C0403', '#FFF1DE') },
  'blade-and-blossom': { env: 'mountains', hero: 'samurai', particles: 'petals', heroX: 0.42, palette: P('#2A1030', '#F08A7A', '#FFD9C2', '#6E3A5C', '#40203A', '#160A14', '#FFF3EF') },
  'star-drifter': { env: 'space', hero: 'ship', particles: 'stars', heroScale: 1.1, palette: P('#05061A', '#2A0F3F', '#7CF7FF', '#1A1450', '#5B1E8C', '#07051A', '#E9F7FF') },
  'orbital-siege': { env: 'space', hero: 'pilot', particles: 'sparks', palette: P('#030A14', '#0B2A3A', '#FFB547', '#0F3B52', '#1C5A7A', '#02060C', '#EEF8FF') },
  'comet-tail': { env: 'space', hero: 'ship', particles: 'stars', heroScale: 0.8, heroX: 0.4, palette: P('#0B0716', '#3D1244', '#FF6AD5', '#2A1350', '#7A2F8F', '#08040F', '#FFE9FA') },
  'neon-rally': { env: 'city', hero: 'car', particles: 'none', heroScale: 1.1, palette: P('#0A0418', '#4A1060', '#FF3DB4', '#2A1245', '#1A0A30', '#05020A', '#FFE9FA') },
  reefbreak: { env: 'wave', hero: 'surfer', particles: 'none', heroX: 0.46, palette: P('#0B3B5C', '#FFCF8A', '#FFF3C4', '#1D6B86', '#0E4D66', '#062A3A', '#EFFBFF') },
  abyssal: { env: 'underwater', hero: 'diver', particles: 'none', heroX: 0.36, wideHeroX: 0.4, palette: P('#0A4A52', '#010608', '#9BFFE4', '#062226', '#0A2F33', '#010405', '#DFFFF6') },
  'harbor-kings': { env: 'ocean', hero: 'lighthouse', particles: 'none', heroX: 0.62, palette: P('#1B2A4A', '#F7A35C', '#FFE0A3', '#3A3050', '#23304F', '#0B0F1C', '#FFF4E0') },
  'salt-and-iron': { env: 'storm', hero: 'galleons', particles: 'none', heroX: 0.44, palette: P('#0A0F14', '#3A4A52', '#E6F3FF', '#1A232B', '#16222A', '#06090C', '#EEF3F5') },
  lanternfall: { env: 'festival', hero: 'lanternkid', particles: 'none', heroScale: 1.1, palette: P('#0B0A26', '#3A2A5E', '#FFCF6A', '#1A1638', '#141030', '#080716', '#FFF6E0') },
  'kitsune-road': { env: 'forest', hero: 'fox', particles: 'embers', heroX: 0.56, palette: P('#0C0A14', '#4A1F2A', '#FF5A3C', '#2A1420', '#1A0D16', '#080509', '#FFE9E3') },
  'clockwork-heart': { env: 'workshop', hero: 'robot', particles: 'sparks', palette: P('#140C06', '#4A2E14', '#FFC46B', '#2E1D0E', '#3D2712', '#0D0804', '#FFF3DD') },
  runeshard: { env: 'void', hero: 'cards', particles: 'stars', palette: P('#0A0620', '#23104A', '#9F7BFF', '#2A1A5C', '#4B2F9F', '#07041A', '#EFE9FF') },
  'paper-mechs': { env: 'arena', hero: 'mech', particles: 'sparks', palette: P('#10141C', '#6A4A2A', '#FFD166', '#2A2E38', '#1C1F28', '#0A0B0F', '#FFF8E6') },
  sigil: { env: 'void', hero: 'mage', particles: 'sparks', heroX: 0.42, palette: P('#04121A', '#0D3A4A', '#5CFFE1', '#0B2A36', '#12505E', '#020A0E', '#E6FFFB') },
  'breach-protocol': { env: 'dust', hero: 'operator', particles: 'embers', heroX: 0.44, palette: P('#3B2A1A', '#E8A45C', '#FFE2A6', '#8A5A33', '#6E4526', '#1A120B', '#FFF4E2') },
  sugarfall: { env: 'candy', hero: 'candies', particles: 'none', daylight: true, heroFill: '#FF4F8B', heroScale: 0.95, palette: P('#FFB3D1', '#FFE9C7', '#FFF6B0', '#FFD1E6', '#FFC2DA', '#FF7FB0', '#5A1E3A') },
  'pixel-pals': { env: 'meadow', hero: 'pet', particles: 'none', daylight: true, heroFill: '#FF9ECB', palette: P('#7FD3FF', '#FFE3F1', '#FFF6B0', '#8FE3A0', '#5CC98A', '#3AA56E', '#FFFFFF') },
};

/** Genre → a template for games without a hand-directed poster. */
const BY_GENRE: [string[], Recipe[]][] = [
  [['space', 'tower-defense'], [RECIPES['star-drifter']!, RECIPES['orbital-siege']!]],
  [['racing', 'runner', 'arcade'], [RECIPES['neon-rally']!, RECIPES['comet-tail']!]],
  [['sports'], [RECIPES.reefbreak!]],
  [['rpg', 'souls-like', 'action'], [RECIPES['ashen-crown']!, RECIPES.sigil!]],
  [['fighting'], [RECIPES['blade-and-blossom']!]],
  [['horror', 'survival'], [RECIPES.abyssal!]],
  [['adventure', 'puzzle'], [RECIPES.lanternfall!, RECIPES['kitsune-road']!]],
  [['roguelike'], [RECIPES['kitsune-road']!, RECIPES.sigil!]],
  [['strategy', 'tactics', 'simulation'], [RECIPES['salt-and-iron']!, RECIPES['harbor-kings']!]],
  [['platformer'], [RECIPES['clockwork-heart']!]],
  [['card'], [RECIPES.runeshard!]],
  [['shooter', 'tactical', 'fps'], [RECIPES['breach-protocol']!]],
  [['sandbox', 'multiplayer'], [RECIPES['paper-mechs']!]],
  [['match-3'], [RECIPES.sugarfall!]],
  [['casual', 'idle'], [RECIPES['pixel-pals']!]],
];

export const recipeFor = (slug: string, genres: string[], r: () => number): Recipe => {
  const direct = RECIPES[slug];
  if (direct) return direct;
  for (const g of genres) {
    const hit = BY_GENRE.find(([keys]) => keys.includes(g));
    if (hit) return hit[1][Math.floor(r() * hit[1].length)]!;
  }
  const all = Object.values(RECIPES);
  return all[Math.floor(r() * all.length)]!;
};
