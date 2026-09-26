import { Menu } from '@base-ui/react/menu';
import { Archive, ArrowUpRight, MoreHorizontal, Pencil, Plus, Send } from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Button, buttonStyles } from '@/components/ui/Button';
import { Price } from '@/components/ui/Price';
import { errorMessage } from '@/lib/api';
import { formatDate, lamportsToSol } from '@/lib/format';
import { GameCover } from '@/features/market/GameCover';
import { useArchiveGame, useSales, useStudioGames, useSubmitGame } from './queries';
import { StatusBadge } from './StatusBadge';
import { useStudioContext } from './StudioLayout';
import type { StudioGame } from './types';

const Stat = ({ label, value, hint }: { label: string; value: string | number; hint?: string }) => (
  <div className="rounded-2xl border border-line bg-surface p-5">
    <p className="text-sm text-muted">{label}</p>
    <p className="mt-2 font-display text-3xl font-semibold tracking-[-0.02em] tabular-nums">{value}</p>
    {hint && <p className="mt-1 text-xs text-faint">{hint}</p>}
  </div>
);

const menuItem = 'flex cursor-default items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-text/85 outline-none data-[highlighted]:bg-veil/[0.07] data-[highlighted]:text-text data-[disabled]:opacity-40';

const GameRow = ({ game, canSubmit }: { game: StudioGame; canSubmit: boolean }) => {
  const { studio } = useStudioContext();
  const submit = useSubmitGame(studio.id);
  const archive = useArchiveGame(studio.id);
  const submittable = game.status === 'draft' || game.status === 'rejected';

  return (
    <li className="flex items-center gap-4 px-4 py-3 transition-colors duration-150 hover:bg-veil/[0.02]">
      <Link to={`/studio/${studio.id}/games/${game.id}`} className="aspect-[2/3] w-12 shrink-0 overflow-hidden rounded-lg ring-1 ring-veil/10">
        <GameCover game={{ ...game, partner: studio }} showTitle={false} />
      </Link>
      <div className="min-w-0 flex-1">
        <Link to={`/studio/${studio.id}/games/${game.id}`} className="block truncate font-medium hover:text-go-fg">
          {game.title}
        </Link>
        <span className="mt-1 block sm:hidden">
          <StatusBadge status={game.status} />
        </span>
        <p className="truncate text-xs text-muted">
          Updated {formatDate(game.updatedAt)}
          {game.status === 'rejected' && game.statusReason && <span className="text-danger"> · {game.statusReason}</span>}
        </p>
      </div>
      {/* Wrappers carry the responsive visibility: the components set their own display. */}
      <span className="hidden sm:block">
        <StatusBadge status={game.status} />
      </span>
      <span className="hidden w-24 text-right md:block">
        <Price lamports={game.priceLamports} className="items-end" />
      </span>
      <div className="flex items-center gap-1">
        {submittable && (
          <Button
            size="sm"
            intent="ghost"
            disabled={!canSubmit}
            title={canSubmit ? undefined : 'Available once your studio is approved'}
            loading={submit.isPending}
            onClick={() => submit.mutate(game.id, { onSuccess: () => toast.success(`${game.title} sent for review`), onError: (e) => toast.error(errorMessage(e)) })}
          >
            <Send /> <span className="hidden lg:inline">Submit</span>
          </Button>
        )}
        <Menu.Root>
          <Menu.Trigger className="pressable grid size-8 place-items-center rounded-lg text-muted hover:bg-veil/[0.06] hover:text-text" aria-label={`Actions for ${game.title}`}>
            <MoreHorizontal className="size-4" />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner sideOffset={6} align="end" className="z-50">
              <Menu.Popup className="popup-scale w-48 rounded-2xl border border-line-strong bg-raised p-1.5 shadow-2xl outline-none">
                <Menu.Item className={menuItem} render={<Link to={`/studio/${studio.id}/games/${game.id}`} />}>
                  <Pencil className="size-4 text-muted" /> Edit
                </Menu.Item>
                {game.status === 'published' && (
                  <Menu.Item className={menuItem} render={<Link to={`/games/${game.slug}`} />}>
                    <ArrowUpRight className="size-4 text-muted" /> View in store
                  </Menu.Item>
                )}
                <Menu.Item
                  className={menuItem}
                  disabled={game.status === 'archived'}
                  onClick={() => archive.mutate(game.id, { onSuccess: () => toast.success(`${game.title} archived`), onError: (e) => toast.error(errorMessage(e)) })}
                >
                  <Archive className="size-4 text-muted" /> Archive
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>
    </li>
  );
};

/** /studio/:id — the studio's games at a glance. */
export default function StudioGames() {
  const { studio, canManage } = useStudioContext();
  const { data: games = [], isPending } = useStudioGames(studio.id);
  const { data: sales = [] } = useSales(studio.id, canManage);
  const confirmed = sales.filter((s) => s.status === 'confirmed');
  const revenue = confirmed.reduce((sum, s) => sum + lamportsToSol(s.amountLamports), 0);
  const count = (status: StudioGame['status']) => games.filter((g) => g.status === status).length;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Live in store" value={count('published')} />
        <Stat label="In review" value={count('pending_review')} hint="PlayPort usually reviews within a day" />
        <Stat label="Drafts" value={count('draft') + count('rejected')} />
        {canManage ? <Stat label="Revenue" value={`${revenue.toLocaleString(undefined, { maximumFractionDigits: 3 })} SOL`} hint={`${confirmed.length} sales`} /> : <Stat label="Archived" value={count('archived')} />}
      </div>

      {isPending ? (
        <div className="h-48 animate-pulse rounded-2xl bg-surface" />
      ) : games.length === 0 ? (
        <div className="grid items-center gap-10 rounded-3xl border border-dashed border-line-strong p-8 md:grid-cols-[180px_1fr]">
          <div className="mx-auto aspect-[2/3] w-[180px] overflow-hidden rounded-2xl ring-1 ring-veil/10">
            <GameCover game={{ slug: `${studio.slug}-first`, title: 'Your game', genres: ['adventure'], partner: studio, shortDescription: 'Your tagline here.', thumbnailUrl: null, bannerUrl: null }} />
          </div>
          <div>
            <p className="font-display text-2xl font-semibold">List your first game</p>
            <p className="mt-2 max-w-md text-muted">Add a title, a tagline and where it’s hosted. We’ll generate a poster until you upload your own art.</p>
            <Link to={`/studio/${studio.id}/games/new`} className={buttonStyles({ intent: 'go', className: 'mt-6' })}>
              <Plus /> Add game
            </Link>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {games.map((g) => (
            <GameRow key={g.id} game={g} canSubmit={studio.status === 'approved'} />
          ))}
        </ul>
      )}
    </div>
  );
}
