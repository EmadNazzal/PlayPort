import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

export const buttonStyles = cva(
  'pressable inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      intent: {
        /** The money button: buy, confirm, continue. */
        go: 'bg-go text-ink hover:bg-[#3cf5a9] shadow-[0_0_0_1px_rgb(20_241_149/0.4),0_8px_30px_-8px_rgb(20_241_149/0.5)]',
        primary: 'bg-text text-ink hover:bg-white',
        ghost: 'bg-white/[0.04] text-text ring-1 ring-inset ring-line-strong hover:bg-white/[0.08]',
        quiet: 'text-muted hover:text-text hover:bg-white/[0.05]',
        danger: 'bg-danger/10 text-danger ring-1 ring-inset ring-danger/30 hover:bg-danger/20',
      },
      size: {
        sm: 'h-8 rounded-lg px-3 text-[13px]',
        md: 'h-10 rounded-xl px-4 text-sm',
        lg: 'h-12 rounded-2xl px-6 text-[15px]',
        icon: 'size-9 rounded-xl',
      },
    },
    defaultVariants: { intent: 'ghost', size: 'md' },
  },
);

type Props = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyles> & { loading?: boolean };

export const Button = forwardRef<HTMLButtonElement, Props>(({ className, intent, size, loading, children, disabled, ...props }, ref) => (
  <button ref={ref} className={cn(buttonStyles({ intent, size }), className)} disabled={disabled || loading} {...props}>
    {loading && <Spinner />}
    {children}
  </button>
));
Button.displayName = 'Button';
