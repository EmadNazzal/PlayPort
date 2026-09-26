import { useState, type FormEvent } from 'react';
import { TextMorph } from 'torph/react';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { api, ApiError, errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useSignedIn } from '@/lib/queries';
import type { TokenResponse } from '@/lib/types';

// Mirrors the server's rules so most mistakes are caught before a round trip.
const SignUpStudio = z.object({
  displayName: z.string().trim().min(1, 'Enter your name').max(80),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(10, 'At least 10 characters').max(128),
});
const SignUp = z.object({
  username: z.string().trim().min(3, 'At least 3 characters').max(24).regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers and _ only'),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(10, 'At least 10 characters').max(128),
});
const SignIn = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});

type Errors = Partial<Record<'username' | 'displayName' | 'email' | 'password' | 'form', string>>;

type Props = { mode: 'signin' | 'signup'; onModeChange: (m: 'signin' | 'signup') => void; onDone: (redirectTo?: string) => void };

const Field = ({ label, name, error, ...input }: { label: string; name: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <label className="block">
    <span className="mb-1.5 block text-[13px] text-muted">{label}</span>
    <input
      name={name}
      aria-invalid={Boolean(error)}
      className={cn(
        'h-11 w-full rounded-xl border bg-ink-2 px-3.5 text-[15px] text-text transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-faint focus:border-go/60 focus:shadow-[0_0_0_3px_rgb(20_241_149/0.15)]',
        error ? 'border-danger/60' : 'border-line-strong',
      )}
      {...input}
    />
    {error && <span className="mt-1.5 block text-xs text-danger">{error}</span>}
  </label>
);

export const EmailForm = ({ mode, onModeChange, onDone }: Props) => {
  const signedIn = useSignedIn();
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);
  /** Players get a gamer account; studios get a plain account and apply for a studio next. */
  const [kind, setKind] = useState<'player' | 'studio'>('player');
  const signup = mode === 'signup';
  const studio = signup && kind === 'studio';

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = Object.fromEntries(new FormData(e.currentTarget));
    const parsed = (studio ? SignUpStudio : signup ? SignUp : SignIn).safeParse(form);
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors as Record<string, string[] | undefined>;
      setErrors({ username: flat.username?.[0], displayName: flat.displayName?.[0], email: flat.email?.[0], password: flat.password?.[0] });
      return;
    }
    setErrors({});
    setPending(true);
    try {
      const tokens = await api<TokenResponse>(signup ? '/auth/register' : '/auth/login', {
        method: 'POST',
        body: signup ? { accountType: studio ? 'partner' : 'gamer', ...parsed.data } : parsed.data,
      });
      await signedIn(tokens);
      toast.success(studio ? 'Account created — now tell us about your studio' : signup ? 'Welcome to PlayPort' : 'Welcome back');
      onDone(studio ? '/studio' : undefined);
    } catch (err) {
      const fields = err instanceof ApiError ? (err.details as { fieldErrors?: Record<string, string[]> } | undefined)?.fieldErrors : undefined;
      setErrors(fields ? { username: fields.username?.[0], displayName: fields.displayName?.[0], email: fields.email?.[0], password: fields.password?.[0] } : { form: errorMessage(err) });
    } finally {
      setPending(false);
    }
  };

  const forgot = async () => {
    const email = (document.querySelector<HTMLInputElement>('input[name=email]')?.value ?? '').trim();
    if (!z.string().email().safeParse(email).success) {
      setErrors({ email: 'Enter your email first' });
      return;
    }
    await api('/auth/password/forgot', { method: 'POST', body: { email } }).catch(() => undefined);
    toast.message('Check your inbox', { description: 'If that email has an account, a reset link is on its way.' });
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {signup && (
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Account type">
          {(['player', 'studio'] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={cn('pressable rounded-xl border px-3 py-2.5 text-left transition-colors duration-150', kind === k ? 'border-text bg-veil/[0.04]' : 'border-line hover:border-line-strong')}
            >
              <span className="block text-sm font-medium">{k === 'player' ? 'I play games' : 'I make games'}</span>
              <span className="block text-xs text-muted">{k === 'player' ? 'Player account' : 'Studio account'}</span>
            </button>
          ))}
        </div>
      )}
      {signup && !studio && <Field label="Username" name="username" autoComplete="username" placeholder="nightowl_42" error={errors.username} />}
      {studio && <Field label="Your name" name="displayName" autoComplete="name" placeholder="Nora Nebula" error={errors.displayName} />}
      <Field label="Email" name="email" type="email" autoComplete="email" placeholder="you@example.com" error={errors.email} />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete={signup ? 'new-password' : 'current-password'}
        placeholder={signup ? 'At least 10 characters' : '••••••••••'}
        error={errors.password}
      />
      {errors.form && <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{errors.form}</p>}
      <Button type="submit" intent="primary" size="lg" loading={pending} className="w-full">
        <TextMorph as="span">{signup ? 'Create account' : 'Sign in'}</TextMorph>
      </Button>
      <div className="flex items-center justify-between text-[13px]">
        <button type="button" onClick={() => onModeChange(signup ? 'signin' : 'signup')} className="text-muted underline-offset-4 hover:text-text hover:underline">
          {signup ? 'Have an account? Sign in' : 'New here? Create an account'}
        </button>
        {!signup && (
          <button type="button" onClick={() => void forgot()} className="text-faint hover:text-muted">
            Forgot password?
          </button>
        )}
      </div>
    </form>
  );
};
