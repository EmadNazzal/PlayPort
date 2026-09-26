import Lenis from 'lenis';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router';
import { Button, buttonStyles } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { ShaderField } from '@/components/ShaderField';
import { SolMark } from '@/components/ui/SolMark';
import { cn } from '@/lib/cn';
import { useGames } from '@/lib/queries';
import { useSession } from '@/lib/session';
import { useAuthDialog } from '@/features/auth/authDialogStore';
import { Faq } from './Faq';
import { HowItWorks } from './HowItWorks';
import { Montage } from './Montage';
import { Picks } from './Picks';
import { Studios } from './Studios';

// Stable references: the shader re-initialises if these change identity.
const HERO_COLORS: [string, string, string] = ['#06070A', '#12414B', '#FFB547'];
const CTA_COLORS: [string, string, string] = ['#06070A', '#0E3B2C', '#14F195'];

/** Smooth, momentum scrolling for the marketing page only — never in the store. */
const useLenis = () => {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({ lerp: 0.12, anchors: true });
    let raf = requestAnimationFrame(function loop(t) {
      lenis.raf(t);
      raf = requestAnimationFrame(loop);
    });
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);
};

/** Splits a line into words that rise in with a short stagger. */
const SplitWords = ({ text, delay = 0, className }: { text: string; delay?: number; className?: string }) => (
  <span className={cn('block', className)}>
    {text.split(' ').map((word, i) => (
      <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
        <span className="inline-block animate-rise" style={{ animationDelay: `${delay + i * 70}ms` }}>
          {word}&nbsp;
        </span>
      </span>
    ))}
  </span>
);

const Nav = () => {
  const token = useSession((s) => s.token);
  const show = useAuthDialog((s) => s.show);
  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <nav className="mx-auto flex h-20 max-w-[1400px] items-center justify-between px-5 sm:px-8">
        <Link to="/" aria-label="PlayPort home">
          <Logo />
        </Link>
        <div className="hidden items-center gap-8 text-sm text-muted md:flex">
          <a href="#how" className="transition-colors duration-150 hover:text-text">How it works</a>
          <a href="#studios" className="transition-colors duration-150 hover:text-text">For studios</a>
          <a href="#faq" className="transition-colors duration-150 hover:text-text">FAQ</a>
          <Link to="/market" className="transition-colors duration-150 hover:text-text">Market</Link>
        </div>
        <div className="flex items-center gap-2">
          {token ? (
            <Link to="/market" className={buttonStyles({ intent: 'primary', size: 'sm' })}>
              Go to market <ArrowRight />
            </Link>
          ) : (
            <>
              <Button intent="quiet" size="sm" onClick={() => show({ tab: 'email', mode: 'signin' })}>
                Sign in
              </Button>
              <Button intent="primary" size="sm" onClick={() => show({ tab: 'email', mode: 'signup' })}>
                Sign up
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};

const Hero = () => {
  const show = useAuthDialog((s) => s.show);
  const token = useSession((s) => s.token);
  const { data: games } = useGames();
  const studios = new Set(games?.map((g) => g.partner.id)).size;

  return (
    <section className="grain relative isolate flex min-h-[100svh] flex-col overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <ShaderField colors={HERO_COLORS} />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-transparent to-ink" />
      </div>

      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col justify-end px-5 pt-32 pb-16 sm:px-8 sm:pb-24">
        <p className="eyebrow mb-6 flex items-center gap-2 animate-rise">
          <span className="relative flex size-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-go opacity-60 [animation-duration:2s]" />
            <span className="relative size-2 rounded-full bg-go" />
          </span>
          Open tonight on Solana{games ? ` · ${games.length} games from ${studios} studios` : ''}
        </p>

        <h1 className="font-display text-[clamp(3.4rem,11vw,10.5rem)] leading-[0.86] font-bold tracking-[-0.045em] [font-variation-settings:'wdth'_78,'opsz'_96]">
          <SplitWords text="A night market" delay={80} />
          <SplitWords text="for games." delay={300} className="text-lantern italic [font-variation-settings:'wdth'_100,'opsz'_96] font-light" />
        </h1>

        <div className="mt-10 flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <p className="max-w-md text-[17px] leading-relaxed text-text/75 animate-rise [animation-delay:600ms]">
            Discover worlds built by independent studios. Pay straight from your Solana wallet. Play them where they live.
          </p>
          <div className="flex flex-col items-start gap-3 animate-rise [animation-delay:720ms] sm:flex-row sm:items-center">
            {token ? (
              <Link to="/market" className={buttonStyles({ intent: 'go', size: 'lg' })}>
                Enter the market <ArrowRight />
              </Link>
            ) : (
              <>
                <Button intent="go" size="lg" onClick={() => show({ tab: 'wallet' })}>
                  <SolMark /> Continue with wallet
                </Button>
                <Button intent="ghost" size="lg" onClick={() => show({ tab: 'email', mode: 'signup' })}>
                  Sign up with email
                </Button>
              </>
            )}
          </div>
        </div>
        {!token && (
          <Link to="/market" className="mt-8 inline-flex items-center gap-1.5 self-start text-sm text-muted transition-colors duration-150 hover:text-text md:self-end animate-rise [animation-delay:820ms]">
            or browse the market first <ArrowUpRight className="size-3.5" />
          </Link>
        )}
      </div>
    </section>
  );
};

const FinalCta = () => {
  const show = useAuthDialog((s) => s.show);
  const token = useSession((s) => s.token);
  return (
    <section className="grain relative isolate overflow-hidden border-t border-line">
      <div className="absolute inset-0 -z-10 opacity-80">
        <ShaderField colors={CTA_COLORS} pointerStrength={0.6} />
        <div className="absolute inset-0 bg-gradient-to-b from-ink via-ink/30 to-ink" />
      </div>
      <div className="mx-auto max-w-[1400px] px-5 py-32 text-center sm:px-8 sm:py-44">
        <p className="eyebrow mb-6">The stalls are open</p>
        <h2 className="mx-auto max-w-5xl text-[clamp(2.6rem,7vw,6.5rem)] leading-[0.92] font-bold tracking-[-0.04em] [font-variation-settings:'wdth'_80]">
          Your wallet is your <span className="font-light text-go italic [font-variation-settings:'wdth'_100]">ticket in.</span>
        </h2>
        <div className="mt-12 flex justify-center">
          {token ? (
            <Link to="/market" className={buttonStyles({ intent: 'go', size: 'lg' })}>
              Enter the market <ArrowRight />
            </Link>
          ) : (
            <Button intent="go" size="lg" onClick={() => show({ tab: 'wallet' })}>
              <SolMark /> Continue with wallet
            </Button>
          )}
        </div>
      </div>
    </section>
  );
};

const Footer = () => (
  <footer className="border-t border-line">
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-5 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <Logo className="text-text" />
      <p className="text-faint">Games are hosted by their studios. PlayPort never holds your funds or your keys.</p>
      <p className="font-mono text-xs text-faint">© {new Date().getFullYear()} PlayPort</p>
    </div>
  </footer>
);

export default function LandingPage() {
  useLenis();
  return (
    <div className="overflow-x-clip">
      <Nav />
      <main>
        <Hero />
        <Montage />
        <HowItWorks />
        <Picks />
        <Studios />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
