import { Star, Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDate, lamportsToSol, shortAddress } from '@/lib/format';
import { useGamerProfile, useGames, useMe, usePayments, useUnlinkWallet, useUpdateProfile, useUpdateWallet, useWallets } from '@/lib/queries';
import { SOLANA_CLUSTER } from '@/features/wallets/solana';
import { useWalletActions } from '@/features/wallets/useWalletActions';
import { WalletPicker } from '@/features/wallets/WalletPicker';

const Section = ({ id, title, description, children }: { id?: string; title: string; description?: string; children: React.ReactNode }) => (
  <section id={id} className="scroll-mt-24 grid gap-6 border-t border-line py-10 lg:grid-cols-[280px_1fr]">
    <div>
      <h2 className="font-display text-xl font-semibold tracking-[-0.02em]">{title}</h2>
      {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
    </div>
    <div>{children}</div>
  </section>
);

const inputClass =
  'h-11 w-full rounded-xl border border-line-strong bg-ink-2 px-3.5 text-[15px] outline-none placeholder:text-faint focus:border-go/60 focus:shadow-[0_0_0_3px_rgb(20_241_149/0.15)]';

const Profile = () => {
  const { data: profile } = useGamerProfile();
  const update = useUpdateProfile();
  const [form, setForm] = useState({ username: '', displayName: '', bio: '' });

  useEffect(() => {
    if (profile) setForm({ username: profile.username, displayName: profile.displayName ?? '', bio: profile.bio ?? '' });
  }, [profile]);

  if (!profile) return <p className="text-sm text-muted">This account has no gamer profile.</p>;

  const save = (e: FormEvent) => {
    e.preventDefault();
    update.mutate(
      { username: form.username, displayName: form.displayName || undefined, bio: form.bio || null },
      { onSuccess: () => toast.success('Profile saved'), onError: (err) => toast.error(errorMessage(err)) },
    );
  };

  return (
    <form onSubmit={save} className="grid max-w-xl gap-4">
      <label className="block">
        <span className="mb-1.5 block text-[13px] text-muted">Username</span>
        <input className={inputClass} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[13px] text-muted">Display name</span>
        <input className={inputClass} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[13px] text-muted">Bio</span>
        <textarea rows={3} className={cn(inputClass, 'h-auto py-3')} value={form.bio} maxLength={500} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
      </label>
      <div>
        <Button type="submit" intent="primary" loading={update.isPending}>
          Save profile
        </Button>
      </div>
    </form>
  );
};

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
                  {w.isPrimary && <span className="rounded-md bg-go/10 px-1.5 py-0.5 font-sans text-[11px] text-go">Primary</span>}
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
              p.status === 'confirmed' ? 'bg-go/10 text-go' : p.status === 'pending' ? 'bg-lantern/10 text-lantern' : 'bg-white/5 text-muted',
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

export default function AccountPage() {
  const { data: me } = useMe();
  useEffect(() => {
    if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
  }, []);

  return (
    <div className="mx-auto max-w-[1100px] px-4 pt-10 sm:px-8">
      <p className="eyebrow mb-2">Account</p>
      <h1 className="text-[clamp(2.2rem,4.5vw,3.5rem)] leading-none font-bold tracking-[-0.035em] [font-variation-settings:'wdth'_85]">{me?.displayName ?? 'Your account'}</h1>
      <p className="mt-3 text-sm text-muted">
        {me?.email ?? 'Wallet account'}
        {me?.email && !me.emailVerifiedAt && <span className="ml-2 rounded-md bg-lantern/10 px-1.5 py-0.5 text-[11px] text-lantern">Unverified</span>}
      </p>
      <div className="mt-10">
        <Section title="Profile" description="How other players see you.">
          <Profile />
        </Section>
        <Section id="wallets" title="Wallets" description="Linked wallets can sign you in and pay for games.">
          <Wallets />
        </Section>
        <Section title="Purchases" description="Every payment, with its on-chain receipt.">
          <Purchases />
        </Section>
      </div>
    </div>
  );
}
