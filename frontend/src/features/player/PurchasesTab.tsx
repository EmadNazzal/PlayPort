import { cn } from '@/lib/cn';
import { formatDate, lamportsToSol } from '@/lib/format';
import { useGames, usePayments } from '@/lib/queries';
import { SOLANA_CLUSTER } from '@/features/wallets/solana';

const Purchases = () => {
  const { data: payments = [] } = usePayments();
  const { data: games = [] } = useGames();
  const titles = new Map(games.map((g) => [g.id, g.title]));
  const cluster = SOLANA_CLUSTER === 'mainnet-beta' ? '' : `?cluster=${SOLANA_CLUSTER}`;
  if (!payments.length) return <p className="text-sm text-muted">No purchases yet.</p>;
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
      {payments.map((p) => (
        <li key={p.id} className="flex items-center gap-4 bg-surface/50 px-4 py-3.5 text-sm">
          <div className="min-w-0 flex-1">
            <p className="truncate">{titles.get(p.gameId) ?? 'Game'}</p>
            <p className="text-xs text-muted">{formatDate(p.createdAt)}</p>
          </div>
          <span className="font-mono">{lamportsToSol(p.amountLamports)} SOL</span>
          <span
            className={cn(
              'rounded-md px-2 py-0.5 text-[11px] capitalize',
              p.status === 'confirmed' ? 'bg-go/10 text-go-fg' : p.status === 'pending' ? 'bg-lantern/10 text-lantern-fg' : 'bg-veil/5 text-muted',
            )}
          >
            {p.status}
          </span>
          {p.txSignature ? (
            <a href={`https://solscan.io/tx/${p.txSignature}${cluster}`} target="_blank" rel="noreferrer" className="text-xs text-muted hover:text-text">
              Receipt ↗
            </a>
          ) : (
            <span className="w-[60px]" />
          )}
        </li>
      ))}
    </ul>
  );
};

export default function PurchasesTab() {
  return (
    <div className="max-w-3xl">
      <p className="mb-6 text-sm text-muted">Every payment, with its on-chain receipt.</p>
      <Purchases />
    </div>
  );
}
