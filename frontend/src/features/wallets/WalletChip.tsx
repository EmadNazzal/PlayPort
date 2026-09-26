import { Menu } from '@base-ui/react/menu';
import { ChevronDown, Copy, Link2, LogOut, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { errorMessage } from '@/lib/api';
import { shortAddress } from '@/lib/format';
import { useWallets } from '@/lib/queries';
import { useSession } from '@/lib/session';
import { useWalletActions } from './useWalletActions';
import { WalletPicker } from './WalletPicker';

const menuItem = 'flex cursor-default items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-text/85 outline-none data-[highlighted]:bg-veil/[0.07] data-[highlighted]:text-text';

/** Connected-wallet chip. Solana purple appears here and only here, as a 1px ring. */
export const WalletChip = () => {
  const { publicKey, wallet, disconnect, connect } = useWalletActions();
  const token = useSession((s) => s.token);
  const { data: linked } = useWallets();
  const [picking, setPicking] = useState(false);

  if (!publicKey) {
    return (
      <>
        <Button intent="ghost" size="sm" onClick={() => setPicking(true)}>
          <Wallet /> <span className="hidden md:inline">Connect</span>
        </Button>
        <Dialog open={picking} onOpenChange={setPicking} title="Connect a wallet" description="Connecting only shares your address. You'll sign when you pay or link it.">
          <div className="mt-6">
            <WalletPicker
              cta="You can switch wallets any time."
              onPick={async (name) => {
                try {
                  await connect(name);
                  setPicking(false);
                } catch (err) {
                  toast.error(errorMessage(err));
                }
              }}
            />
          </div>
        </Dialog>
      </>
    );
  }

  const address = publicKey.toBase58();
  const isLinked = linked?.some((w) => w.address === address);

  return (
    <Menu.Root>
      <Menu.Trigger className="pressable group relative flex h-8 items-center gap-2 rounded-full bg-surface pr-2.5 pl-1 text-[13px] before:absolute before:-inset-px before:-z-10 before:rounded-full before:bg-[linear-gradient(120deg,var(--color-wallet),var(--color-go))] before:content-['']">
        {wallet && <img src={wallet.adapter.icon} alt="" className="size-6 rounded-full" />}
        <span className="font-mono">{shortAddress(address)}</span>
        <ChevronDown className="size-3.5 text-muted transition-transform duration-150 group-data-[popup-open]:rotate-180" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="end" className="z-50">
          <Menu.Popup className="popup-scale w-60 rounded-2xl border border-line-strong bg-raised p-1.5 shadow-2xl outline-none">
            <div className="px-2.5 pt-1.5 pb-2.5">
              <p className="text-xs text-muted">{wallet?.adapter.name}</p>
              <p className="mt-0.5 font-mono text-[13px]">{shortAddress(address, 6)}</p>
              {token && (
                <p className={`mt-2 inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] ${isLinked ? 'bg-go/10 text-go-fg' : 'bg-lantern/10 text-lantern-fg'}`}>
                  {isLinked ? 'Linked to your account' : 'Not linked yet'}
                </p>
              )}
            </div>
            <Menu.Separator className="my-1 h-px bg-line" />
            <Menu.Item
              className={menuItem}
              onClick={() => {
                void navigator.clipboard.writeText(address);
                toast.success('Address copied');
              }}
            >
              <Copy className="size-4 text-muted" /> Copy address
            </Menu.Item>
            {token && (
              <>
                <Menu.Item className={menuItem} render={<Link to="/player/wallet" />}>
                  <Wallet className="size-4 text-muted" /> Wallet & activity
                </Menu.Item>
                <Menu.Item className={menuItem} render={<Link to="/player/wallets" />}>
                  <Link2 className="size-4 text-muted" /> Manage wallets
                </Menu.Item>
              </>
            )}
            <Menu.Item className={menuItem} onClick={() => void disconnect()}>
              <LogOut className="size-4 text-muted" /> Disconnect
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
};
