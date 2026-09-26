/** Economics of a head-to-head wager (see README). */
export const PARTNER_FEE = 0.1;
export const PLATFORM_SHARE_OF_FEE = 0.1;

export const payout = (stakeEach: number) => {
  const pot = stakeEach * 2;
  const fee = pot * PARTNER_FEE;
  const platform = fee * PLATFORM_SHARE_OF_FEE;
  return { pot, fee, platform, studio: fee - platform, winner: pot - fee };
};

export type MatchParams = { id: string; game: string; host: string; guest: string; stake: number; role: 'host' | 'guest' };

export const readMatch = (id: string, search: URLSearchParams): MatchParams => ({
  id,
  game: search.get('game') ?? 'breach-protocol',
  host: search.get('host') ?? 'leo',
  guest: search.get('guest') ?? 'mia',
  stake: Number(search.get('stake') ?? 5),
  role: search.get('role') === 'guest' ? 'guest' : 'host',
});

export const matchQuery = (m: Omit<MatchParams, 'id'>) =>
  new URLSearchParams({ game: m.game, host: m.host, guest: m.guest, stake: String(m.stake), role: m.role }).toString();

/** A fake-but-plausible escrow address for the staged demo. */
export const ESCROW_ADDRESS = 'EsCrwB7vQ4Fp1ayPRtM9tChH3xK2dW8sLnZ6uYjR5q';
