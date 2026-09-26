import { Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Field, inputClass } from '@/components/ui/Field';
import { errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { useMe } from '@/lib/queries';
import { useAddMember, useMembers, useRemoveMember } from './queries';
import { useStudioContext } from './StudioLayout';
import type { MemberRole } from './types';

const ROLE_COPY: Record<MemberRole, string> = {
  owner: 'Everything, including adding owners',
  admin: 'Profile, team, API keys and sales',
  developer: 'Create and edit games',
};

export default function StudioTeam() {
  const { studio, role, canManage } = useStudioContext();
  const { data: me } = useMe();
  const { data: members = [] } = useMembers(studio.id);
  const add = useAddMember(studio.id);
  const remove = useRemoveMember(studio.id);
  const [email, setEmail] = useState('');
  const [newRole, setNewRole] = useState<MemberRole>('developer');

  const invite = (e: FormEvent) => {
    e.preventDefault();
    add.mutate(
      { email: email.trim(), role: newRole },
      {
        onSuccess: () => {
          toast.success(`${email} added as ${newRole}`);
          setEmail('');
        },
        onError: (err) => toast.error(errorMessage(err)),
      },
    );
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <ul className="divide-y divide-line self-start overflow-hidden rounded-2xl border border-line bg-surface">
        {members.map((m) => {
          const self = m.userId === me?.id;
          return (
            <li key={m.userId} className="flex items-center gap-4 px-4 py-3.5">
              <span className="grid size-9 place-items-center rounded-full bg-veil/[0.07] font-display text-sm font-bold uppercase">{(m.displayName ?? m.email ?? '?').slice(0, 1)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {m.displayName ?? m.email} {self && <span className="text-faint">(you)</span>}
                </p>
                <p className="truncate text-xs text-muted">
                  {m.email} · since {formatDate(m.addedAt)}
                </p>
              </div>
              <span className="rounded-md bg-veil/[0.06] px-2 py-0.5 text-xs capitalize">{m.role}</span>
              {(canManage || self) && (
                <Button
                  size="sm"
                  intent="quiet"
                  aria-label={self ? 'Leave studio' : `Remove ${m.email}`}
                  onClick={() => remove.mutate(m.userId, { onSuccess: () => toast.success(self ? 'You left the studio' : 'Member removed'), onError: (err) => toast.error(errorMessage(err)) })}
                >
                  <Trash2 />
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      {canManage ? (
        <form onSubmit={invite} className="space-y-4 self-start rounded-2xl border border-line bg-surface p-5">
          <div>
            <h3 className="font-display text-lg font-semibold">Add a teammate</h3>
            <p className="text-sm text-muted">They need a PlayPort account first.</p>
          </div>
          <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="dev@studio.dev" />
          <div className="space-y-2">
            {(['developer', 'admin', ...(role === 'owner' ? (['owner'] as const) : [])] as MemberRole[]).map((r) => (
              <label key={r} className={cn(inputClass, 'flex cursor-pointer items-start gap-3 py-3', newRole === r ? 'border-text' : 'border-line-strong')}>
                <input type="radio" name="role" checked={newRole === r} onChange={() => setNewRole(r)} className="mt-1 accent-current" />
                <span>
                  <span className="block text-sm font-medium capitalize">{r}</span>
                  <span className="block text-xs text-muted">{ROLE_COPY[r]}</span>
                </span>
              </label>
            ))}
          </div>
          <Button type="submit" intent="primary" className="w-full" loading={add.isPending} disabled={!email.trim()}>
            Add to studio
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted">Ask a studio owner or admin to add teammates.</p>
      )}
    </div>
  );
}
