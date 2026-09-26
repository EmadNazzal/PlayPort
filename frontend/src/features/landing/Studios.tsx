import NumberFlow from '@number-flow/react';
import { useInView } from 'motion/react';
import { useRef } from 'react';
import { useGames } from '@/lib/queries';

const Stat = ({ value, suffix, label, active, decimals = 0 }: { value: number; suffix?: string; label: string; active: boolean; decimals?: number }) => (
  <div className="border-t border-line pt-5">
    <p className="font-display text-[clamp(2.8rem,5vw,4.5rem)] leading-none font-bold tracking-[-0.04em] tabular-nums [font-variation-settings:'wdth'_80]">
      <NumberFlow value={active ? value : 0} suffix={suffix} format={{ maximumFractionDigits: decimals, minimumFractionDigits: decimals }} />
    </p>
    <p className="mt-3 text-sm text-muted">{label}</p>
  </div>
);

export const Studios = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  const { data: games } = useGames();
  const studios = new Set(games?.map((g) => g.partner.id)).size;

  return (
    <section id="studios" className="scroll-mt-10 border-y border-line bg-ink-2">
      <div className="mx-auto grid max-w-[1400px] gap-16 px-5 py-24 sm:px-8 sm:py-32 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="eyebrow mb-5">For studios</p>
          <h2 className="text-[clamp(2.4rem,5vw,4.5rem)] leading-[0.92] font-bold tracking-[-0.04em] [font-variation-settings:'wdth'_82]">
            Keep your servers.
            <br />
            Keep your players.
            <br />
            <span className="text-lantern">Get paid in seconds.</span>
          </h2>
          <ul className="mt-10 max-w-lg space-y-4 text-muted">
            {[
              'Your game stays on your infrastructure — we send players to your launch URL.',
              'Payments land directly in your payout wallet. PlayPort never holds funds.',
              'Invite your team with owner, admin and developer roles; automate with scoped API keys.',
            ].map((line) => (
              <li key={line} className="flex gap-3">
                <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-lantern" />
                {line}
              </li>
            ))}
          </ul>
        </div>
        <div ref={ref} className="grid grid-cols-2 gap-x-8 gap-y-12 self-end">
          <Stat value={games?.length ?? 0} label="Games live" active={inView} />
          <Stat value={studios} label="Independent studios" active={inView} />
          <Stat value={0} suffix="%" label="Funds held by PlayPort" active={inView} />
          <Stat value={0.4} suffix="s" decimals={1} label="Typical Solana settlement" active={inView} />
        </div>
      </div>
    </section>
  );
};
