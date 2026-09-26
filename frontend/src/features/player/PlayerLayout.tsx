import { NavLink, Outlet } from 'react-router';
import { cn } from '@/lib/cn';
import { useGamerProfile, useLibrary, useMe, useWallets } from '@/lib/queries';

const TABS = [
  { to: '/player', label: 'Library', end: true },
  { to: '/player/wallet', label: 'Wallet' },
  { to: '/player/wallets', label: 'Linked wallets' },
  { to: '/player/purchases', label: 'Purchases' },
  { to: '/player/profile', label: 'Profile' },
];

/** The player's home: what they own, how they pay, and who they are. */
export default function PlayerLayout() {
  const { data: me } = useMe();
  const { data: profile } = useGamerProfile();
  const { data: library = [] } = useLibrary();
  const { data: wallets = [] } = useWallets();
  const name = profile?.displayName ?? me?.displayName ?? profile?.username ?? 'Player';

  return (
    <div className="mx-auto max-w-[1400px] px-4 pt-10 sm:px-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="grid size-14 place-items-center rounded-2xl bg-[linear-gradient(140deg,#FFB547,#FF5A4E)] font-display text-2xl font-bold text-[#16150f] uppercase">
            {name.slice(0, 1)}
          </span>
          <div>
            <p className="eyebrow mb-1">Player</p>
            <h1 className="text-[clamp(1.9rem,4vw,3rem)] leading-none font-bold tracking-[-0.035em] [font-variation-settings:'wdth'_85]">{name}</h1>
            {profile && <p className="mt-1.5 font-mono text-xs text-muted">@{profile.username}</p>}
          </div>
        </div>
        <dl className="flex gap-8 text-sm">
          <div>
            <dt className="text-muted">Games</dt>
            <dd className="font-display text-2xl font-semibold tabular-nums">{library.length}</dd>
          </div>
          <div>
            <dt className="text-muted">Wallets</dt>
            <dd className="font-display text-2xl font-semibold tabular-nums">{wallets.length}</dd>
          </div>
        </dl>
      </div>

      <nav className="no-scrollbar mt-8 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              cn(
                'relative shrink-0 px-3 pt-2 pb-3 text-sm transition-colors duration-150',
                isActive ? 'text-text after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:bg-text' : 'text-muted hover:text-text',
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <div className="pt-8">
        <Outlet />
      </div>
    </div>
  );
}
