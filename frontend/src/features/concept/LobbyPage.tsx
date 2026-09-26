import NumberFlow from '@number-flow/react';
import { Check, Lock, Shield, Swords } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { shortAddress } from '@/lib/format';
import { useGame } from '@/lib/queries';
import { GameCover } from '@/features/market/GameCover';
import { useWalletActions } from '@/features/wallets/useWalletActions';
import { useConcept } from './flag';
import { ESCROW_ADDRESS, matchQuery, readMatch } from './match';
import { PayoutBreakdown } from './Payout';

const PlayerCard = ({ name, locked, you, stake, accent }: { name: string; locked: boolean; you: boolean; stake: number; accent: string }) => (
  <div className={cn('flex-1 rounded-2xl border p-5 transition-colors duration-300', locked ? 'border-go/40 bg-go/[0.05]' : 'border-line bg-surface')}>
    <div className="flex items-center gap-3">
      <span className="grid size-12 place-items-center rounded-full font-display text-lg font-bold text-[#16150f] uppercase" style={{ background: accent }}>
        {name.slice(0, 1)}
      </span>
      <div>
        <p className="font-medium">
          @{name} {you && <span className="text-faint">(you)</span>}
        </p>
        <p className={cn('flex items-center gap-1.5 text-sm', locked ? 'text-go-fg' : 'text-muted')}>
          {locked ? (
            <>
              <Lock className="size-3.5" /> {stake} SOL locked
            </>
          ) : (
            <>
              <Spinner className="size-3.5" /> Waiting to stake
            </>
          )}
        </p>
      </div>
    </div>
  </div>
);

/** Staged lobby: both stakes into escrow, then hand-off to the studio's game server. */
export default function LobbyPage() {
  const { id = '' } = useParams();
  const [search] = useSearchParams();
  const m = readMatch(id, search);
  const { data: game } = useGame(m.game);
  const { hostLocked: hostFlag, guestLocked, launching, set } = useConcept();
  // The invite only goes out after the host has staked, so the guest always sees it locked.
  const hostLocked = m.role === 'guest' || hostFlag;
  const w = useWalletActions();
  const navigate = useNavigate();
  const [accepting, setAccepting] = useState(false);
  const [count, setCount] = useState(3);
  const bothLocked = hostLocked && guestLocked;
  const pot = (hostLocked ? m.stake : 0) + (guestLocked ? m.stake : 0);

  // Once both stakes are in and the director cues launch, count down and hand off.
  useEffect(() => {
    if (!launching) return;
    if (count === 0) {
      navigate(`/concept/match/${m.id}?${matchQuery(m)}`);
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 900);
    return () => clearTimeout(t);
  }, [launching, count, m, navigate]);

  const accept = async () => {
    if (!w.signMessage) return;
    setAccepting(true);
    try {
      await w.signMessage(new TextEncoder().encode(`PlayPort escrow\nMatch ${m.id}\nLock ${m.stake} SOL vs @${m.host}`));
      set({ guestLocked: true });
      toast.success(`${m.stake} SOL locked in escrow`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1100px] px-4 pt-10 sm:px-8">
      <p className="eyebrow mb-2 flex items-center gap-2">
        <Swords className="size-3.5" /> Match {m.id} · 1v1 wager
      </p>
      <h1 className="text-[clamp(2rem,4vw,3rem)] leading-none font-bold tracking-[-0.035em] [font-variation-settings:'wdth'_85]">{game?.title ?? 'Match lobby'}</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <div className="flex items-stretch gap-3">
            <PlayerCard name={m.host} locked={hostLocked} you={m.role === 'host'} stake={m.stake} accent="linear-gradient(140deg,#FFB547,#FF5A4E)" />
            <span className="grid place-items-center font-display text-xl font-bold text-faint">VS</span>
            <PlayerCard name={m.guest} locked={guestLocked} you={m.role === 'guest'} stake={m.stake} accent="linear-gradient(140deg,#7CF7FF,#9945FF)" />
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm text-muted">
                <Shield className="size-4" /> Escrow {shortAddress(ESCROW_ADDRESS, 5)}
              </p>
              <p className={cn('text-xs', bothLocked ? 'text-go-fg' : 'text-muted')}>{bothLocked ? 'Fully funded' : 'Funding'}</p>
            </div>
            <p className="mt-3 font-display text-5xl font-bold tracking-[-0.03em] tabular-nums">
              <NumberFlow value={pot} suffix=" SOL" />
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-veil/[0.06]">
              <div className="h-full rounded-full bg-go transition-[width] duration-700 ease-(--ease-out)" style={{ width: `${(pot / (m.stake * 2)) * 100}%` }} />
            </div>
            <p className="mt-3 text-xs text-faint">Neither player — nor PlayPort — can move these funds until the studio reports the result.</p>
          </div>

          {m.role === 'guest' && !guestLocked && (
            <Button intent="go" size="lg" className="w-full" loading={accepting} onClick={() => void accept()}>
              <Lock /> Accept & lock {m.stake} SOL
            </Button>
          )}
          {bothLocked && (
            <div className="flex items-center justify-between rounded-2xl border border-go/40 bg-go/[0.06] p-5">
              <p className="flex items-center gap-2 font-medium">
                <Check className="size-4 text-go-fg" /> Match ready
              </p>
              <p className="font-mono text-sm text-muted">{launching ? `Joining ${game?.partner.name ?? 'the studio'} server in ${count}…` : 'Waiting for the server…'}</p>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          {game && (
            <div className="aspect-[2/3] overflow-hidden rounded-2xl ring-1 ring-veil/10">
              <GameCover game={game} />
            </div>
          )}
          <PayoutBreakdown stake={m.stake} studio={game?.partner.name ?? 'Studio'} />
        </aside>
      </div>
    </div>
  );
}
