const LAMPORTS_PER_SOL = 1_000_000_000n;

/** Lamports (decimal string) → SOL as a number, for display only. */
export const lamportsToSol = (lamports: string | bigint): number => {
  const l = BigInt(lamports);
  return Number(l / LAMPORTS_PER_SOL) + Number(l % LAMPORTS_PER_SOL) / 1e9;
};

export const isFree = (lamports: string) => BigInt(lamports) === 0n;

export const shortAddress = (address: string, size = 4) => `${address.slice(0, size)}…${address.slice(-size)}`;

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));

export const PLATFORM_LABELS: Record<string, string> = {
  web: 'Browser',
  windows: 'Windows',
  macos: 'macOS',
  linux: 'Linux',
  ios: 'iOS',
  android: 'Android',
};

const ACRONYMS: Record<string, string> = { rpg: 'RPG', mmo: 'MMO', fps: 'FPS', rts: 'RTS', moba: 'MOBA' };

/** `tower-defense` → `Tower Defense`, `rpg` → `RPG`. */
export const titleCase = (s: string) =>
  s
    .split('-')
    .map((w) => ACRONYMS[w] ?? w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
