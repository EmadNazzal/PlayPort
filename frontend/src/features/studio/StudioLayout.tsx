import { Menu } from '@base-ui/react/menu';
import { AlertTriangle, ArrowUpRight, ChevronDown, Plus } from 'lucide-react';
import { Link, NavLink, Outlet, useOutletContext, useParams } from 'react-router';
import { buttonStyles } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/cn';
import { useMyStudios, useStudio } from './queries';
import { StatusBadge } from './StatusBadge';
import type { MemberRole, Partner } from './types';

export type StudioContext = { studio: Partner; role: MemberRole; canManage: boolean };
export const useStudioContext = () => useOutletContext<StudioContext>();

const NOTICE: Partial<Record<Partner['status'], (p: Partner) => { title: string; body: string }>> = {
  pending: (p) => ({
    title: 'Your studio is awaiting approval',
    body: p.payoutWalletAddress
      ? 'You can build your store pages now. Games can be submitted for review once PlayPort approves the studio.'
      : 'Add a payout wallet in Settings — it’s required before we can approve you.',
  }),
  rejected: (p) => ({ title: 'Your application was not approved', body: p.statusReason ?? 'Contact the PlayPort team for details.' }),
  suspended: (p) => ({ title: 'This studio is suspended', body: `${p.statusReason ?? 'Your games are hidden from the store.'} Contact the PlayPort team.` }),
};

export default function StudioLayout() {
  const { partnerId = '' } = useParams();
  const { data: studios = [] } = useMyStudios();
  const { data: studio, isPending, isError } = useStudio(partnerId);
  const role = studios.find((s) => s.partner.id === partnerId)?.role ?? 'developer';

  if (isPending) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-muted">
        <Spinner className="size-5" />
      </div>
    );
  }
  if (isError || !studio) {
    return (
      <div className="mx-auto max-w-xl px-4 py-32 text-center">
        <p className="font-display text-3xl font-semibold">Studio not found.</p>
        <Link to="/studio" className="mt-6 inline-block text-sm text-go-fg">Back to your studios</Link>
      </div>
    );
  }

  const canManage = role === 'owner' || role === 'admin';
  const notice = NOTICE[studio.status]?.(studio);
  const tabs = [
    { to: `/studio/${studio.id}`, label: 'Games', end: true },
    ...(canManage ? [{ to: `/studio/${studio.id}/sales`, label: 'Sales' }] : []),
    { to: `/studio/${studio.id}/team`, label: 'Team' },
    { to: `/studio/${studio.id}/settings`, label: 'Settings' },
  ];

  return (
    <div className="mx-auto max-w-[1400px] px-4 pt-10 sm:px-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="grid size-14 place-items-center rounded-2xl border border-line bg-surface font-display text-2xl font-bold">{studio.name.slice(0, 1)}</span>
          <div>
            <p className="eyebrow mb-1 flex items-center gap-2">
              Studio <span className="text-faint">·</span> <span className="capitalize">{role}</span>
            </p>
            {studios.length > 1 ? (
              <Menu.Root>
                <Menu.Trigger className="group flex items-center gap-2 text-left">
                  <h1 className="text-[clamp(1.9rem,4vw,3rem)] leading-none font-bold tracking-[-0.035em] [font-variation-settings:'wdth'_85]">{studio.name}</h1>
                  <ChevronDown className="size-5 text-muted transition-transform duration-150 group-data-[popup-open]:rotate-180" />
                </Menu.Trigger>
                <Menu.Portal>
                  <Menu.Positioner sideOffset={8} align="start" className="z-50">
                    <Menu.Popup className="popup-scale w-64 rounded-2xl border border-line-strong bg-raised p-1.5 shadow-2xl outline-none">
                      {studios.map(({ partner }) => (
                        <Menu.Item key={partner.id} render={<Link to={`/studio/${partner.id}`} />} className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-veil/[0.07]">
                          {partner.name}
                          <StatusBadge status={partner.status} />
                        </Menu.Item>
                      ))}
                      <Menu.Separator className="my-1 h-px bg-line" />
                      <Menu.Item render={<Link to="/studio/new" />} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted outline-none data-[highlighted]:bg-veil/[0.07]">
                        <Plus className="size-4" /> New studio
                      </Menu.Item>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </Menu.Root>
            ) : (
              <h1 className="text-[clamp(1.9rem,4vw,3rem)] leading-none font-bold tracking-[-0.035em] [font-variation-settings:'wdth'_85]">{studio.name}</h1>
            )}
            <div className="mt-2 flex items-center gap-3">
              <StatusBadge status={studio.status} />
              <a href={studio.websiteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted hover:text-text">
                {new URL(studio.websiteUrl).host} <ArrowUpRight className="size-3" />
              </a>
            </div>
          </div>
        </div>
        <Link to={`/studio/${studio.id}/games/new`} className={buttonStyles({ intent: 'go' })}>
          <Plus /> Add game
        </Link>
      </div>

      {notice && (
        <div className={cn('mt-8 flex gap-3 rounded-2xl border p-4 text-sm', studio.status === 'pending' ? 'border-lantern/30 bg-lantern/[0.07]' : 'border-danger/30 bg-danger/[0.07]')}>
          <AlertTriangle className={cn('mt-0.5 size-4 shrink-0', studio.status === 'pending' ? 'text-lantern-fg' : 'text-danger')} />
          <div>
            <p className="font-medium">{notice.title}</p>
            <p className="mt-0.5 text-muted">{notice.body}</p>
          </div>
        </div>
      )}

      <nav className="no-scrollbar mt-8 flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((t) => (
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
        <Outlet context={{ studio, role, canManage } satisfies StudioContext} />
      </div>
    </div>
  );
}
