import { Tabs } from '@base-ui/react/tabs';
import { Mail } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { TextMorph } from 'torph/react';
import { Dialog } from '@/components/ui/Dialog';
import { SolMark } from '@/components/ui/SolMark';
import { errorMessage } from '@/lib/api';
import { WalletPicker } from '@/features/wallets/WalletPicker';
import { useWalletActions } from '@/features/wallets/useWalletActions';
import { useAuthDialog } from './authDialogStore';
import { EmailForm } from './EmailForm';

export const AuthDialog = () => {
  const { open, setOpen, mode, setMode, tab, setTab, returnTo } = useAuthDialog();
  const { signInWithWallet } = useWalletActions();
  const navigate = useNavigate();

  const done = () => {
    setOpen(false);
    navigate(returnTo);
  };

  const heading = tab === 'wallet' ? 'Sign in to PlayPort' : mode === 'signup' ? 'Create your account' : 'Welcome back';

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title={<TextMorph as="span">{heading}</TextMorph>}
      description={tab === 'wallet' ? 'New wallets get an account automatically. No password needed.' : 'Use email now; you can link a wallet any time.'}
    >
      <Tabs.Root value={tab} onValueChange={(v) => setTab(v as 'wallet' | 'email')} className="mt-6">
        <Tabs.List className="relative grid grid-cols-2 rounded-2xl bg-ink-2 p-1 ring-1 ring-line">
          <Tabs.Tab value="wallet" className="relative z-10 flex h-9 items-center justify-center gap-2 rounded-xl text-sm text-muted transition-colors duration-150 data-[active]:text-text">
            <SolMark className="size-3.5" /> Wallet
          </Tabs.Tab>
          <Tabs.Tab value="email" className="relative z-10 flex h-9 items-center justify-center gap-2 rounded-xl text-sm text-muted transition-colors duration-150 data-[active]:text-text">
            <Mail className="size-3.5" /> Email
          </Tabs.Tab>
          <Tabs.Indicator className="absolute top-1 left-0 h-9 w-(--active-tab-width) translate-x-(--active-tab-left) rounded-xl bg-raised ring-1 ring-line-strong transition-[translate,width] duration-250 ease-(--ease-out)" />
        </Tabs.List>

        <Tabs.Panel value="wallet" className="mt-5 outline-none">
          <WalletPicker
            onPick={async (name) => {
              try {
                const tokens = await signInWithWallet(name);
                toast.success(tokens.isNewUser ? 'Account created — welcome to PlayPort' : 'Signed in with your wallet');
                done();
              } catch (err) {
                toast.error(errorMessage(err));
              }
            }}
          />
        </Tabs.Panel>
        <Tabs.Panel value="email" className="mt-5 outline-none">
          <EmailForm mode={mode} onModeChange={setMode} onDone={(to) => { setOpen(false); navigate(to ?? returnTo); }} />
        </Tabs.Panel>
      </Tabs.Root>
      <p className="mt-6 text-center text-[11px] leading-relaxed text-faint">
        By continuing you agree to the PlayPort terms. We never ask for your seed phrase.
      </p>
    </Dialog>
  );
};
