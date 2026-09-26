import { ArrowLeft, Check, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/cn';
import { GameCover } from '@/features/market/GameCover';
import { BalanceChip, PaySheet } from '../PaySheet';

type Skin = { id: string; name: string; sol: number; tag?: string; owned?: boolean };
const SKINS: Skin[] = [
  { id: 'factory', name: 'Factory Issue', sol: 0, owned: true },
  { id: 'arctic', name: 'Arctic Camo', sol: 1.5 },
  { id: 'ember', name: 'Ember Dragon', sol: 2, tag: 'NEW' },
  { id: 'neon', name: 'Neon Circuit', sol: 3 },
];

const SkinDefs = () => (
  <defs>
    <linearGradient id="skin-factory" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#4A5059" />
      <stop offset="1" stopColor="#2A2E35" />
    </linearGradient>
    <pattern id="skin-arctic" width="60" height="40" patternUnits="userSpaceOnUse">
      <rect width="60" height="40" fill="#DCE6EE" />
      <path d="M5 8 q12 -8 22 2 t18 4 v10 q-14 6 -26 -2 t-14 -6z" fill="#9FB3C4" />
      <path d="M36 24 q10 -6 20 2 v12 h-24z" fill="#6E8599" />
    </pattern>
    <linearGradient id="skin-ember-base" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor="#5A0E06" />
      <stop offset="0.45" stopColor="#E0441B" />
      <stop offset="1" stopColor="#FFB547" />
    </linearGradient>
    {/* Dragon scales: overlapping arcs over a molten gradient, with a flame lick along the body. */}
    <pattern id="skin-ember-scales" width="22" height="14" patternUnits="userSpaceOnUse">
      <path d="M0 14 a11 11 0 0 1 22 0" fill="none" stroke="#3A0904" strokeWidth="1.6" opacity="0.5" />
      <path d="M-11 7 a11 11 0 0 1 22 0 M 11 7 a11 11 0 0 1 22 0" fill="none" stroke="#3A0904" strokeWidth="1.6" opacity="0.5" />
    </pattern>
    <pattern id="skin-ember" width="900" height="300" patternUnits="userSpaceOnUse">
      <rect width="900" height="300" fill="url(#skin-ember-base)" />
      <path d="M180 170 C 260 120 300 150 360 110 C 420 70 470 120 540 96 C 600 76 640 100 700 88" fill="none" stroke="#FFE2A6" strokeWidth="6" opacity="0.55" />
      <rect width="900" height="300" fill="url(#skin-ember-scales)" />
    </pattern>
    <pattern id="skin-neon" width="40" height="40" patternUnits="userSpaceOnUse">
      <rect width="40" height="40" fill="#0B0C10" />
      <path d="M0 20 h14 v-10 h12 M26 30 h14 M20 0 v8" fill="none" stroke="#7CF7FF" strokeWidth="2" />
      <circle cx="26" cy="10" r="2" fill="#FF3DB4" />
    </pattern>
  </defs>
);

/** Side-profile rifle, filled with the selected skin. */
const Rifle = ({ skin, className }: { skin: string; className?: string }) => (
  <svg viewBox="0 0 900 300" className={className} aria-hidden>
    <SkinDefs />
    <g fill={`url(#skin-${skin})`} stroke="#0B0C10" strokeWidth="3" strokeLinejoin="round" style={{ transition: 'fill 400ms' }}>
      <path d="M40 120 L 190 110 L 210 170 L 70 210 Q 40 200 40 170 Z" />
      <path d="M190 100 L 560 92 L 590 108 L 590 150 L 210 170 Z" />
      <path d="M590 112 L 820 112 L 820 132 L 590 136 Z" />
      <path d="M820 116 L 870 116 L 870 128 L 820 128 Z" />
      <path d="M390 150 L 450 150 L 470 260 L 410 268 Z" />
      <path d="M260 160 L 300 160 L 310 230 L 272 234 Z" />
      <rect x="300" y="60" width="200" height="32" rx="14" />
      <rect x="340" y="92" width="16" height="12" />
      <rect x="440" y="92" width="16" height="12" />
    </g>
    <circle cx="492" cy="76" r="9" fill="#7CF7FF" opacity="0.6" />
  </svg>
);

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div>
    <div className="flex justify-between text-[11px] tracking-[0.2em] text-[#FFE2A6]/60">
      <span>{label}</span>
      <span>{value}</span>
    </div>
    <div className="mt-1.5 h-1.5 rounded-full bg-white/10">
      <div className="h-full rounded-full bg-[#FFB547]" style={{ width: `${value}%` }} />
    </div>
  </div>
);

/** Staged studio screen: Breach Protocol's armory, selling a skin via Pay with PlayPort. */
export default function BreachArmory({ username }: { username: string }) {
  const [selected, setSelected] = useState('ember');
  const [equipped, setEquipped] = useState('factory');
  const [owned, setOwned] = useState<string[]>(['factory']);
  const [paying, setPaying] = useState(false);
  const skin = SKINS.find((s) => s.id === selected)!;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#140E09] font-mono text-[#FFF4E2]">
      <div className="absolute inset-0 opacity-30">
        <GameCover game={{ slug: 'breach-protocol', title: 'Breach Protocol', genres: ['shooter'], thumbnailUrl: null, bannerUrl: null }} variant="wide" showTitle={false} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-[#140E09] via-[#140E09]/85 to-[#140E09]/40" />

      <header className="relative flex items-center gap-10 border-b border-white/10 px-10 py-5">
        <p className="text-sm font-semibold tracking-[0.35em]">BREACH PROTOCOL</p>
        <nav className="flex gap-8 text-xs tracking-[0.25em] text-[#FFE2A6]/55">
          <span>PLAY</span>
          <span className="text-[#FFB547] underline decoration-2 underline-offset-8">ARMORY</span>
          <span>LOADOUT</span>
          <span>PROFILE</span>
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <BalanceChip />
          <span className="text-xs tracking-[0.2em] text-[#FFE2A6]/70">{username.toUpperCase()} · LVL 34</span>
        </div>
      </header>

      <main className="relative grid h-[calc(100%-73px)] grid-cols-[1.35fr_1fr] gap-10 px-10 py-8">
        <section className="flex flex-col">
          <p className="text-xs tracking-[0.3em] text-[#FFE2A6]/55">VK-7 ASSAULT RIFLE</p>
          <h1 className="mt-2 font-display text-6xl font-bold tracking-[-0.03em] [font-variation-settings:'wdth'_78]">{skin.name}</h1>
          <div className="relative mt-4 flex-1">
            <div className={cn('absolute inset-0 rounded-full blur-3xl transition-colors duration-700', selected === 'ember' ? 'bg-[#E0441B]/25' : selected === 'neon' ? 'bg-[#7CF7FF]/15' : 'bg-white/5')} />
            <Rifle skin={selected} className="relative mx-auto w-full max-w-[820px] drop-shadow-[0_30px_40px_rgba(0,0,0,.6)]" />
          </div>
          <div className="grid max-w-xl grid-cols-3 gap-6">
            <Stat label="DAMAGE" value={72} />
            <Stat label="FIRE RATE" value={64} />
            <Stat label="CONTROL" value={58} />
          </div>
          <Link to="/" className="mt-8 inline-flex items-center gap-2 text-xs tracking-[0.25em] text-[#FFE2A6]/60 hover:text-[#FFE2A6]">
            <ArrowLeft className="size-4" /> BACK TO PLAYPORT
          </Link>
        </section>

        <aside className="flex flex-col">
          <p className="text-xs tracking-[0.3em] text-[#FFE2A6]/55">SKINS</p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            {SKINS.map((s) => {
              const isOwned = owned.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-label={`Skin ${s.name}`}
                  onClick={() => setSelected(s.id)}
                  className={cn('pressable relative rounded-2xl border bg-black/40 p-4 text-left transition-colors duration-150', selected === s.id ? 'border-[#FFB547]' : 'border-white/10 hover:border-white/25')}
                >
                  {s.tag && !isOwned && <span className="absolute top-3 right-3 rounded bg-[#FFB547] px-1.5 py-0.5 text-[10px] font-bold text-[#140E09]">{s.tag}</span>}
                  <Rifle skin={s.id} className="h-20 w-full" />
                  <p className="mt-2 text-sm">{s.name}</p>
                  <p className="text-xs text-[#FFE2A6]/60">{isOwned ? (equipped === s.id ? 'Equipped' : 'Owned') : `${s.sol} SOL`}</p>
                </button>
              );
            })}
          </div>
          <div className="mt-auto rounded-2xl border border-white/10 bg-black/40 p-5">
            {owned.includes(selected) ? (
              <p className="flex items-center gap-2 text-sm text-[#7CFFB2]">
                <Check className="size-4" /> {equipped === selected ? `${skin.name} equipped` : 'Owned'}
              </p>
            ) : (
              <>
                <div className="flex items-baseline justify-between">
                  <p className="text-sm text-[#FFE2A6]/70">Price</p>
                  <p className="text-3xl font-semibold">{skin.sol} SOL</p>
                </div>
                <button type="button" onClick={() => setPaying(true)} className="pressable mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#FFB547] text-sm font-bold tracking-[0.2em] text-[#140E09]">
                  <Sparkles className="size-4" /> BUY FOR {skin.sol} SOL
                </button>
                <p className="mt-2 text-center text-[11px] text-[#FFE2A6]/50">Pay with PlayPort · no card, no top-up</p>
              </>
            )}
          </div>
        </aside>
      </main>

      <PaySheet
        open={paying}
        game="Breach Protocol"
        gameSlug="breach-protocol"
        item={`${skin.name} skin`}
        sol={skin.sol}
        art={<Rifle skin={selected} className="w-[110%]" />}
        onClose={() => setPaying(false)}
        onPaid={() => {
          setOwned((o) => [...o, selected]);
          setEquipped(selected);
          setPaying(false);
        }}
      />
    </div>
  );
}
