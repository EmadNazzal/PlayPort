import { Copy, KeyRound, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Field } from '@/components/ui/Field';
import { errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { ApplyForm } from './ApplyForm';
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from './queries';
import { useStudioContext } from './StudioLayout';

const SCOPES = [
  { value: 'games:manage', label: 'Manage games', hint: 'Create and update listings from your CI' },
  { value: 'payments:read_partner', label: 'Read sales', hint: 'Reconcile purchases in your backend' },
];

const ApiKeys = () => {
  const { studio } = useStudioContext();
  const { data: keys = [] } = useApiKeys(studio.id, true);
  const create = useCreateApiKey(studio.id);
  const revoke = useRevokeApiKey(studio.id);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['games:manage']);
  const [revealed, setRevealed] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate(
      { name: name.trim(), scopes },
      {
        onSuccess: (k) => {
          setRevealed(k.key);
          setName('');
        },
        onError: (err) => toast.error(errorMessage(err)),
      },
    );
  };

  return (
    <div className="space-y-4">
      {keys.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {keys.map((k) => (
            <li key={k.id} className={cn('flex items-center gap-4 px-4 py-3', k.revokedAt && 'opacity-50')}>
              <KeyRound className="size-4 text-muted" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{k.name}</p>
                <p className="truncate font-mono text-xs text-muted">
                  pp_{k.prefix}_•••• · {k.scopes.join(', ')} · {k.revokedAt ? 'revoked' : k.lastUsedAt ? `used ${formatDate(k.lastUsedAt)}` : 'never used'}
                </p>
              </div>
              {!k.revokedAt && (
                <Button size="sm" intent="quiet" aria-label={`Revoke ${k.name}`} onClick={() => revoke.mutate(k.id, { onSuccess: () => toast.success('Key revoked') })}>
                  <Trash2 />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="space-y-3 rounded-2xl border border-line bg-surface p-5">
        <Field label="Key name" value={name} onChange={(e) => setName(e.target.value)} placeholder="CI pipeline" />
        <div className="flex flex-wrap gap-2">
          {SCOPES.map((s) => (
            <button
              key={s.value}
              type="button"
              title={s.hint}
              onClick={() => setScopes((cur) => (cur.includes(s.value) ? cur.filter((x) => x !== s.value) : [...cur, s.value]))}
              className={cn('pressable rounded-full border px-3 py-1.5 text-[13px] transition-colors duration-150', scopes.includes(s.value) ? 'border-text bg-text text-ink' : 'border-line text-text/75 hover:border-line-strong')}
            >
              {s.label}
            </button>
          ))}
        </div>
        <Button type="submit" intent="ghost" loading={create.isPending} disabled={!name.trim() || scopes.length === 0}>
          Create key
        </Button>
      </form>
      <Dialog open={revealed !== null} onOpenChange={(o) => !o && setRevealed(null)} title="Copy your API key" description="This is the only time it will be shown. Store it in your secrets manager.">
        <div className="mt-5 space-y-4">
          <code className="block rounded-xl border border-line-strong bg-ink-2 p-3 font-mono text-xs break-all">{revealed}</code>
          <Button
            intent="primary"
            className="w-full"
            onClick={() => {
              void navigator.clipboard.writeText(revealed ?? '');
              toast.success('Key copied');
            }}
          >
            <Copy /> Copy key
          </Button>
          <p className="text-xs text-faint">Send it as the <span className="font-mono">X-API-Key</span> header.</p>
        </div>
      </Dialog>
    </div>
  );
};

export default function StudioSettings() {
  const { studio, canManage } = useStudioContext();
  if (!canManage) return <p className="text-muted">Only studio owners and admins can change settings.</p>;
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
      <section>
        <h3 className="font-display text-lg font-semibold">Studio profile</h3>
        <p className="mb-5 text-sm text-muted">Payout wallet changes are recorded in the audit log.</p>
        <ApplyForm studio={studio} />
      </section>
      <section>
        <h3 className="font-display text-lg font-semibold">API keys</h3>
        <p className="mb-5 text-sm text-muted">Let your backend manage listings or read sales. Keys only work while the studio is approved.</p>
        <ApiKeys />
      </section>
    </div>
  );
}
