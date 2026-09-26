import { Wallet } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Field, TextArea } from '@/components/ui/Field';
import { ApiError, errorMessage } from '@/lib/api';
import { slugify } from '@/lib/format';
import { useMe } from '@/lib/queries';
import { useWalletActions } from '@/features/wallets/useWalletActions';
import { useApplyStudio, useUpdateStudio, type PartnerInput } from './queries';
import type { Partner } from './types';

const https = z.string().trim().url('Enter a full URL').refine((u) => u.startsWith('https://'), 'Must start with https://');
const optional = <T extends z.ZodTypeAny>(schema: T) => z.union([z.literal('').transform(() => null), schema]);

// Mirrors the server's rules so mistakes show inline before a round trip.
export const StudioSchema = z.object({
  name: z.string().trim().min(2, 'At least 2 characters').max(80),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase letters, numbers and dashes').min(2).max(64),
  websiteUrl: https,
  contactEmail: z.string().trim().email('Enter a valid email'),
  country: optional(z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, 'Two-letter code, e.g. IE')),
  description: optional(z.string().trim().max(2000)),
  payoutWalletAddress: optional(z.string().trim().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, 'Not a Solana address')),
  webhookUrl: optional(https),
});

type Errors = Partial<Record<keyof z.infer<typeof StudioSchema> | 'form', string>>;

const fieldErrors = (err: unknown): Errors => {
  const fields = err instanceof ApiError ? (err.details as { fieldErrors?: Record<string, string[]> } | undefined)?.fieldErrors : undefined;
  return fields ? Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v[0]])) : { form: errorMessage(err) };
};

type Props = { studio?: Partner; onSaved?: (p: Partner) => void };

/** Apply for a new studio, or (with `studio`) edit an existing one's profile. */
export const ApplyForm = ({ studio, onSaved }: Props) => {
  const { data: me } = useMe();
  const { publicKey } = useWalletActions();
  const navigate = useNavigate();
  const apply = useApplyStudio();
  const update = useUpdateStudio(studio?.id ?? '');
  const [slugTouched, setSlugTouched] = useState(Boolean(studio));
  const [errors, setErrors] = useState<Errors>({});
  const [form, setForm] = useState({
    name: studio?.name ?? '',
    slug: studio?.slug ?? '',
    websiteUrl: studio?.websiteUrl ?? 'https://',
    contactEmail: studio?.contactEmail ?? me?.email ?? '',
    country: studio?.country ?? '',
    description: studio?.description ?? '',
    payoutWalletAddress: studio?.payoutWalletAddress ?? '',
    webhookUrl: studio?.webhookUrl ?? '',
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = StudioSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0]])));
      return;
    }
    setErrors({});
    try {
      const body = parsed.data as PartnerInput;
      if (studio) {
        const saved = await update.mutateAsync(body);
        toast.success('Studio profile saved');
        onSaved?.(saved);
      } else {
        const created = await apply.mutateAsync(body);
        toast.success('Application sent', { description: 'Add your first game while the PlayPort team reviews it.' });
        navigate(`/studio/${created.id}`);
      }
    } catch (err) {
      setErrors(fieldErrors(err));
    }
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
      <Field
        label="Studio name"
        value={form.name}
        onChange={(e) => {
          set('name')(e);
          if (!slugTouched) setForm((f) => ({ ...f, slug: slugify(e.target.value) }));
        }}
        placeholder="Nebula Games"
        error={errors.name}
      />
      <Field
        label="Store handle"
        value={form.slug}
        onChange={(e) => {
          setSlugTouched(true);
          set('slug')(e);
        }}
        hint={`playport.gg/studios/${form.slug || 'your-studio'}`}
        error={errors.slug}
      />
      <Field label="Website" value={form.websiteUrl} onChange={set('websiteUrl')} error={errors.websiteUrl} />
      <Field label="Contact email" type="email" value={form.contactEmail} onChange={set('contactEmail')} error={errors.contactEmail} />
      <Field label="Country" value={form.country} onChange={set('country')} placeholder="IE" maxLength={2} error={errors.country} />
      <Field label="Purchase webhook (optional)" value={form.webhookUrl} onChange={set('webhookUrl')} placeholder="https://…" error={errors.webhookUrl} />
      <div className="sm:col-span-2">
        <Field
          label="Payout wallet"
          value={form.payoutWalletAddress}
          onChange={set('payoutWalletAddress')}
          placeholder="Solana address that receives your sales"
          error={errors.payoutWalletAddress}
          hint="Required before approval. Payments go straight here."
          className="[&_input]:font-mono [&_input]:text-sm"
        />
        {publicKey && form.payoutWalletAddress !== publicKey.toBase58() && (
          <button type="button" onClick={() => setForm((f) => ({ ...f, payoutWalletAddress: publicKey.toBase58() }))} className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted hover:text-text">
            <Wallet className="size-3.5" /> Use my connected wallet
          </button>
        )}
      </div>
      <TextArea label="About the studio" value={form.description} onChange={set('description')} rows={3} maxLength={2000} className="sm:col-span-2" error={errors.description} />
      {errors.form && <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger sm:col-span-2">{errors.form}</p>}
      <div className="sm:col-span-2">
        <Button type="submit" intent={studio ? 'primary' : 'go'} size="lg" loading={apply.isPending || update.isPending}>
          {studio ? 'Save profile' : 'Submit application'}
        </Button>
      </div>
    </form>
  );
};
