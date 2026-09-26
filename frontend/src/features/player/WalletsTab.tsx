import { Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { errorMessage } from '@/lib/api';
import { formatDate, shortAddress } from '@/lib/format';
import { useMe, useUnlinkWallet, useUpdateWallet, useWallets } from '@/lib/queries';
import { useWalletActions } from '@/features/wallets/useWalletActions';
import { WalletPicker } from '@/features/wallets/WalletPicker';

const Wallets = () => {
  const { data: wallets = [], isPending } = useWallets();
  const { data: me } = useMe();
  const { linkWallet } = useWalletActions();
  const updateWallet = useUpdateWallet();
  const unlink = useUnlinkWallet();
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-3">
      {isPending ? (
        <div className="h-16 animate-pulse rounded-2xl bg-surface" />
      ) : wallets.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line-strong p-6 text-sm text-muted">No wallets linked yet. Link one to buy paid games or sign in without a password.</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
          {wallets.map((w) => (
            <li key={w.id} className="flex items-center gap-4 bg-surface/50 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-mono text-sm">
                  {shortAddress(w.address, 6)}
                  {w.isPrimary && <span className="rounded-md bg-go/10 px-1.5 py-0.5 font-sans text-[11px] text-go-fg">Primary</span>}
                </p>
                <p className="text-xs text-muted">
                  {w.label ?? 'Solana wallet'} · linked {formatDate(w.createdAt)}
                </p>
              </div>
              {!w.isPrimary && (
                <Button size="sm" intent="quiet" onClick={() => updateWallet.mutate({ id: w.id, isPrimary: true })} aria-label="Make primary">
                  <Star />
                </Button>
              )}
              <Button
                size="sm"
                intent="quiet"
                aria-label="Unlink wallet"
                onClick={() =>
                  unlink.mutate(w.id, {
                    onSuccess: () => toast.success('Wallet unlinked'),
                    onError: (err) => toast.error(errorMessage(err)),
                  })
                }
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Button intent="ghost" onClick={() => setAdding(true)}>
        Link a wallet
      </Button>
      {!me?.hasPassword && wallets.length === 1 && <p className="text-xs text-faint">This wallet is your only way to sign in, so it can’t be removed.</p>}
      <Dialog open={adding} onOpenChange={setAdding} title="Link a wallet" description="Sign a one-time message to prove it’s yours. No transaction, no fee.">
        <div className="mt-6">
          <WalletPicker
            onPick={async (name) => {
              try {
                const address = await linkWallet(name);
                toast.success(`Linked ${shortAddress(address)}`);
                setAdding(false);
              } catch (err) {
                toast.error(errorMessage(err));
              }
            }}
          />
        </div>
      </Dialog>
    </div>
  );
};

export default function WalletsTab() {
  return (
    <div className="max-w-3xl">
      <p className="mb-6 text-sm text-muted">Linked wallets can sign you in and pay for games. Proving ownership is a free signature — never a transaction.</p>
      <Wallets />
    </div>
  );
}
