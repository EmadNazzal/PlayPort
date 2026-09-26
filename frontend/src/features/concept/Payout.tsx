import { payout } from './match';

const Row = ({ label, sub, value, accent }: { label: string; sub: string; value: string; accent?: boolean }) => (
  <div className="flex items-center justify-between py-2.5">
    <div>
      <p className="text-sm">{label}</p>
      <p className="text-xs text-faint">{sub}</p>
    </div>
    <p className={`font-mono text-sm tabular-nums ${accent ? 'text-go-fg' : ''}`}>{value}</p>
  </div>
);

/** How the pot is split — shown before staking and again at settlement. */
export const PayoutBreakdown = ({ stake, studio }: { stake: number; studio: string }) => {
  const p = payout(stake);
  return (
    <div className="divide-y divide-line rounded-2xl border border-line bg-ink-2 px-4">
      <Row label="Pot" sub={`${stake} SOL from each player, held in escrow`} value={`${p.pot} SOL`} />
      <Row label="Winner receives" sub="Pot minus the studio fee" value={`${p.winner} SOL`} accent />
      <Row label={`${studio} fee`} sub="10% of the pot, for hosting the match" value={`${p.studio.toFixed(2)} SOL`} />
      <Row label="PlayPort" sub="10% of the studio fee" value={`${p.platform.toFixed(2)} SOL`} />
    </div>
  );
};
