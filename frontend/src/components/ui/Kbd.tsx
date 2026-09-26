import type { ReactNode } from 'react';

export const Kbd = ({ children }: { children: ReactNode }) => (
  <kbd className="inline-grid h-5 min-w-5 place-items-center rounded-md border border-line-strong bg-white/[0.04] px-1 font-mono text-[10px] text-muted">{children}</kbd>
);
