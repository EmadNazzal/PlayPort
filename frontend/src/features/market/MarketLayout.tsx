import { Menu } from '@base-ui/react/menu';
import { Compass, Library, LogOut, Search, User } from 'lucide-react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Kbd } from '@/components/ui/Kbd';
import { Logo, LogoMark } from '@/components/ui/Logo';
import { cn } from '@/lib/cn';
import { useMe, useSignOut } from '@/lib/queries';
import { useSession } from '@/lib/session';
import { useAuthDialog } from '@/features/auth/authDialogStore';
import { WalletChip } from '@/features/wallets/WalletChip';
import { useCommandMenu } from './commandMenuStore';

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn('relative rounded-lg px-3 py-1.5 text-sm transition-colors duration-150', isActive ? 'text-text' : 'text-muted hover:text-text');

const menuItem = 'flex cursor-default items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-text/85 outline-none data-[highlighted]:bg-white/[0.07] data-[highlighted]:text-text';

const UserMenu = () => {
  const { data: me } = useMe();
  const signOut = useSignOut();
  const navigate = useNavigate();
  const name = me?.displayName ?? me?.email ?? 'Player';
  return (
    <Menu.Root>
      <Menu.Trigger className="pressable grid size-8 place-items-center rounded-full bg-[linear-gradient(140deg,#FFB547,#FF5A4E)] font-display text-sm font-bold text-ink uppercase" aria-label="Account menu">
        {name.slice(0, 1)}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="end" className="z-50">
          <Menu.Popup className="popup-scale w-56 rounded-2xl border border-line-strong bg-raised p-1.5 shadow-2xl outline-none">
            <div className="px-2.5 pt-1.5 pb-2.5">
              <p className="truncate text-sm font-medium">{name}</p>
              {me?.email && <p className="truncate text-xs text-muted">{me.email}</p>}
            </div>
            <Menu.Separator className="my-1 h-px bg-line" />
            <Menu.Item className={cn(menuItem, 'md:hidden')} render={<Link to="/market/browse" />}>
              <Compass className="size-4 text-muted" /> Browse
            </Menu.Item>
            <Menu.Item className={menuItem} render={<Link to="/library" />}>
              <Library className="size-4 text-muted" /> Library
            </Menu.Item>
            <Menu.Item className={menuItem} render={<Link to="/account" />}>
              <User className="size-4 text-muted" /> Account & wallets
            </Menu.Item>
            <Menu.Separator className="my-1 h-px bg-line" />
            <Menu.Item className={menuItem} onClick={() => signOut.mutate(undefined, { onSettled: () => navigate('/') })}>
              <LogOut className="size-4 text-muted" /> Sign out
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
};

export const MarketLayout = () => {
  const token = useSession((s) => s.token);
  const ready = useSession((s) => s.ready);
  const show = useAuthDialog((s) => s.show);
  const openSearch = useCommandMenu((s) => s.setOpen);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-line bg-ink/75 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4 sm:gap-6 sm:px-8">
          <Link to="/" aria-label="PlayPort home" className="shrink-0">
            <span className="hidden sm:block">
              <Logo />
            </span>
            <span className="block sm:hidden">
              <LogoMark />
            </span>
          </Link>
          <nav className="hidden items-center md:flex">
            <NavLink to="/market" end className={navClass}>
              Store
            </NavLink>
            <NavLink to="/market/browse" className={navClass}>
              Browse
            </NavLink>
            {token && (
              <NavLink to="/library" className={navClass}>
                Library
              </NavLink>
            )}
          </nav>
          <button
            type="button"
            onClick={() => openSearch(true)}
            className="pressable ml-auto flex h-9 items-center gap-2 rounded-xl border border-line bg-white/[0.03] px-3 text-sm text-faint transition-colors duration-150 hover:border-line-strong hover:text-muted md:w-72"
          >
            <Search className="size-4" />
            <span className="hidden flex-1 text-left md:inline">Search games</span>
            <span className="hidden md:inline-flex gap-1">
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </span>
          </button>
          <WalletChip />
          {ready && (token ? <UserMenu /> : (
            <Button intent="primary" size="sm" onClick={() => show({ returnTo: window.location.pathname })}>
              Sign in
            </Button>
          ))}
        </div>
      </header>
      <Outlet />
      <footer className="mt-24 border-t border-line">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-5 py-8 text-xs text-faint sm:flex-row sm:justify-between sm:px-8">
          <p>Games are hosted by their studios and open on their sites.</p>
          <p className="font-mono">Payments settle on Solana · PlayPort never holds funds</p>
        </div>
      </footer>
    </div>
  );
};
