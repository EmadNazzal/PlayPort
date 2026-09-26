import { ArrowUpRight, Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { Reveal } from '@/components/Reveal';
import { SolMark } from '@/components/ui/SolMark';

const Step = ({ n, title, body, visual }: { n: string; title: string; body: string; visual: ReactNode }) => (
  <Reveal as="li" variant="clip" className="border-t border-line">
    <div className="grid gap-8 py-12 md:grid-cols-[120px_1fr_1fr] md:items-center">
      <span className="font-mono text-sm text-faint">{n}</span>
      <div>
        <h3 className="text-[clamp(1.8rem,3.2vw,2.75rem)] leading-none font-semibold tracking-[-0.03em]">{title}</h3>
        <p className="mt-4 max-w-md leading-relaxed text-muted">{body}</p>
      </div>
      <div className="md:justify-self-end">{visual}</div>
    </div>
  </Reveal>
);

const SignVisual = () => (
  <div className="w-[300px] rounded-2xl border border-line-strong bg-surface p-4 font-mono text-[11px] leading-relaxed shadow-2xl">
    <div className="mb-3 flex items-center gap-2 text-muted">
      <SolMark className="size-3.5" /> Signature request
    </div>
    <p className="text-text/80">playport.gg wants you to sign in with your Solana account:</p>
    <p className="mt-1 text-lantern">7xKX…q9Pd</p>
    <p className="mt-2 text-faint">Nonce: 4f1c…a90e · expires in 5 min</p>
    <div className="mt-4 grid grid-cols-2 gap-2 font-sans text-xs">
      <span className="rounded-lg bg-white/5 py-2 text-center text-muted">Cancel</span>
      <span className="rounded-lg bg-go py-2 text-center font-medium text-ink">Sign</span>
    </div>
  </div>
);

const PickVisual = () => (
  <div className="flex w-[300px] items-center gap-3 rounded-2xl border border-line-strong bg-surface p-3 shadow-2xl">
    <div className="size-14 rounded-xl bg-[radial-gradient(circle_at_30%_30%,#FFB35C,#6E2A12_60%,#0E0906)]" />
    <div className="flex-1">
      <p className="text-sm font-medium">Ashen Crown</p>
      <p className="text-xs text-muted">Ember Forge</p>
    </div>
    <span className="rounded-lg bg-go/10 px-2 py-1 font-mono text-xs text-go">1.8 SOL</span>
  </div>
);

const PlayVisual = () => (
  <div className="w-[300px] rounded-2xl border border-go/30 bg-go/[0.06] p-4 shadow-2xl">
    <p className="flex items-center gap-2 text-sm text-go">
      <Check className="size-4" /> Payment confirmed on-chain
    </p>
    <p className="mt-3 flex items-center justify-between rounded-xl bg-ink/60 px-3 py-2.5 text-sm">
      Play on emberforge.gg <ArrowUpRight className="size-4 text-muted" />
    </p>
  </div>
);

export const HowItWorks = () => (
  <section id="how" className="mx-auto max-w-[1400px] scroll-mt-10 px-5 py-24 sm:px-8 sm:py-32">
    <p className="eyebrow mb-5">How it works</p>
    <h2 className="max-w-3xl text-[clamp(2.4rem,5.5vw,4.75rem)] leading-[0.92] font-bold tracking-[-0.04em] [font-variation-settings:'wdth'_82]">
      Three moves. <span className="text-muted">No middlemen.</span>
    </h2>
    <ol className="mt-16">
      <Step n="01" title="Connect" body="Sign in with Phantom, Solflare, Backpack or any Solana wallet — or plain email. Signing a message proves it's you, and costs nothing." visual={<SignVisual />} />
      <Step n="02" title="Pick" body="Browse games from independent studios. Prices are in SOL, with a live dollar estimate. Plenty are free." visual={<PickVisual />} />
      <Step n="03" title="Play" body="Pay straight from your wallet to the studio. We verify it on-chain in seconds, the game joins your library, and you play it on the studio's own site." visual={<PlayVisual />} />
    </ol>
  </section>
);
