import { cn } from '@/lib/cn';
import { formatDate, lamportsToSol } from '@/lib/format';
import { SOLANA_CLUSTER } from '@/features/wallets/solana';
import { useSales, useStudioGames } from './queries';
import { useStudioContext } from './StudioLayout';

export default function StudioSales() {
  const { studio, canManage } = useStudioContext();
  const { data: sales = [], isPending } = useSales(studio.id, canManage);
  const { data: games = [] } = useStudioGames(studio.id);
  const titles = new Map(games.map((g) => [g.id, g.title]));
  const confirmed = sales.filter((s) => s.status === 'confirmed');
  const total = confirmed.reduce((sum, s) => sum + lamportsToSol(s.amountLamports), 0);
  const cluster = SOLANA_CLUSTER === 'mainnet-beta' ? '' : `?cluster=${SOLANA_CLUSTER}`;

  if (!canManage) return <p className="text-muted">Sales are visible to studio owners and admins.</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-sm text-muted">Revenue</p>
          <p className="mt-2 font-display text-3xl font-semibold tabular-nums">{total.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-sm text-muted">Sales</p>
          <p className="mt-2 font-display text-3xl font-semibold tabular-nums">{confirmed.length}</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-sm text-muted">Paid to</p>
          <p className="mt-2 truncate font-mono text-sm">{studio.payoutWalletAddress ?? 'No payout wallet yet'}</p>
          <p className="mt-1 text-xs text-faint">Straight from each buyer’s wallet</p>
        </div>
      </div>

      {isPending ? (
        <div className="h-40 animate-pulse rounded-2xl bg-surface" />
      ) : sales.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line-strong p-10 text-center text-muted">No sales yet. They’ll appear here the moment they settle on-chain.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-surface text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-3 font-normal">Date</th>
                <th className="px-4 py-3 font-normal">Game</th>
                <th className="px-4 py-3 text-right font-normal">Amount</th>
                <th className="px-4 py-3 font-normal">Status</th>
                <th className="px-4 py-3 font-normal" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sales.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 text-muted">{formatDate(s.createdAt)}</td>
                  <td className="px-4 py-3">{titles.get(s.gameId) ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{lamportsToSol(s.amountLamports)} SOL</td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-md px-2 py-0.5 text-[11px] capitalize', s.status === 'confirmed' ? 'bg-go/12 text-go-fg' : s.status === 'pending' ? 'bg-lantern/12 text-lantern-fg' : 'bg-veil/[0.05] text-muted')}>{s.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {s.txSignature && (
                      <a href={`https://solscan.io/tx/${s.txSignature}${cluster}`} target="_blank" rel="noreferrer" className="text-xs text-muted hover:text-text">
                        Receipt ↗
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
