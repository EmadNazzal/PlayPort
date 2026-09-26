import { ArrowLeft, ArrowUpRight, Check, Globe, Monitor, ShieldCheck, Smartphone } from 'lucide-react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Price } from '@/components/ui/Price';
import { errorMessage } from '@/lib/api';
import { formatDate, isFree, PLATFORM_LABELS, titleCase } from '@/lib/format';
import { useClaimGame, useGame, useGames, useLibrary, useMe } from '@/lib/queries';
import { useSession } from '@/lib/session';
import { useAuthDialog } from '@/features/auth/authDialogStore';
import { CheckoutDialog } from './CheckoutDialog';
import { GameCard } from './GameCard';
import { GameCover } from './GameCover';
import { Rail, RailItem } from './Rail';

const platformIcon = (p: string) => (p === 'web' ? Globe : p === 'ios' || p === 'android' ? Smartphone : Monitor);

export default function GameDetailPage() {
  const { slug = '' } = useParams();
  const { data: game, isPending, isError } = useGame(slug);
  const { data: all = [] } = useGames();
  const { data: library = [] } = useLibrary();
  const { data: me } = useMe();
  const token = useSession((s) => s.token);
  const showAuth = useAuthDialog((s) => s.show);
  const claim = useClaimGame();
  const [checkout, setCheckout] = useState(false);

  const hero = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: hero, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '18%']);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, reduce ? 1 : 0.35]);

  if (isPending) return <div className="mx-auto mt-6 aspect-[21/9] max-w-[1400px] animate-pulse rounded-3xl bg-surface" />;
  if (isError || !game) {
    return (
      <div className="mx-auto max-w-xl px-4 py-32 text-center">
        <p className="font-display text-3xl font-semibold">This stall is closed.</p>
        <p className="mt-2 text-muted">The game may have been unpublished.</p>
        <Link to="/" className="mt-6 inline-block text-sm text-go-fg">Back to the store</Link>
      </div>
    );
  }

  const owned = library.find((l) => l.gameId === game.id);
  const isGamer = me?.roles.includes('gamer') ?? true;
  const similar = all.filter((g) => g.id !== game.id && g.genres.some((x) => game.genres.includes(x))).slice(0, 10);
  const studioHost = (() => {
    try {
      return owned ? new URL(owned.launchUrl).host : null;
    } catch {
      return null;
    }
  })();

  const play = () => {
    const url = owned?.launchUrl ?? library.find((l) => l.gameId === game.id)?.launchUrl;
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  const primary = () => {
    if (!token) return showAuth({ returnTo: `/games/${game.slug}` });
    if (owned) return play();
    if (isFree(game.priceLamports)) {
      return claim.mutate(game.id, {
        onSuccess: () => toast.success(`${game.title} added to your library`),
        onError: (err) => toast.error(errorMessage(err)),
      });
    }
    setCheckout(true);
  };

  const cta = owned ? 'Play now' : !token ? 'Sign in to get this game' : isFree(game.priceLamports) ? 'Add to library' : 'Buy now';

  return (
    <div>
      <div ref={hero} className="relative isolate h-[62vh] min-h-[420px] overflow-hidden">
        <motion.div style={{ y, opacity: fade }} className="absolute inset-0 -z-10">
          <GameCover game={game} variant="wide" showTitle={false} />
        </motion.div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/50 to-ink/10" />
        <div className="mx-auto flex h-full max-w-[1400px] flex-col justify-between px-4 pt-6 pb-10 sm:px-8">
          <Link to="/" className="inline-flex w-fit items-center gap-1.5 rounded-full bg-ink/50 px-3 py-1.5 text-sm text-text/80 backdrop-blur-md transition-colors duration-150 hover:text-text">
            <ArrowLeft className="size-4" /> Store
          </Link>
          <div>
            <Link to={`/browse?partner=${game.partner.slug}`} className="eyebrow text-text/70 hover:text-text">
              {game.partner.name}
            </Link>
            <h1 className="mt-3 max-w-4xl text-[clamp(2.8rem,8vw,7rem)] leading-[0.86] font-bold tracking-[-0.045em] uppercase [font-variation-settings:'wdth'_76] animate-rise">{game.title}</h1>
            <p className="mt-5 max-w-xl text-lg text-text/80 animate-rise [animation-delay:120ms]">{game.shortDescription}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1400px] gap-12 px-4 pt-10 sm:px-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-12">
          <section>
            <h2 className="eyebrow mb-4">About</h2>
            <p className="max-w-2xl text-lg leading-relaxed text-text/85">{game.description ?? game.shortDescription}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {game.genres.map((g) => (
                <Link key={g} to={`/browse?genre=${g}`} className="pressable rounded-full border border-line px-3 py-1.5 text-[13px] text-text/80 transition-colors duration-150 hover:border-line-strong hover:text-text">
                  {titleCase(g)}
                </Link>
              ))}
            </div>
          </section>

          <section className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
            <div className="bg-ink p-5">
              <p className="eyebrow mb-3">Platforms</p>
              <ul className="space-y-2 text-sm">
                {game.platforms.map((p) => {
                  const Icon = platformIcon(p);
                  return (
                    <li key={p} className="flex items-center gap-2">
                      <Icon className="size-4 text-muted" /> {PLATFORM_LABELS[p] ?? p}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="bg-ink p-5">
              <p className="eyebrow mb-3">Age rating</p>
              <p className="font-display text-3xl font-semibold">{game.minAge ? `${game.minAge}+` : 'All ages'}</p>
            </div>
            <div className="bg-ink p-5">
              <p className="eyebrow mb-3">Released</p>
              <p className="text-sm">{game.publishedAt ? formatDate(game.publishedAt) : '—'}</p>
              <p className="eyebrow mt-4 mb-1">Studio</p>
              <Link to={`/browse?partner=${game.partner.slug}`} className="text-sm hover:text-go-fg">
                {game.partner.name}
              </Link>
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-line-strong bg-surface p-6 shadow-[0_30px_80px_-30px_rgb(0_0_0/0.9)]">
            <div className="flex items-start justify-between">
              <Price lamports={game.priceLamports} size="lg" showFiat />
              {owned && (
                <span className="inline-flex items-center gap-1 rounded-md bg-go/10 px-2 py-1 text-xs font-medium text-go-fg">
                  <Check className="size-3.5" /> In your library
                </span>
              )}
            </div>
            <Button intent={owned || !isFree(game.priceLamports) ? 'go' : 'primary'} size="lg" className="mt-6 w-full" onClick={primary} loading={claim.isPending} disabled={Boolean(token && me && !isGamer && !owned)}>
              {cta} {owned && <ArrowUpRight />}
            </Button>
            {token && me && !isGamer && !owned && <p className="mt-3 text-center text-xs text-muted">Buying needs a gamer account. Partner accounts can browse only.</p>}
            <ul className="mt-6 space-y-3 border-t border-line pt-5 text-sm text-muted">
              <li className="flex gap-2.5">
                <ArrowUpRight className="mt-0.5 size-4 shrink-0" />
                Opens on {studioHost ?? `${game.partner.name}’s site`} — the studio hosts the game.
              </li>
              <li className="flex gap-2.5">
                <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                {isFree(game.priceLamports) ? 'Free forever. No wallet needed.' : `Paid directly to ${game.partner.name}’s wallet, verified on Solana.`}
              </li>
            </ul>
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <div className="mt-20">
          <Rail title="More like this" eyebrow="Same neighbourhood">
            {similar.map((g) => (
              <RailItem key={g.id}>
                <GameCard game={g} owned={library.some((l) => l.gameId === g.id)} />
              </RailItem>
            ))}
          </Rail>
        </div>
      )}

      {/* Phones: the buy box sits below the fold, so keep the price and action in reach. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/85 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4">
          <Price lamports={game.priceLamports} size="md" showFiat />
          <Button intent={owned || !isFree(game.priceLamports) ? 'go' : 'primary'} onClick={primary} loading={claim.isPending} disabled={Boolean(token && me && !isGamer && !owned)}>
            {cta} {owned && <ArrowUpRight />}
          </Button>
        </div>
      </div>
      <div className="h-20 lg:hidden" />

      {!isFree(game.priceLamports) && (
        <CheckoutDialog
          game={game}
          open={checkout}
          onOpenChange={setCheckout}
          onPlay={() => {
            setCheckout(false);
            play();
          }}
        />
      )}
    </div>
  );
}
