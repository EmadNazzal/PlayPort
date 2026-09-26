import NumberFlow from '@number-flow/react';
import { ArrowLeft, Bomb } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/cn';
import { BalanceChip, PaySheet } from '../PaySheet';

const COLORS = ['#FF4F8B', '#FFB547', '#4FB8FF', '#6BD66B', '#B07CFF'];
const COLS = 8;
const ROWS = 8;

/** Deterministic starting board with no free matches, so the "out of moves" moment is honest. */
const initialBoard = () => {
  let seed = 7;
  const next = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const board: number[] = [];
  for (let i = 0; i < ROWS * COLS; i++) {
    let c: number;
    do c = Math.floor(next() * COLORS.length);
    while ((i % COLS >= 2 && board[i - 1] === c && board[i - 2] === c) || (i >= COLS * 2 && board[i - COLS] === c && board[i - COLS * 2] === c));
    board.push(c);
  }
  return board;
};

const Candy = ({ color }: { color: number }) => {
  const fill = COLORS[color];
  return (
    <svg viewBox="0 0 60 60" className="h-full w-full drop-shadow-[0_4px_4px_rgba(90,30,58,.25)]" aria-hidden>
      {color === 0 && <circle cx="30" cy="30" r="24" fill={fill} />}
      {color === 1 && (
        <>
          <path d="M8 30 L 0 18 L 0 42 Z M 52 30 L 60 18 L 60 42 Z" fill={fill} />
          <ellipse cx="30" cy="30" rx="22" ry="18" fill={fill} />
          <path d="M18 18 L 26 42 M 30 16 L 38 44" stroke="#fff" strokeOpacity="0.5" strokeWidth="4" />
        </>
      )}
      {color === 2 && <path d="M30 4 L 54 26 L 30 56 L 6 26 Z" fill={fill} />}
      {color === 3 && <rect x="8" y="8" width="44" height="44" rx="12" fill={fill} />}
      {color === 4 && <path d="M30 4 L 37 22 L 56 23 L 41 35 L 46 54 L 30 43 L 14 54 L 19 35 L 4 23 L 23 22 Z" fill={fill} />}
      <ellipse cx="22" cy="20" rx="8" ry="4.5" fill="#fff" opacity="0.7" transform="rotate(-30 22 20)" />
    </svg>
  );
};

/** Staged studio screen: a match-3 level, out of moves, rescued by a power-up bought with SOL. */
export default function Sugarfall() {
  const [board] = useState(initialBoard);
  const [paying, setPaying] = useState(false);
  const [bought, setBought] = useState(false);
  const [popped, setPopped] = useState(false);
  const [score, setScore] = useState(18_760);
  const target = 20_000;

  const detonate = () => {
    setBought(true);
    setTimeout(() => setPopped(true), 700);
    setTimeout(() => setScore((s) => s + 1_860), 900);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[linear-gradient(160deg,#FFB3D1,#FFE9C7_60%,#FFD7F0)] font-sans text-[#5A1E3A]">
      <div className="pointer-events-none absolute -top-20 -left-20 size-96 rounded-full bg-white/40 blur-3xl" />
      <header className="relative flex items-center gap-8 px-10 py-5">
        <p className="bg-[linear-gradient(90deg,#FF4F8B,#FFB547)] bg-clip-text font-display text-4xl font-extrabold tracking-[-0.03em] text-transparent">Sugarfall</p>
        <span className="rounded-full bg-white/60 px-4 py-1.5 text-sm font-semibold">Level 212</span>
        <div className="ml-auto flex items-center gap-4">
          <BalanceChip className="text-white" />
        </div>
      </header>

      <main className="relative grid h-[calc(100%-88px)] grid-cols-[300px_1fr_300px] items-center gap-10 px-10 pb-8">
        <div className="space-y-4">
          <div className="rounded-3xl bg-white/70 p-5 shadow-[0_10px_30px_-10px_rgba(90,30,58,.3)]">
            <p className="text-xs font-bold tracking-[0.2em] text-[#5A1E3A]/60 uppercase">Score</p>
            <p className="mt-1 font-display text-4xl font-bold tabular-nums">
              <NumberFlow value={score} />
            </p>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#5A1E3A]/10">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,#FF4F8B,#FFB547)] transition-[width] duration-1000 ease-(--ease-out)" style={{ width: `${Math.min(100, (score / target) * 100)}%` }} />
            </div>
            <p className="mt-2 text-xs text-[#5A1E3A]/60">Target {target.toLocaleString()}</p>
          </div>
          <div className="rounded-3xl bg-white/70 p-5 shadow-[0_10px_30px_-10px_rgba(90,30,58,.3)]">
            <p className="text-xs font-bold tracking-[0.2em] text-[#5A1E3A]/60 uppercase">Moves left</p>
            <p className={cn('mt-1 font-display text-4xl font-bold', !bought && 'text-[#FF4F8B]')}>0</p>
          </div>
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#5A1E3A]/70 hover:text-[#5A1E3A]">
            <ArrowLeft className="size-4" /> Back to PlayPort
          </Link>
        </div>

        <div className="relative mx-auto aspect-square h-full max-h-[720px] rounded-[36px] bg-white/45 p-4 shadow-[inset_0_2px_20px_rgba(255,255,255,.8),0_30px_60px_-20px_rgba(90,30,58,.35)] backdrop-blur-sm">
          <div className="grid h-full grid-cols-8 grid-rows-8 gap-1.5">
            {board.map((c, i) => {
              const hit = popped && c === 0;
              return (
                <div key={i} className="relative rounded-xl bg-white/35 p-1">
                  <div
                    className={cn('h-full w-full transition-[transform,opacity] ease-(--ease-out)', hit ? 'scale-[1.6] opacity-0 duration-500' : 'duration-300')}
                    style={{ transitionDelay: hit ? `${(i % COLS) * 30 + Math.floor(i / COLS) * 20}ms` : undefined }}
                  >
                    <Candy color={c} />
                  </div>
                  {hit && <div className="absolute inset-0 animate-rise [animation-delay:600ms]"><Candy color={(i * 7) % 4 + 1} /></div>}
                </div>
              );
            })}
          </div>

          {!bought && (
            <div className="absolute inset-0 grid place-items-center rounded-[36px] bg-[#5A1E3A]/35 backdrop-blur-[2px]">
              <div className="w-[380px] animate-rise rounded-[28px] bg-white p-7 text-center shadow-2xl">
                <p className="font-display text-3xl font-extrabold">Out of moves!</p>
                <p className="mt-2 text-sm text-[#5A1E3A]/70">{(target - score).toLocaleString()} points to go. A Color Bomb clears every candy of one colour.</p>
                <div className="mx-auto mt-5 grid size-20 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#6b6b8a,#1d1b2e)] shadow-[0_0_30px_rgba(255,79,139,.6)]">
                  <Bomb className="size-9 text-white" />
                </div>
                <p className="mt-3 text-sm font-semibold">Color Bomb ×3</p>
                <button type="button" onClick={() => setPaying(true)} className="pressable mt-5 h-14 w-full rounded-2xl bg-[linear-gradient(90deg,#FF4F8B,#FF7A59)] text-base font-bold text-white shadow-[0_10px_20px_-6px_rgba(255,79,139,.7)]">
                  Get it for 1 SOL
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white/70 p-5 shadow-[0_10px_30px_-10px_rgba(90,30,58,.3)]">
          <p className="text-xs font-bold tracking-[0.2em] text-[#5A1E3A]/60 uppercase">Goal</p>
          <p className="mt-2 text-sm">Reach {target.toLocaleString()} points</p>
          {score >= target && <p className="mt-6 animate-rise font-display text-3xl font-extrabold text-[#FF4F8B]">Level complete!</p>}
        </div>
      </main>

      <PaySheet
        open={paying}
        game="Sugarfall"
        gameSlug="sugarfall"
        item="Color Bomb ×3"
        sol={1}
        art={<Bomb className="size-8 text-[#FF7FB0]" />}
        onClose={() => setPaying(false)}
        onPaid={() => {
          setPaying(false);
          detonate();
        }}
      />
    </div>
  );
}
