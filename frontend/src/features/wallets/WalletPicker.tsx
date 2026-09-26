import type { WalletName } from '@solana/wallet-adapter-base';
import { ArrowUpRight, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/cn';
import { useWalletActions } from './useWalletActions';

const INSTALL = [
  { name: 'Phantom', url: 'https://phantom.com/download' },
  { name: 'Solflare', url: 'https://solflare.com/download' },
  { name: 'Backpack', url: 'https://backpack.app/download' },
  { name: 'Jupiter', url: 'https://jup.ag/mobile' },
];

type Props = {
  /** Called with the chosen wallet; the picker shows a spinner until it settles. */
  onPick: (name: WalletName) => Promise<unknown>;
  cta?: string;
};

/** Lists every Solana wallet the browser exposes via the Wallet Standard. */
export const WalletPicker = ({ onPick, cta = 'Sign a message to continue — it costs nothing.' }: Props) => {
  const { detected } = useWalletActions();
  const [busy, setBusy] = useState<string | null>(null);

  const pick = async (name: WalletName) => {
    setBusy(name);
    try {
      await onPick(name);
    } finally {
      setBusy(null);
    }
  };

  if (detected.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted">No Solana wallet found in this browser. Install one, then refresh:</p>
        <div className="grid grid-cols-2 gap-2">
          {INSTALL.map((w) => (
            <a
              key={w.name}
              href={w.url}
              target="_blank"
              rel="noreferrer"
              className="pressable flex items-center justify-between rounded-2xl border border-line bg-veil/[0.02] px-4 py-3 text-sm hover:border-line-strong hover:bg-veil/[0.05]"
            >
              {w.name}
              <ArrowUpRight className="size-4 text-muted" />
            </a>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {detected.map(({ adapter }) => (
          <li key={adapter.name}>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void pick(adapter.name)}
              className={cn(
                'pressable group flex w-full items-center gap-3 rounded-2xl border border-line bg-veil/[0.02] px-3 py-3 text-left transition-colors duration-150 hover:border-line-strong hover:bg-veil/[0.05] disabled:opacity-60',
                busy === adapter.name && 'border-go/40 bg-go/[0.06] opacity-100',
              )}
            >
              <img src={adapter.icon} alt="" className="size-9 rounded-xl" />
              <span className="flex-1">
                <span className="block text-[15px] font-medium">{adapter.name}</span>
                <span className="block text-xs text-muted">{busy === adapter.name ? 'Check your wallet…' : 'Detected'}</span>
              </span>
              {busy === adapter.name ? <Spinner className="text-go-fg" /> : <ChevronRight className="size-4 text-faint transition-transform duration-150 group-hover:translate-x-0.5" />}
            </button>
          </li>
        ))}
      </ul>
      <p className="pt-1 text-center text-xs text-faint">{cta}</p>
    </div>
  );
};
