import { Dialog } from '@base-ui/react/dialog';
import { Command } from 'cmdk';
import { Gamepad2, Library, LogOut, Search, Store, Tag, User } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Kbd } from '@/components/ui/Kbd';
import { Price } from '@/components/ui/Price';
import { titleCase } from '@/lib/format';
import { useGames, useGenres, useSignOut } from '@/lib/queries';
import { useSession } from '@/lib/session';
import { useCommandMenu } from './commandMenuStore';
import { GameCover } from './GameCover';

/**
 * Word-prefix matching instead of cmdk's default fuzzy scorer, which matches scattered letters
 * ("rogue" → "Ashen Crown"). Earlier words (the title) rank above later ones (studio, genres).
 */
const filter = (value: string, search: string) => {
  const q = search.trim().toLowerCase();
  if (!q) return 1;
  const words = value.toLowerCase().split(/[\s-]+/);
  const i = words.findIndex((w) => w.startsWith(q));
  if (i >= 0) return 1 - i / (words.length + 1);
  return value.toLowerCase().includes(q) ? 0.05 : 0;
};

const itemClass =
  'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text/85 data-[selected=true]:bg-white/[0.07] data-[selected=true]:text-text';

/**
 * ⌘K palette. Opened hundreds of times by power users, so it has no open/close animation —
 * it appears instantly, like Raycast.
 */
export const CommandMenu = () => {
  const { open, setOpen } = useCommandMenu();
  const navigate = useNavigate();
  const token = useSession((s) => s.token);
  const signOut = useSignOut();
  const { data: games = [] } = useGames();
  const { data: genres = [] } = useGenres();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!useCommandMenu.getState().open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);

  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Popup className="fixed top-[14vh] left-1/2 z-50 w-[calc(100vw-24px)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-[0_40px_120px_-20px_rgb(0_0_0/0.85)] outline-none">
          <Dialog.Title className="sr-only">Search PlayPort</Dialog.Title>
          <Command loop label="Search PlayPort" filter={filter}>
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="size-4 text-muted" />
              <Command.Input autoFocus placeholder="Search games, studios, genres…" className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint" />
              <Kbd>esc</Kbd>
            </div>
            <Command.List className="max-h-[min(60vh,440px)] overflow-y-auto overscroll-contain p-2">
              <Command.Empty className="px-3 py-10 text-center text-sm text-muted">No matches. Try a genre like “roguelike”.</Command.Empty>

              <Command.Group heading="Games" className="[&_[cmdk-group-heading]]:eyebrow [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1.5">
                {games.map((g) => (
                  <Command.Item key={g.id} value={`${g.title} ${g.partner.name} ${g.genres.join(' ')}`} onSelect={() => go(`/market/games/${g.slug}`)} className={itemClass}>
                    <span className="size-9 shrink-0 overflow-hidden rounded-lg">
                      <GameCover game={g} showTitle={false} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{g.title}</span>
                      <span className="block truncate text-xs text-muted">{g.partner.name}</span>
                    </span>
                    <Price lamports={g.priceLamports} />
                  </Command.Item>
                ))}
              </Command.Group>

              <Command.Group heading="Genres" className="[&_[cmdk-group-heading]]:eyebrow [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5">
                {genres.map(({ genre, games: count }) => (
                  <Command.Item key={genre} value={`genre ${genre}`} onSelect={() => go(`/market/browse?genre=${genre}`)} className={itemClass}>
                    <Tag className="size-4 text-muted" />
                    <span className="flex-1">{titleCase(genre)}</span>
                    <span className="font-mono text-xs text-faint">{count}</span>
                  </Command.Item>
                ))}
              </Command.Group>

              <Command.Group heading="Go to" className="[&_[cmdk-group-heading]]:eyebrow [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5">
                <Command.Item onSelect={() => go('/market')} className={itemClass}>
                  <Store className="size-4 text-muted" /> Store
                </Command.Item>
                <Command.Item onSelect={() => go('/market/browse')} className={itemClass}>
                  <Gamepad2 className="size-4 text-muted" /> Browse all games
                </Command.Item>
                {token && (
                  <>
                    <Command.Item onSelect={() => go('/library')} className={itemClass}>
                      <Library className="size-4 text-muted" /> Library
                    </Command.Item>
                    <Command.Item onSelect={() => go('/account')} className={itemClass}>
                      <User className="size-4 text-muted" /> Account & wallets
                    </Command.Item>
                    <Command.Item
                      onSelect={() => {
                        setOpen(false);
                        signOut.mutate(undefined, { onSettled: () => navigate('/') });
                      }}
                      className={itemClass}
                    >
                      <LogOut className="size-4 text-muted" /> Sign out
                    </Command.Item>
                  </>
                )}
              </Command.Group>
            </Command.List>
          </Command>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
