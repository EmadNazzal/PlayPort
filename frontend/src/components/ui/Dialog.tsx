import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Hide the visual title (still announced to screen readers). */
  hideTitle?: boolean;
};

export const Dialog = ({ open, onOpenChange, title, description, children, className, hideTitle }: Props) => (
  <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
    <BaseDialog.Portal>
      <BaseDialog.Backdrop className="backdrop fixed inset-0 z-50 bg-black/70 backdrop-blur-[6px]" />
      <BaseDialog.Popup
        className={cn(
          'modal fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-line-strong bg-surface p-6 shadow-[0_40px_120px_-20px_rgb(0_0_0/0.8)] outline-none',
          className,
        )}
      >
        <BaseDialog.Title className={cn('pr-8 font-display text-2xl font-semibold tracking-[-0.02em]', hideTitle && 'sr-only')}>{title}</BaseDialog.Title>
        {description && <BaseDialog.Description className="mt-1.5 text-sm text-muted">{description}</BaseDialog.Description>}
        <BaseDialog.Close className="pressable absolute top-5 right-5 grid size-8 place-items-center rounded-full text-muted hover:bg-white/5 hover:text-text" aria-label="Close">
          <X className="size-4" />
        </BaseDialog.Close>
        {children}
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  </BaseDialog.Root>
);
