import { AlertTriangle, ArrowLeft, Send } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Field, TextArea } from '@/components/ui/Field';
import { Price } from '@/components/ui/Price';
import { ApiError, errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { lamportsToSolString, PLATFORM_LABELS, slugify, solToLamports, titleCase } from '@/lib/format';
import { useGenres } from '@/lib/queries';
import { GameCover } from '@/features/market/GameCover';
import { useCreateGame, useStudioGames, useSubmitGame, useUpdateGame, type GameInput } from './queries';
import { StatusBadge } from './StatusBadge';
import { useStudioContext } from './StudioLayout';
import { TagInput } from './TagInput';

const DEFAULT_GENRES = ['action', 'adventure', 'rpg', 'strategy', 'puzzle', 'racing', 'arcade', 'roguelike', 'simulation', 'casual', 'horror', 'platformer', 'card', 'multiplayer'];
const AGES = [null, 3, 7, 10, 12, 16, 18] as const;

const https = z.string().trim().url('Enter a full URL').refine((u) => u.startsWith('https://'), 'Must start with https://');
const optionalUrl = z.union([z.literal('').transform(() => null), https]);

const Schema = z.object({
  title: z.string().trim().min(1, 'Give it a name').max(120),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase letters, numbers and dashes').min(2, 'At least 2 characters').max(64),
  shortDescription: z.string().trim().max(200).transform((v) => v || null),
  description: z.string().trim().max(10_000).transform((v) => v || null),
  genres: z.array(z.string()).max(10),
  platforms: z.array(z.string()).max(6),
  launchUrl: https,
  thumbnailUrl: optionalUrl,
  bannerUrl: optionalUrl,
  price: z.string().trim(),
  minAge: z.number().int().nullable(),
});

type Form = z.input<typeof Schema>;
type Errors = Partial<Record<keyof Form | 'form', string>>;

const Section = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
    <h2 className="font-display text-lg font-semibold tracking-[-0.01em]">{title}</h2>
    {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
    <div className="mt-5 grid gap-4">{children}</div>
  </section>
);

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/** /studio/:id/games/new and /studio/:id/games/:gameId — with a live poster preview. */
export default function GameEditor() {
  const { gameId } = useParams();
  const { studio } = useStudioContext();
  const navigate = useNavigate();
  const { data: games = [], isPending } = useStudioGames(studio.id);
  const { data: genres = [] } = useGenres();
  const existing = games.find((g) => g.id === gameId);
  const create = useCreateGame(studio.id);
  const update = useUpdateGame(studio.id);
  const submit = useSubmitGame(studio.id);

  const [form, setForm] = useState<Form>({
    title: '',
    slug: '',
    shortDescription: '',
    description: '',
    genres: [],
    platforms: ['web'],
    launchUrl: 'https://',
    thumbnailUrl: '',
    bannerUrl: '',
    price: '0',
    minAge: null,
  });
  const [slugTouched, setSlugTouched] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    if (!existing) return;
    setSlugTouched(true);
    setForm({
      title: existing.title,
      slug: existing.slug,
      shortDescription: existing.shortDescription ?? '',
      description: existing.description ?? '',
      genres: existing.genres,
      platforms: existing.platforms,
      launchUrl: existing.launchUrl,
      thumbnailUrl: existing.thumbnailUrl ?? '',
      bannerUrl: existing.bannerUrl ?? '',
      price: lamportsToSolString(existing.priceLamports),
      minAge: existing.minAge,
    });
  }, [existing]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const lamports = solToLamports(form.price);
  const free = lamports === '0';

  // What the store will show, from the current form values.
  const preview = useMemo(
    () => ({
      slug: form.slug || slugify(form.title) || 'untitled',
      title: form.title || 'Untitled game',
      genres: form.genres.length ? form.genres : ['adventure'],
      shortDescription: form.shortDescription || null,
      minAge: form.minAge,
      platforms: form.platforms,
      partner: studio,
      thumbnailUrl: /^https:\/\/.+/.test(form.thumbnailUrl ?? '') ? form.thumbnailUrl! : null,
      bannerUrl: /^https:\/\/.+/.test(form.bannerUrl ?? '') ? form.bannerUrl! : null,
    }),
    [form, studio],
  );

  const reReview =
    existing?.status === 'published' && (form.launchUrl !== existing.launchUrl || (lamports !== null && lamports !== existing.priceLamports));

  const save = async (andSubmit: boolean) => {
    const parsed = Schema.safeParse(form);
    const fieldErrs: Errors = parsed.success ? {} : Object.fromEntries(Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0]]));
    if (lamports === null) fieldErrs.price = 'Enter a price in SOL, e.g. 0.5 (up to 9 decimals)';
    if (!parsed.success || lamports === null) return setErrors(fieldErrs);
    setErrors({});

    const { price: _price, ...rest } = parsed.data;
    const body: GameInput = { ...rest, priceLamports: lamports };
    try {
      const saved = existing ? await update.mutateAsync({ id: existing.id, ...body }) : await create.mutateAsync(body);
      if (andSubmit) {
        await submit.mutateAsync(saved.id);
        toast.success(`${saved.title} sent for review`);
      } else {
        toast.success(existing ? 'Changes saved' : 'Draft saved');
      }
      if (!existing || andSubmit) navigate(`/studio/${studio.id}`);
    } catch (err) {
      const fields = err instanceof ApiError ? (err.details as { fieldErrors?: Record<string, string[]> } | undefined)?.fieldErrors : undefined;
      setErrors(fields ? Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v[0]])) : { form: errorMessage(err) });
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void save(false);
  };

  if (gameId && isPending) return <div className="h-96 animate-pulse rounded-2xl bg-surface" />;
  if (gameId && !existing) return <p className="text-muted">Game not found.</p>;

  const busy = create.isPending || update.isPending || submit.isPending;
  const canSubmit = studio.status === 'approved' && (!existing || existing.status === 'draft' || existing.status === 'rejected');
  const suggestions = [...new Set([...genres.map((g) => g.genre), ...DEFAULT_GENRES])];

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-8 pb-24 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Link to={`/studio/${studio.id}`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
            <ArrowLeft className="size-4" /> All games
          </Link>
          {existing && <StatusBadge status={existing.status} />}
        </div>
        <h2 className="font-display text-3xl font-bold tracking-[-0.03em]">{existing ? `Edit ${existing.title}` : 'New game'}</h2>

        {existing?.status === 'rejected' && existing.statusReason && (
          <p className="flex gap-2 rounded-2xl border border-danger/30 bg-danger/[0.07] p-4 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" /> <span><strong>Reviewer notes:</strong> {existing.statusReason}</span>
          </p>
        )}

        <Section title="Basics" hint="What players see first.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Title"
              value={form.title}
              onChange={(e) => {
                set('title', e.target.value);
                if (!slugTouched) set('slug', slugify(e.target.value));
              }}
              placeholder="Ashen Crown"
              error={errors.title}
            />
            <Field
              label="Store URL"
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set('slug', e.target.value);
              }}
              hint={`playport.gg/games/${form.slug || '…'}`}
              error={errors.slug}
            />
          </div>
          <Field label="Tagline" value={form.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} maxLength={200} placeholder="A fallen kingdom, a cursed blade, and a thousand embers." hint="Shown on your poster and in the store." error={errors.shortDescription} />
          <TextArea label="Description" value={form.description} onChange={(e) => set('description', e.target.value)} rows={5} maxLength={10_000} error={errors.description} />
        </Section>

        <Section title="Store details">
          <TagInput label="Genres" value={form.genres} onChange={(v) => set('genres', v)} suggestions={suggestions} error={errors.genres} />
          <div>
            <span className="mb-1.5 block text-[13px] text-muted">Platforms</span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PLATFORM_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => set('platforms', toggle(form.platforms, key))}
                  className={cn('pressable rounded-full border px-3 py-1.5 text-[13px] transition-colors duration-150', form.platforms.includes(key) ? 'border-text bg-text text-ink' : 'border-line text-text/75 hover:border-line-strong')}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Field label="Price (SOL)" inputMode="decimal" value={form.price} onChange={(e) => set('price', e.target.value)} error={errors.price} hint={free ? 'Free — players claim it without a wallet.' : lamports ? `${BigInt(lamports).toLocaleString()} lamports` : undefined} className="[&_input]:font-mono" />
              <button type="button" onClick={() => set('price', free ? '0.5' : '0')} className="mt-2 text-xs text-muted hover:text-text">
                {free ? 'Make it paid' : 'Make it free'}
              </button>
            </div>
            <div>
              <span className="mb-1.5 block text-[13px] text-muted">Age rating</span>
              <div className="flex flex-wrap gap-1.5">
                {AGES.map((a) => (
                  <button
                    key={String(a)}
                    type="button"
                    onClick={() => set('minAge', a)}
                    className={cn('pressable h-9 min-w-11 rounded-lg border px-2 font-mono text-sm transition-colors duration-150', form.minAge === a ? 'border-text bg-text text-ink' : 'border-line text-text/75 hover:border-line-strong')}
                  >
                    {a === null ? 'All' : `${a}+`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section title="Where it’s hosted" hint="PlayPort never hosts your game. Players open this link after they get it.">
          <Field label="Launch URL" value={form.launchUrl} onChange={(e) => set('launchUrl', e.target.value)} error={errors.launchUrl} className="[&_input]:font-mono [&_input]:text-sm" />
        </Section>

        <Section title="Artwork" hint="Optional. Leave empty and we’ll use the illustrated poster on the right.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Poster image URL (2:3)" value={form.thumbnailUrl ?? ''} onChange={(e) => set('thumbnailUrl', e.target.value)} placeholder="https://…/poster.jpg" error={errors.thumbnailUrl} />
            <Field label="Banner image URL (16:9)" value={form.bannerUrl ?? ''} onChange={(e) => set('bannerUrl', e.target.value)} placeholder="https://…/banner.jpg" error={errors.bannerUrl} />
          </div>
        </Section>

        {reReview && (
          <p className="flex gap-2 rounded-2xl border border-lantern/30 bg-lantern/[0.07] p-4 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-lantern-fg" />
            Changing the launch URL or price of a live game sends it back to review. It leaves the store until approved.
          </p>
        )}
        {errors.form && <p className="rounded-xl bg-danger/10 px-3 py-2.5 text-sm text-danger">{errors.form}</p>}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <p className="eyebrow">Live preview</p>
        <div className="mx-auto aspect-[2/3] w-full max-w-[340px] overflow-hidden rounded-2xl shadow-[0_30px_80px_-30px_rgb(0_0_0/0.6)] ring-1 ring-veil/10">
          <GameCover game={preview} />
        </div>
        <div className="flex items-start justify-between gap-3 px-1">
          <div className="min-w-0">
            <p className="truncate font-medium">{preview.title}</p>
            <p className="truncate text-[13px] text-muted">
              {studio.name}
              {form.genres[0] && <span className="text-faint"> · {titleCase(form.genres[0])}</span>}
            </p>
          </div>
          {lamports !== null && <Price lamports={lamports} />}
        </div>
        <div className="aspect-[16/9] overflow-hidden rounded-xl ring-1 ring-veil/10">
          <GameCover game={preview} variant="wide" showTitle={false} />
        </div>
        <p className="text-center text-xs text-faint">Store banner</p>
      </aside>

      {/* Sticky action bar: saving should always be one click away on a long form. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center justify-end gap-3 px-4 py-3 sm:px-8">
          {!canSubmit && studio.status !== 'approved' && <p className="mr-auto hidden text-xs text-muted sm:block">You can submit for review once your studio is approved.</p>}
          <Button type="submit" intent="ghost" loading={busy && !submit.isPending}>
            {existing ? 'Save changes' : 'Save draft'}
          </Button>
          {canSubmit && (
            <Button type="button" intent="go" loading={submit.isPending} onClick={() => void save(true)}>
              <Send /> Save & submit for review
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
