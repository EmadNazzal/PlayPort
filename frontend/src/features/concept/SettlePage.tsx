import NumberFlow from '@number-flow/react';
import { ArrowUpRight, Check, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { buttonStyles } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/cn';
import { shortAddress } from '@/lib/format';
import { useGame } from '@/lib/queries';
import { ESCROW_ADDRESS, payout, readMatch } from './match';

const STEPS = ['Result received from the studio', 'Studio signature verified', 'Escrow released', 'Payouts sent'];
const TX = '5Kx9mZ2vQ7pLrT4yWn8cB3dF6hJ1sA0eUgRkVoXiN2MqHtPwYzCbDf';

/** Staged settlement: the studio reports the winner, escrow pays out. */
export default function SettlePage() {
  const { id = '' } = useParams();
  const [search] = useSearchParams();
  const m = readMatch(id, search);
  const { data: game } = useGame(m.game);
  const studio = game?.partner.name ?? 'Studio';
  const p = payout(m.stake);
  const won = m.role === 'host'; // the staged match is won by the host
  const [step, setStep] = useState(0);
  const done = step >= STEPS.length;

  useEffect(() => {
    if (done) return;
    const t = setTimeout(() => setStep((s) => s + 1), 900);
    return () => clearTimeout(t);
  }, [step, done]);

  const rows = [
    { who: `@${m.host}`, what: 'Winner', amount: p.winner, accent: true },
    { who: studio, what: 'Studio fee (10% of pot, after PlayPort’s cut)', amount: p.studio },
    { who: 'PlayPort', what: '10% of the studio fee', amount: p.platform },
  ];

  return (
    <div className="mx-auto max-w-[1100px] px-4 pt-10 sm:px-8">
      <p className="eyebrow mb-2">Match {m.id} · settlement</p>
      <h1 className="text-[clamp(2rem,4vw,3rem)] leading-none font-bold tracking-[-0.035em] [font-variation-settings:'wdth'_85]">
        {done ? (won ? 'You won.' : 'GG — not this time.') : 'Settling your match…'}
      </h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1fr]">
        <ol className="space-y-3 self-start rounded-2xl border border-line bg-surface p-5">
          {STEPS.map((label, i) => (
            <li key={label} className={cn('flex items-center gap-3 text-sm transition-opacity duration-300', i > step && 'opacity-40')}>
              <span className={cn('grid size-6 place-items-center rounded-full', i < step ? 'bg-go text-on-go' : 'bg-veil/[0.06]')}>
                {i < step ? <Check className="size-3.5" strokeWidth={3} /> : i === step ? <Spinner className="size-3.5" /> : null}
              </span>
              <span className="flex-1">{label}</span>
              {i === 0 && <span className="text-xs text-faint">{studio} · {m.host} won 13–9</span>}
            </li>
          ))}
          <li className="border-t border-line pt-3 font-mono text-xs text-faint">
            Escrow {shortAddress(ESCROW_ADDRESS, 5)} → tx {shortAddress(TX, 6)}
          </li>
        </ol>

        <div className={cn('rounded-2xl border p-6 transition-[border-color,background-color] duration-500', done && won ? 'border-go/40 bg-go/[0.05]' : 'border-line bg-surface')}>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">{won ? 'You receive' : 'Your result'}</p>
            {done && won && <Trophy className="size-5 text-lantern-fg" />}
          </div>
          <p className={cn('mt-2 font-display text-6xl font-bold tracking-[-0.04em] tabular-nums', won ? 'text-go-fg' : 'text-text')}>
            <NumberFlow value={done ? (won ? p.winner : -m.stake) : 0} format={{ signDisplay: 'always', maximumFractionDigits: 2 }} suffix=" SOL" />
          </p>
          <p className="mt-1 text-sm text-muted">{won ? `${p.pot} SOL pot − ${p.fee} SOL studio fee` : `Your ${m.stake} SOL stake went to @${m.host}`}</p>

          <div className="mt-6 divide-y divide-line rounded-xl border border-line bg-ink-2 px-4">
            {rows.map((r) => (
              <div key={r.who} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm">{r.who}</p>
                  <p className="text-xs text-faint">{r.what}</p>
                </div>
                <p className={cn('font-mono text-sm tabular-nums', r.accent && 'text-go-fg')}>
                  <NumberFlow value={done ? r.amount : 0} format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} prefix="+" suffix=" SOL" />
                </p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex gap-2">
            <Link to={`/games/${m.game}`} className={buttonStyles({ intent: won ? 'primary' : 'go' })}>
              {won ? 'Play again' : 'Rematch'}
            </Link>
            <span className={buttonStyles({ intent: 'ghost' })}>
              Receipt <ArrowUpRight />
            </span>
          </div>
        </div>
      </div>
      <p className="mt-8 text-center text-xs text-faint">Concept demo · staged settlement on devnet</p>
    </div>
  );
}
