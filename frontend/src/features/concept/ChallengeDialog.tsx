import { useQuery } from '@tanstack/react-query';
import { Check, Search, Swords } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { inputClass } from '@/components/ui/Field';
import { api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useGamerProfile } from '@/lib/queries';
import type { Game } from '@/lib/types';
import { useWalletActions } from '@/features/wallets/useWalletActions';
import { WalletPicker } from '@/features/wallets/WalletPicker';
import { useConcept } from './flag';
import { matchQuery } from './match';
import { PayoutBreakdown } from './Payout';

const STAKES = [1, 5, 10];
export const DEMO_MATCH_ID = '7Q4F';

type Props = { game: Game; open: boolean; onOpenChange: (o: boolean) => void };

/** Staged: pick an opponent, set a stake, lock it and send the invite. */
export const ChallengeDialog = ({ game, open, onOpenChange }: Props) => {
  const navigate = useNavigate();
  const { data: me } = useGamerProfile();
  const w = useWalletActions();
  const [query, setQuery] = useState('');
  const [opponent, setOpponent] = useState<string | null>(null);
  const [stake, setStake] = useState(5);
  const [locking, setLocking] = useState(false);

  // Real lookup against the public profile endpoint, so only actual players can be picked.
  const handle = query.trim().replace(/^@/, '').toLowerCase();
  const { data: found } = useQuery({
    queryKey: ['gamer-lookup', handle],
    queryFn: () => api<{ username: string; displayName: string | null }>(`/gamers/${handle}`),
    enabled: handle.length >= 3 && !opponent,
    retry: false,
  });

  const lockAndInvite = async () => {
    if (!opponent || !w.signMessage) return;
    setLocking(true);
    try {
      await w.signMessage(new TextEncoder().encode(`PlayPort escrow\nMatch ${DEMO_MATCH_ID} · ${game.title}\nLock ${stake} SOL vs @${opponent}`));
      useConcept.getState().set({ hostLocked: true });
      onOpenChange(false);
      toast.success(`Invite sent to @${opponent}`, { description: `${stake} SOL locked in escrow` });
      navigate(`/concept/lobby/${DEMO_MATCH_ID}?${matchQuery({ game: game.slug, host: me?.username ?? 'you', guest: opponent, stake, role: 'host' })}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLocking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Challenge a player" description={`Head-to-head on ${game.title}. Winner takes the pot.`} className="max-w-lg">
      <div className="mt-6 space-y-5">
        <div>
          <p className="eyebrow mb-2">Opponent</p>
          {opponent ? (
            <div className="flex items-center gap-3 rounded-2xl border border-go/40 bg-go/[0.06] p-3">
              <span className="grid size-10 place-items-center rounded-full bg-[linear-gradient(140deg,#7CF7FF,#9945FF)] font-display font-bold text-[#16150f] uppercase">{opponent.slice(0, 1)}</span>
              <div className="flex-1">
                <p className="font-medium">@{opponent}</p>
                <p className="text-xs text-muted">Online · ranked 1v1</p>
              </div>
              <button type="button" onClick={() => setOpponent(null)} className="text-xs text-muted hover:text-text">
                Change
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="relative block">
                <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by username" className={cn(inputClass, 'h-11 border-line-strong pl-10')} />
              </label>
              {found && (
                <button type="button" onClick={() => setOpponent(found.username)} className="pressable flex w-full items-center gap-3 rounded-2xl border border-line bg-veil/[0.02] p-3 text-left hover:border-line-strong">
                  <span className="grid size-9 place-items-center rounded-full bg-[linear-gradient(140deg,#7CF7FF,#9945FF)] font-display text-sm font-bold text-[#16150f] uppercase">{found.username.slice(0, 1)}</span>
                  <span className="flex-1 text-sm">@{found.username}</span>
                  <span className="text-xs text-go-fg">Invite</span>
                </button>
              )}
            </div>
          )}
        </div>

        <div>
          <p className="eyebrow mb-2">Stake each</p>
          <div className="grid grid-cols-3 gap-2">
            {STAKES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStake(s)}
                className={cn('pressable h-12 rounded-xl border font-mono text-sm transition-colors duration-150', stake === s ? 'border-text bg-text text-ink' : 'border-line hover:border-line-strong')}
              >
                {s} SOL
              </button>
            ))}
          </div>
        </div>

        <PayoutBreakdown stake={stake} studio={game.partner.name} />

        {!w.publicKey ? (
          <WalletPicker onPick={(name) => w.connect(name)} cta="Connect the wallet you'll stake from." />
        ) : (
          <Button intent="go" size="lg" className="w-full" disabled={!opponent} loading={locking} onClick={() => void lockAndInvite()}>
            {opponent ? (
              <>
                <Swords /> Lock {stake} SOL & send invite
              </>
            ) : (
              'Pick an opponent'
            )}
          </Button>
        )}
        <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-faint">
          <Check className="size-3" /> Stakes sit in an on-chain escrow until the studio reports the result.
        </p>
      </div>
    </Dialog>
  );
};
