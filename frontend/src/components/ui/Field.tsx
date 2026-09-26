import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export const inputClass =
  'w-full rounded-xl border bg-ink-2 px-3.5 text-[15px] text-text outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-faint focus:border-go/60 focus:shadow-[0_0_0_3px_rgb(20_241_149/0.15)]';

type Common = { label: string; hint?: ReactNode; error?: string; className?: string };

export const Field = ({ label, hint, error, className, ...input }: Common & InputHTMLAttributes<HTMLInputElement>) => (
  <label className={cn('block', className)}>
    <span className="mb-1.5 block text-[13px] text-muted">{label}</span>
    <input aria-invalid={Boolean(error)} className={cn(inputClass, 'h-11', error ? 'border-danger/60' : 'border-line-strong')} {...input} />
    {error ? <span className="mt-1.5 block text-xs text-danger">{error}</span> : hint && <span className="mt-1.5 block text-xs text-faint">{hint}</span>}
  </label>
);

export const TextArea = ({ label, hint, error, className, ...input }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <label className={cn('block', className)}>
    <span className="mb-1.5 block text-[13px] text-muted">{label}</span>
    <textarea aria-invalid={Boolean(error)} className={cn(inputClass, 'min-h-24 py-3', error ? 'border-danger/60' : 'border-line-strong')} {...input} />
    {error ? <span className="mt-1.5 block text-xs text-danger">{error}</span> : hint && <span className="mt-1.5 block text-xs text-faint">{hint}</span>}
  </label>
);
