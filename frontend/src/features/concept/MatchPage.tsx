import { Loader2, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { cn } from '@/lib/cn';
import { HEROES } from '@/features/market/poster/heroes';
import { matchQuery, readMatch } from './match';

/**
 * Staged "studio game server" — deliberately not PlayPort-branded. A short scripted final
 * round of a fictional tactical shooter, from each player's point of view, then the server
 * reports the result and sends both players back to PlayPort.
 *
 * Driven by timers + CSS transitions (not rAF) so it plays smoothly while being recorded.
 */
const TIMELINE = { enemy: 1400, fire: 2500, kill: 3100, banner: 3500, report: 5000, leave: 7200 };

const Operator = ({ className }: { className?: string }) => (
  <svg viewBox="-160 -330 320 340" className={className} aria-hidden>
    <g fill="#1A120B" style={{ filter: 'drop-shadow(0 0 6px rgb(255 190 110 / .7))' }}>{HEROES.operator.body}</g>
  </svg>
);

export default function MatchPage() {
  const { id = '' } = useParams();
  const [search] = useSearchParams();
  const m = readMatch(id, search);
  const navigate = useNavigate();
  const host = m.role === 'host';
  const [t, setT] = useState<keyof typeof TIMELINE | 'start'>('start');
  const [clock, setClock] = useState(24);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const timers = Object.entries(TIMELINE).map(([k, ms]) => setTimeout(() => setT(k as keyof typeof TIMELINE), ms));
    const shots = [0, 140, 280].map((d) =>
      setTimeout(() => {
        setFlash(true);
        setTimeout(() => setFlash(false), 70);
      }, TIMELINE.fire + d),
    );
    const tick = setInterval(() => setClock((c) => Math.max(0, c - 1)), 1000);
    const leave = setTimeout(() => navigate(`/concept/settle/${m.id}?${matchQuery(m)}`), TIMELINE.leave + 600);
    return () => {
      [...timers, ...shots, leave].forEach(clearTimeout);
      clearInterval(tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const order: (keyof typeof TIMELINE | 'start')[] = ['start', 'enemy', 'fire', 'kill', 'banner', 'report', 'leave'];
  const at = (k: keyof typeof TIMELINE) => order.indexOf(t) >= order.indexOf(k);
  const score = at('kill') ? (host ? '13 : 9' : '9 : 13') : host ? '12 : 9' : '9 : 12';
  const me = host ? m.host : m.guest;
  const them = host ? m.guest : m.host;
  const hurt = !host && at('fire');

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#1A120B] font-mono text-[#FFF4E2] select-none">
      {/* First-person scene: a sun-baked corridor converging on a doorway. */}
      <div className="absolute inset-0 animate-[sway_4s_ease-in-out_infinite]">
        <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
          <defs>
            <linearGradient id="m-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3B2A1A" />
              <stop offset="1" stopColor="#E8A45C" />
            </linearGradient>
            <radialGradient id="m-sun" cx="0.5" cy="0.35" r="0.5">
              <stop offset="0" stopColor="#FFE2A6" stopOpacity="0.9" />
              <stop offset="1" stopColor="#FFE2A6" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="1600" height="900" fill="url(#m-sky)" />
          <rect width="1600" height="900" fill="url(#m-sun)" />
          <path d="M0 0 L 620 300 L 620 640 L 0 900 Z" fill="#8A5A33" />
          <path d="M1600 0 L 980 300 L 980 640 L 1600 900 Z" fill="#6E4526" />
          <path d="M0 900 L 620 640 L 980 640 L 1600 900 Z" fill="#3A2716" />
          <path d="M620 300 L 980 300 L 980 640 L 620 640 Z" fill="#B97A45" />
          <path d="M720 640 L 720 400 Q 800 330 880 400 L 880 640 Z" fill="#2A1B10" />
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1={620 * f} y1={300 * f} x2={620 * f} y2={900 - 260 * f} stroke="#6E4526" strokeWidth="3" opacity="0.6" />
          ))}
          <rect x="120" y="560" width="160" height="150" fill="#5C3B20" />
          <rect x="140" y="480" width="110" height="90" fill="#6E4526" />
        </svg>
        <div
          className={cn(
            'absolute top-[43%] left-1/2 h-[30%] -translate-x-1/2 transition-all duration-500 ease-out',
            at('enemy') ? 'opacity-100' : 'translate-y-4 opacity-0',
            at('kill') && host && 'rotate-[-70deg] opacity-0 duration-700',
          )}
        >
          <Operator className="h-full" />
        </div>
      </div>

      {/* Damage vignette for the player who gets hit. */}
      <div className={cn('pointer-events-none absolute inset-0 transition-opacity duration-300', hurt ? 'opacity-100' : 'opacity-0')} style={{ background: 'radial-gradient(circle at 50% 50%, transparent 35%, rgb(200 20 20 / .55))' }} />
      <div className={cn('pointer-events-none absolute inset-0 bg-[#FFE2A6] mix-blend-overlay transition-opacity duration-75', flash && host ? 'opacity-40' : 'opacity-0')} />

      {/* Weapon viewmodel with recoil. */}
      <svg viewBox="0 0 600 400" className={cn('absolute right-[6%] bottom-[-4%] w-[38%] transition-transform duration-75', flash && host && 'translate-x-2 translate-y-3 -rotate-2')} aria-hidden>
        <path d="M600 400 L 170 150 L 150 120 L 240 110 L 340 170 L 380 150 L 600 260 Z" fill="#1d1510" />
        <path d="M170 150 L 60 96 L 70 80 L 180 128 Z" fill="#2a2018" />
        <rect x="300" y="190" width="70" height="120" rx="8" transform="rotate(28 330 250)" fill="#15100c" />
        {flash && host && <circle cx="52" cy="86" r="30" fill="#FFE2A6" opacity="0.95" />}
      </svg>

      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-1/2">
        <span className="absolute top-1/2 left-0 h-0.5 w-2 -translate-y-1/2 bg-[#7CFFB2]" />
        <span className="absolute top-1/2 right-0 h-0.5 w-2 -translate-y-1/2 bg-[#7CFFB2]" />
        <span className="absolute top-0 left-1/2 h-2 w-0.5 -translate-x-1/2 bg-[#7CFFB2]" />
        <span className="absolute bottom-0 left-1/2 h-2 w-0.5 -translate-x-1/2 bg-[#7CFFB2]" />
      </div>

      {/* HUD */}
      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-6">
        <div className="text-xs tracking-[0.3em] text-[#FFE2A6]/80">
          BREACH PROTOCOL
          <br />
          <span className="text-[10px] tracking-[0.2em] text-[#FFE2A6]/50">IRONCLAD RANKED · EU-WEST · MATCH {m.id}</span>
        </div>
        <div className="rounded-md bg-black/45 px-5 py-2 text-center backdrop-blur-sm">
          <p className="text-[10px] tracking-[0.3em] text-[#FFE2A6]/60">
            {me.toUpperCase()} vs {them.toUpperCase()}
          </p>
          <p className="text-2xl font-semibold tabular-nums">{score}</p>
          <p className="text-xs tabular-nums text-[#FFE2A6]/70">0:{String(clock).padStart(2, '0')}</p>
        </div>
        <div className="w-64 space-y-1.5 text-right text-xs">
          {at('kill') && (
            <p className="inline-block animate-rise rounded bg-black/55 px-2.5 py-1">
              <span className="text-[#FFB547]">{m.host}</span> ⌖ <span className="text-[#7CF7FF]">{m.guest}</span> <span className="text-[#FF6B5E]">HEADSHOT</span>
            </p>
          )}
        </div>
      </div>

      <div className="absolute bottom-6 left-6 flex items-end gap-6">
        <div>
          <p className="text-[10px] tracking-[0.3em] text-[#FFE2A6]/60">HEALTH</p>
          <p className={cn('text-4xl font-semibold tabular-nums transition-colors', hurt && 'text-[#FF6B5E]')}>{hurt ? (at('kill') ? 0 : 38) : 100}</p>
        </div>
        <div>
          <p className="text-[10px] tracking-[0.3em] text-[#FFE2A6]/60">ARMOR</p>
          <p className="text-4xl font-semibold tabular-nums">{hurt ? 0 : 64}</p>
        </div>
      </div>
      <div className="absolute right-6 bottom-6 text-right">
        <p className="text-[10px] tracking-[0.3em] text-[#FFE2A6]/60">AMMO</p>
        <p className="text-4xl font-semibold tabular-nums">{host && at('kill') ? '27' : '30'}<span className="text-lg text-[#FFE2A6]/50"> / 90</span></p>
      </div>

      {at('enemy') && !at('banner') && (
        <p className="absolute top-[18%] left-1/2 -translate-x-1/2 animate-rise text-sm tracking-[0.4em] text-[#FFE2A6]">MATCH POINT · {host ? m.host.toUpperCase() : m.host.toUpperCase()}</p>
      )}

      {at('banner') && (
        <div className="absolute inset-0 grid place-items-center bg-black/35">
          <div className="animate-rise text-center">
            <p className={cn('font-display text-8xl font-bold tracking-[-0.03em] [font-variation-settings:"wdth"_76]', host ? 'text-[#FFB547]' : 'text-[#FF6B5E]')}>{host ? 'VICTORY' : 'DEFEAT'}</p>
            <p className="mt-2 text-sm tracking-[0.3em] text-[#FFE2A6]/80">{host ? `YOU WIN 13 – 9` : `KILLED BY ${m.host.toUpperCase()} · 9 – 13`}</p>
            {at('report') && (
              <div className="mt-10 inline-flex animate-rise items-center gap-3 rounded-xl bg-black/60 px-5 py-3 text-left text-xs">
                <Loader2 className="size-4 animate-spin text-[#FFE2A6]" />
                <span>
                  Reporting result to PlayPort…
                  <span className="mt-0.5 flex items-center gap-1 text-[#FFE2A6]/60">
                    <ShieldCheck className="size-3" /> signed with Ironclad server key
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      <style>{`@keyframes sway { 0%,100% { transform: translate(0,0) scale(1.03) } 50% { transform: translate(-10px,6px) scale(1.03) } }`}</style>
    </div>
  );
}
