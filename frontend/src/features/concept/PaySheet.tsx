import NumberFlow from '@number-flow/react';
import { Check, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LogoMark } from '@/components/ui/Logo';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/cn';
import { shortAddress } from '@/lib/format';
import { useWalletActions } from '@/features/wallets/useWalletActions';
import { useConcept } from './flag';

type Props = {
  open: boolean;
  game: string;
  gameSlug: string;
  item: string;
  sol: number;
  art: ReactNode;
  onClose: () => void;
  onPaid: () => void;
};

/**
 * Staged "Pay with PlayPort" checkout that a partner game opens in-game (an SDK in the real
 * product). Always PlayPort-styled, so players recognise it inside any studio's UI.
 */
export const PaySheet = ({ open, game, gameSlug, item, sol, art, onClose, onPaid }: Props) => {
  const w = useWalletActions();
  const { balance, spend } = useConcept();
  const [stage, setStage] = useState<'review' | 'signing' | 'done'>('review');
  const address = w.publicKey?.toBase58();

  const pay = async () => {
    if (!w.signMessage) return;
    setStage('signing');
    try {
      await w.signMessage(new TextEncoder().encode(`PlayPort Pay\n${game} · ${item}\nPay ${sol} SOL to the studio`));
      spend({ game, gameSlug, item, sol });
      setStage('done');
      setTimeout(() => {
        onPaid();
        setStage('review');
      }, 1100);
    } catch {
      setStage('review');
    }
  };

  return (
    <div className={cn('fixed inset-0 z-[60] grid place-items-center bg-black/55 backdrop-blur-[3px] transition-opacity duration-200', open ? 'opacity-100' : 'pointer-events-none opacity-0')}>
      <div
        data-theme="dark"
        className={cn(
          'w-[420px] rounded-3xl border border-white/15 bg-[#15171D] p-6 font-sans text-[#F2EFE9] shadow-[0_40px_120px_-20px_rgb(0_0_0/0.85)] transition-[transform,opacity] duration-300 ease-(--ease-out)',
          open ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
        )}
      >
        <div className="flex items-center gap-2.5">
          <LogoMark className="size-6 text-[#F2EFE9]" />
          <span className="font-display text-lg font-bold tracking-[-0.02em]">Pay with PlayPort</span>
          <span className="ml-auto text-xs text-[#8C8F99]">{game}</span>
        </div>

        {stage === 'done' ? (
          <div className="flex flex-col items-center py-10 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-[#14F195] text-[#06140d]">
              <Check className="size-7" strokeWidth={3} />
            </span>
            <p className="mt-4 font-display text-xl font-semibold">Paid {sol} SOL</p>
            <p className="mt-1 text-sm text-[#8C8F99]">{item} is yours</p>
          </div>
        ) : (
          <>
            <div className="mt-5 flex items-center gap-4 rounded-2xl border border-white/10 bg-black/25 p-3">
              <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/5">{art}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item}</p>
                <p className="text-xs text-[#8C8F99]">Sold by {game}</p>
              </div>
              <p className="font-mono text-lg">{sol} SOL</p>
            </div>
            <dl className="mt-4 space-y-2 px-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-[#8C8F99]">From wallet</dt>
                <dd className="font-mono">{address ? shortAddress(address, 5) : 'Not connected'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#8C8F99]">Balance</dt>
                <dd className="font-mono tabular-nums">
                  {balance} → <span className="text-[#14F195]"><NumberFlow value={balance - sol} format={{ maximumFractionDigits: 2 }} /></span> SOL
                </dd>
              </div>
            </dl>
            <div className="mt-6 grid grid-cols-[1fr_2fr] gap-2">
              <button type="button" onClick={onClose} disabled={stage === 'signing'} className="pressable h-12 rounded-2xl bg-white/[0.06] text-sm hover:bg-white/[0.1]">
                Cancel
              </button>
              <button type="button" onClick={() => void pay()} disabled={stage === 'signing'} className="pressable flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#14F195] text-[15px] font-semibold text-[#06140d]">
                {stage === 'signing' ? (
                  <>
                    <Spinner /> Approve in wallet
                  </>
                ) : (
                  `Pay ${sol} SOL`
                )}
              </button>
            </div>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-[#8C8F99]">
              <ShieldCheck className="size-3" /> Paid straight to the studio · receipt in your PlayPort wallet
            </p>
          </>
        )}
      </div>
    </div>
  );
};

/**
 * The PlayPort balance chip a partner game shows in its HUD via the SDK. When the balance drops
 * it pulses and floats the delta, so the change reads at a glance.
 */
export const BalanceChip = ({ className }: { className?: string }) => {
  const balance = useConcept((s) => s.balance);
  const prev = useRef(balance);
  const [delta, setDelta] = useState<{ value: number; key: number } | null>(null);

  useEffect(() => {
    if (balance === prev.current) return;
    const d = balance - prev.current;
    prev.current = balance;
    setDelta({ value: d, key: Date.now() });
    const t = setTimeout(() => setDelta(null), 2600);
    return () => clearTimeout(t);
  }, [balance]);

  return (
    <span className="relative inline-flex">
      <span
        className={cn(
          'inline-flex items-center gap-2 rounded-full bg-black/50 py-1.5 pr-3.5 pl-1.5 text-sm ring-2 ring-transparent backdrop-blur-md transition-[box-shadow,transform] duration-300',
          delta && 'scale-110 shadow-[0_0_0_4px_rgb(20_241_149/0.35),0_0_30px_rgb(20_241_149/0.45)]',
          className,
        )}
      >
        <span className="grid size-6 place-items-center rounded-full bg-[#F2EFE9]">
          <LogoMark className="size-4 text-[#0B0C10]" />
        </span>
        <span className="font-mono tabular-nums">
          <NumberFlow value={balance} format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} suffix=" SOL" />
        </span>
      </span>
      {delta && (
        <span key={delta.key} className="absolute top-full right-2 mt-2 animate-rise rounded-full bg-[#14F195] px-2.5 py-1 font-mono text-xs font-bold whitespace-nowrap text-[#06140d] shadow-lg">
          {delta.value.toFixed(2)} SOL
        </span>
      )}
    </span>
  );
};
