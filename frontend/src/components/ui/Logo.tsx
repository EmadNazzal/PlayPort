import { cn } from '@/lib/cn';

export const LogoMark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 64 64" className={cn('size-7', className)} aria-hidden>
    <rect width="64" height="64" rx="16" fill="currentColor" fillOpacity="0.06" />
    <path d="M20 46V18h14a10 10 0 0 1 0 20h-8" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="44" cy="46" r="5" fill="var(--color-go)" />
  </svg>
);

export const Logo = ({ className }: { className?: string }) => (
  <span className={cn('inline-flex items-center gap-2.5', className)}>
    <LogoMark />
    <span className="font-display text-[19px] font-bold tracking-[-0.03em] [font-variation-settings:'wdth'_85]">PlayPort</span>
  </span>
);
