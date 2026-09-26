import NumberFlow from '@number-flow/react';
import { useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Copy, Gamepad2, Wallet as WalletIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';
import { lamportsToSol, shortAddress } from '@/lib/format';
import { useGames, usePayments, useWallets } from '@/lib/queries';
import { useSolPrice } from '@/lib/useSolPrice';
import { isConcept, useConcept } from '@/features/concept/flag';
import { GameCover } from '@/features/market/GameCover';
import { SOLANA_CLUSTER } from '@/features/wallets/solana';

type Activity = { id: string; title: string; game: string; gameSlug: string; sol: number; at: number; signature: string | null; kind: 'In-game item' | 'Game purchase' };

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const ago = (at: number) => {
  const s = Math.round((at - Date.now()) / 1000);
  if (s > -60) return 'just now';
  if (s > -3600) return rtf.format(Math.round(s / 60), 'minute');
  if (s > -86400) return rtf.format(Math.round(s / 3600), 'hour');
  return rtf.format(Math.round(s / 86400), 'day');
};

/** /player/wallet — balance, where the SOL went, and every transaction with a receipt. */
export default function WalletPortal() {
  const concept = isConcept();
  const { connection } = useConnection();
  const { data: wallets = [] } = useWallets();
  const { data: payments = [] } = usePayments();
  const { data: games = [] } = useGames();
  const staged = useConcept();
  const usd = useSolPrice();
  const primary = wallets.find((w) => w.isPrimary) ?? wallets[0];

  const { data: chainBalance } = useQuery({
    queryKey: ['balance', primary?.address],
    queryFn: async () => (await connection.getBalance(new PublicKey(primary!.address))) / LAMPORTS_PER_SOL,
    enabled: Boolean(primary) && !concept,
    refetchInterval: 30_000,
  });
  const balance = concept ? staged.balance : chainBalance;

  const bySlug = new Map(games.map((g) => [g.slug, g]));
  const byId = new Map(games.map((g) => [g.id, g]));
  const activity: Activity[] = [
    ...(concept ? staged.txs.map((t) => ({ id: t.id, title: t.item, game: t.game, gameSlug: t.gameSlug, sol: t.sol, at: t.at, signature: t.signature, kind: 'In-game item' as const })) : []),
    // Concept mode tells one self-contained story (25 → 22 SOL), so it leaves out real history.
    ...payments
      .filter((p) => !concept && p.status === 'confirmed')
      .map((p) => {
        const g = byId.get(p.gameId);
        return { id: p.id, title: g?.title ?? 'Game', game: g?.partner.name ?? '', gameSlug: g?.slug ?? '', sol: lamportsToSol(p.amountLamports), at: Date.parse(p.confirmedAt ?? p.createdAt), signature: p.txSignature, kind: 'Game purchase' as const };
      }),
  ].sort((a, b) => b.at - a.at);

  const spendByGame = [...activity.reduce((m, a) => m.set(a.gameSlug, (m.get(a.gameSlug) ?? 0) + a.sol), new Map<string, number>())].sort((a, b) => b[1] - a[1]);
  const totalSpent = activity.reduce((s, a) => s + a.sol, 0);
  const cluster = SOLANA_CLUSTER === 'mainnet-beta' ? '' : `?cluster=${SOLANA_CLUSTER}`;

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="relative overflow-hidden rounded-3xl border border-line bg-surface p-7">
          <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-go/10 blur-3xl" />
          <p className="flex items-center gap-2 text-sm text-muted">
            <WalletIcon className="size-4" /> Wallet balance
          </p>
          <p className="mt-3 font-display text-7xl font-bold tracking-[-0.04em] tabular-nums">
            {balance === undefined ? '—' : <NumberFlow value={balance} format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} suffix=" SOL" />}
          </p>
          {balance !== undefined && usd !== null && <p className="mt-1 font-mono text-sm text-muted">≈ ${(balance * usd).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>}
          {primary && (
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(primary.address);
                toast.success('Address copied');
              }}
              className="pressable mt-6 inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 font-mono text-xs text-muted hover:text-text"
            >
              {shortAddress(primary.address, 6)} <Copy className="size-3" />
            </button>
          )}
          <p className="mt-6 text-sm text-muted">One wallet across every game on PlayPort. Studios are paid directly; nothing is held for you.</p>
        </section>

        <section className="rounded-3xl border border-line bg-surface p-7">
          <p className="text-sm text-muted">Spent</p>
          <p className="mt-2 font-display text-4xl font-bold tracking-[-0.03em] tabular-nums">
            <NumberFlow value={totalSpent} format={{ maximumFractionDigits: 2 }} suffix=" SOL" />
          </p>
          <ul className="mt-6 space-y-4">
            {spendByGame.length === 0 && <li className="text-sm text-faint">No spending yet.</li>}
            {spendByGame.map(([slug, sol]) => {
              const g = bySlug.get(slug);
              return (
                <li key={slug} className="flex items-center gap-3">
                  <span className="aspect-[2/3] w-9 shrink-0 overflow-hidden rounded-md ring-1 ring-veil/10">{g ? <GameCover game={g} showTitle={false} /> : <Gamepad2 className="m-2 size-5 text-muted" />}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="truncate">{g?.title ?? slug}</span>
                      <span className="font-mono tabular-nums">{sol} SOL</span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-veil/[0.06]">
                      <div className="h-full rounded-full bg-go transition-[width] duration-700" style={{ width: `${(sol / totalSpent) * 100}%` }} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section>
        <h2 className="font-display text-xl font-semibold tracking-[-0.02em]">Transactions</h2>
        {activity.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-line-strong p-10 text-center text-muted">Nothing yet. Purchases in any PlayPort game land here.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {activity.map((a, i) => {
              const g = bySlug.get(a.gameSlug);
              return (
                <li key={a.id} className={cn('flex items-center gap-4 px-5 py-4', i === 0 && concept && 'animate-rise')}>
                  <span className="aspect-[2/3] w-10 shrink-0 overflow-hidden rounded-lg ring-1 ring-veil/10">{g && <GameCover game={g} showTitle={false} />}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{a.title}</p>
                    <p className="truncate text-sm text-muted">
                      {a.kind === 'In-game item' ? a.game : g?.partner.name} · {a.kind}
                    </p>
                  </div>
                  <span className="hidden text-sm text-faint sm:block">{ago(a.at)}</span>
                  <span className="rounded-md bg-go/12 px-2 py-0.5 text-[11px] text-go-fg">Confirmed</span>
                  <span className="w-24 text-right font-mono tabular-nums">−{a.sol.toFixed(2)} SOL</span>
                  {a.signature ? (
                    <a href={`https://solscan.io/tx/${a.signature}${cluster}`} target="_blank" rel="noreferrer" aria-label="Receipt" className="text-muted hover:text-text">
                      <ArrowUpRight className="size-4" />
                    </a>
                  ) : (
                    <span className="w-4" />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
