import { Search, X } from 'lucide-react';
import { useDeferredValue, useState } from 'react';
import { useSearchParams } from 'react-router';
import { cn } from '@/lib/cn';
import { PLATFORM_LABELS, titleCase } from '@/lib/format';
import { useGames, useGenres, useLibrary, type CatalogFilter } from '@/lib/queries';
import { GameCard, GameCardSkeleton } from './GameCard';

const SORTS: { value: NonNullable<CatalogFilter['sort']>; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price ↑' },
  { value: 'price_desc', label: 'Price ↓' },
  { value: 'title', label: 'A–Z' },
];

const chip = (active: boolean) =>
  cn(
    'pressable rounded-full border px-3 py-1.5 text-[13px] transition-colors duration-150',
    active ? 'border-text bg-text text-ink' : 'border-line text-text/75 hover:border-line-strong hover:text-text',
  );

export default function BrowsePage() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const search = useDeferredValue(query.trim());

  const filter: CatalogFilter = {
    search: search || undefined,
    genre: params.get('genre') ?? undefined,
    partner: params.get('partner') ?? undefined,
    price: (params.get('price') as CatalogFilter['price']) ?? undefined,
    sort: (params.get('sort') as CatalogFilter['sort']) ?? 'newest',
  };
  const platform = params.get('platform');

  const { data, isPending, isPlaceholderData } = useGames(filter);
  const { data: all = [] } = useGames();
  const { data: genres = [] } = useGenres();
  const { data: library = [] } = useLibrary();
  const owned = new Set(library.map((l) => l.gameId));
  const games = (data ?? []).filter((g) => !platform || g.platforms.includes(platform));
  const studios = [...new Map(all.map((g) => [g.partner.slug, g.partner.name]))];

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null || next.get(key) === value) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };
  const active = ['genre', 'partner', 'price', 'platform'].filter((k) => params.get(k));

  return (
    <div className="mx-auto max-w-[1400px] px-4 pt-10 sm:px-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow mb-2">Browse</p>
          <h1 className="text-[clamp(2.2rem,4.5vw,3.5rem)] leading-none font-bold tracking-[-0.035em] [font-variation-settings:'wdth'_85]">
            {filter.genre ? titleCase(filter.genre) : filter.partner ? (studios.find(([s]) => s === filter.partner)?.[1] ?? 'Studio') : 'All games'}
          </h1>
        </div>
        <label className="relative block md:w-80">
          <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles"
            className="h-11 w-full rounded-xl border border-line-strong bg-ink-2 pr-3 pl-10 text-[15px] outline-none placeholder:text-faint focus:border-go/60 focus:shadow-[0_0_0_3px_rgb(20_241_149/0.15)]"
          />
        </label>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-8 lg:sticky lg:top-24 lg:self-start">
          <div>
            <p className="eyebrow mb-3">Price</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={chip(filter.price === 'free')} onClick={() => set('price', 'free')}>Free</button>
              <button type="button" className={chip(filter.price === 'paid')} onClick={() => set('price', 'paid')}>Paid</button>
            </div>
          </div>
          <div>
            <p className="eyebrow mb-3">Genre</p>
            <div className="flex flex-wrap gap-2">
              {genres.map(({ genre }) => (
                <button key={genre} type="button" className={chip(filter.genre === genre)} onClick={() => set('genre', genre)}>
                  {titleCase(genre)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="eyebrow mb-3">Platform</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PLATFORM_LABELS).map(([key, label]) => (
                <button key={key} type="button" className={chip(platform === key)} onClick={() => set('platform', key)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="eyebrow mb-3">Studio</p>
            <div className="flex flex-col items-start gap-1">
              {studios.map(([slug, name]) => (
                <button key={slug} type="button" onClick={() => set('partner', slug)} className={cn('rounded-lg px-2 py-1 text-left text-sm transition-colors duration-150', filter.partner === slug ? 'bg-veil/[0.08] text-text' : 'text-muted hover:text-text')}>
                  {name}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-faint">{games.length} results</span>
              {active.map((k) => (
                <button key={k} type="button" onClick={() => set(k, null)} className="pressable inline-flex items-center gap-1 rounded-full bg-veil/[0.06] px-2.5 py-1 text-xs text-text/80 hover:bg-veil/[0.1]">
                  {k === 'partner' ? (studios.find(([s]) => s === params.get(k))?.[1] ?? params.get(k)) : titleCase(params.get(k)!)} <X className="size-3" />
                </button>
              ))}
            </div>
            <div className="flex rounded-xl border border-line p-0.5">
              {SORTS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => set('sort', s.value)}
                  className={cn('rounded-[10px] px-3 py-1.5 text-[13px] transition-colors duration-150', filter.sort === s.value ? 'bg-raised text-text' : 'text-muted hover:text-text')}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {isPending ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }, (_, i) => <GameCardSkeleton key={i} />)}
            </div>
          ) : games.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-line-strong py-24 text-center">
              <p className="font-display text-2xl font-semibold">Nothing at this stall.</p>
              <p className="mt-2 text-muted">Try another genre, or clear your filters.</p>
            </div>
          ) : (
            <div className={cn('grid grid-cols-2 gap-x-5 gap-y-8 transition-opacity duration-200 sm:grid-cols-3 xl:grid-cols-4', isPlaceholderData && 'opacity-60')}>
              {games.map((g, i) => (
                <div key={g.id} className="animate-rise" style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}>
                  <GameCard game={g} owned={owned.has(g.id)} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
