import { useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowUpRight, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Price } from '@/components/ui/Price';
import { Spinner } from '@/components/ui/Spinner';
import { errorMessage } from '@/lib/api';
import { lamportsToSol, shortAddress } from '@/lib/format';
import { useWallets } from '@/lib/queries';
import type { Game, Payment } from '@/lib/types';
import { SOLANA_CLUSTER } from '@/features/wallets/solana';
import { useWalletActions } from '@/features/wallets/useWalletActions';
import { WalletPicker } from '@/features/wallets/WalletPicker';
import { GameCover } from './GameCover';

type Stage = 'review' | 'intent' | 'sign' | 'confirm' | 'done' | 'error';

const STAGE_COPY: Partial<Record<Stage, string>> = {
  intent: 'Reserving your order…',
  sign: 'Approve the transfer in your wallet',
  confirm: 'Confirming on Solana…',
};

const NETWORK_FEE_SOL = 0.000005;

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between py-2.5 text-sm">
    <span className="text-muted">{label}</span>
    <span>{children}</span>
  </div>
);

/** Draws a check mark — the one celebratory moment in checkout. */
const Success = () => (
  <svg viewBox="0 0 52 52" className="size-16 text-go" aria-hidden>
    <circle className="draw" pathLength={1} cx="26" cy="26" r="24" fill="none" stroke="currentColor" strokeWidth="2" />
    <path className="draw" pathLength={1} style={{ ['--draw-delay' as string]: '350ms' }} d="M15 27l7 7 15-15" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type Props = { game: Game; open: boolean; onOpenChange: (open: boolean) => void; onPlay: () => void };

export const CheckoutDialog = ({ game, open, onOpenChange, onPlay }: Props) => {
  const w = useWalletActions();
  const { connection } = useConnection();
  const { data: linked = [], isPending: walletsLoading } = useWallets();
  const [stage, setStage] = useState<Stage>('review');
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [linking, setLinking] = useState(false);

  const address = w.publicKey?.toBase58();
  const isLinked = Boolean(address && linked.some((l) => l.address === address));
  const priceSol = lamportsToSol(game.priceLamports);

  const { data: balance } = useQuery({
    queryKey: ['balance', address],
    queryFn: async () => (await connection.getBalance(w.publicKey!)) / LAMPORTS_PER_SOL,
    enabled: Boolean(address) && open,
    refetchInterval: open ? 15_000 : false,
  });
  const insufficient = balance !== undefined && balance < priceSol + NETWORK_FEE_SOL;
  const busy = stage === 'intent' || stage === 'sign' || stage === 'confirm';

  const close = (next: boolean) => {
    if (busy) return; // don't lose a payment mid-flight
    onOpenChange(next);
    if (!next) setTimeout(() => (setStage('review'), setError(null)), 200);
  };

  const pay = async () => {
    setError(null);
    try {
      const confirmed = await w.buyGame(game.id, setStage);
      setPayment(confirmed);
      setStage('done');
    } catch (err) {
      const msg = errorMessage(err);
      setError(/reject|denied|cancel/i.test(msg) ? 'You declined the transaction in your wallet. Nothing was charged.' : msg);
      setStage('error');
    }
  };

  const link = async () => {
    if (!w.wallet) return;
    setLinking(true);
    try {
      await w.linkWallet(w.wallet.adapter.name);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLinking(false);
    }
  };

  const cluster = SOLANA_CLUSTER === 'mainnet-beta' ? '' : `?cluster=${SOLANA_CLUSTER}`;

  return (
    <Dialog open={open} onOpenChange={close} title={stage === 'done' ? 'It’s yours' : 'Checkout'} className="max-w-lg">
      {stage === 'done' ? (
          <div key="done" className="mt-6 flex animate-rise flex-col items-center text-center">
            <Success />
            <p className="mt-5 font-display text-xl font-semibold">{game.title} is in your library</p>
            <p className="mt-1.5 text-sm text-muted">Paid {priceSol} SOL to {game.partner.name}, verified on-chain.</p>
            <div className="mt-8 flex w-full flex-col gap-2">
              <Button intent="go" size="lg" onClick={onPlay}>
                Play now <ArrowUpRight />
              </Button>
              {payment?.txSignature && (
                <a href={`https://solscan.io/tx/${payment.txSignature}${cluster}`} target="_blank" rel="noreferrer" className="py-2 text-sm text-muted hover:text-text">
                  View receipt on Solscan ↗
                </a>
              )}
            </div>
          </div>
        ) : (
          <div key="review" className="mt-6">
            <div className="flex items-center gap-4 rounded-2xl border border-line bg-ink-2 p-3">
              <span className="aspect-[3/4] w-14 shrink-0 overflow-hidden rounded-xl">
                <GameCover game={game} showTitle={false} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{game.title}</p>
                <p className="truncate text-sm text-muted">{game.partner.name}</p>
              </div>
              <Price lamports={game.priceLamports} size="md" showFiat className="items-end" />
            </div>

            <div className="mt-4 divide-y divide-line px-1">
              <Row label="Price">{priceSol} SOL</Row>
              <Row label="Network fee">≈ {NETWORK_FEE_SOL} SOL</Row>
              <Row label="You get">Lifetime access · plays on the studio’s site</Row>
            </div>

            <div className="mt-5 rounded-2xl border border-line p-4">
              <p className="eyebrow mb-3">Pay with</p>
              {!address ? (
                <WalletPicker onPick={(name) => w.connect(name)} cta="Connecting shares your address only." />
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {w.wallet && <img src={w.wallet.adapter.icon} alt="" className="size-8 rounded-lg" />}
                    <div className="flex-1">
                      <p className="font-mono text-sm">{shortAddress(address, 6)}</p>
                      <p className="text-xs text-muted">{balance === undefined ? 'Checking balance…' : `${balance.toFixed(4)} SOL available`}</p>
                    </div>
                    <button type="button" onClick={() => void w.disconnect()} className="text-xs text-faint hover:text-muted" disabled={busy}>
                      Switch
                    </button>
                  </div>
                  {!walletsLoading && !isLinked && (
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-lantern/[0.08] p-3 text-sm">
                      <span className="text-lantern">Link this wallet to your account first — it’s how we know the payment is yours.</span>
                      <Button size="sm" intent="primary" loading={linking} onClick={() => void link()}>
                        Link
                      </Button>
                    </div>
                  )}
                  {isLinked && insufficient && (
                    <p className="flex items-start gap-2 rounded-xl bg-danger/10 p-3 text-sm text-danger">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                      <span>
                        Not enough SOL for this purchase.
                        {SOLANA_CLUSTER !== 'mainnet-beta' && (
                          <>
                            {' '}
                            <a href="https://faucet.solana.com" target="_blank" rel="noreferrer" className="underline">
                              Get devnet SOL
                            </a>
                          </>
                        )}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>

            {stage === 'error' && error && <p className="mt-4 rounded-xl bg-danger/10 px-3 py-2.5 text-sm text-danger">{error}</p>}

            <Button intent="go" size="lg" className="mt-5 w-full" disabled={!isLinked || insufficient || busy} onClick={() => void pay()}>
              {busy ? (
                <>
                  <Spinner /> {STAGE_COPY[stage]}
                </>
              ) : stage === 'error' ? (
                'Try again'
              ) : (
                `Pay ${priceSol} SOL`
              )}
            </Button>
            <p className="mt-3 text-center text-[11px] text-faint">Paid directly to {game.partner.name}. PlayPort never holds your funds.</p>
          </div>
        )}
    </Dialog>
  );
};
