import { cn } from '@/lib/cn';
import type { GameStatus, PartnerStatus } from './types';

const STYLES: Record<GameStatus | PartnerStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-veil/[0.06] text-muted' },
  pending_review: { label: 'In review', className: 'bg-lantern/12 text-lantern-fg' },
  published: { label: 'Live', className: 'bg-go/12 text-go-fg' },
  rejected: { label: 'Changes needed', className: 'bg-danger/10 text-danger' },
  archived: { label: 'Archived', className: 'bg-veil/[0.04] text-faint' },
  pending: { label: 'Awaiting approval', className: 'bg-lantern/12 text-lantern-fg' },
  approved: { label: 'Approved', className: 'bg-go/12 text-go-fg' },
  suspended: { label: 'Suspended', className: 'bg-danger/10 text-danger' },
};

export const StatusBadge = ({ status, className }: { status: GameStatus | PartnerStatus; className?: string }) => {
  const s = STYLES[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium', s.className, className)}>
      <span className="size-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
};
