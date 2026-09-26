import NumberFlow from '@number-flow/react';
import { cn } from '@/lib/cn';
import { isFree, lamportsToSol } from '@/lib/format';
import { useSolPrice } from '@/lib/useSolPrice';

type Props = { lamports: string; className?: string; showFiat?: boolean; size?: 'sm' | 'md' | 'lg' };

/** SOL price in mono with an approximate USD value. "Free" gets the lantern accent. */
export const Price = ({ lamports, className, showFiat = false, size = 'sm' }: Props) => {
  const usd = useSolPrice();
  if (isFree(lamports)) {
    return (
      <span className={cn('inline-flex items-center rounded-md bg-lantern/12 px-1.5 py-0.5 font-mono text-[11px] font-semibold tracking-wider text-lantern uppercase', size === 'lg' && 'px-2.5 py-1 text-sm', className)}>
        Free
      </span>
    );
  }
  const sol = lamportsToSol(lamports);
  return (
    <span className={cn('inline-flex flex-col', className)}>
      <span className={cn('font-mono tabular-nums', size === 'sm' && 'text-[13px]', size === 'md' && 'text-base', size === 'lg' && 'text-3xl font-medium tracking-tight')}>
        <NumberFlow value={sol} format={{ maximumFractionDigits: 3 }} suffix=" SOL" />
      </span>
      {showFiat && usd !== null && (
        <span className="font-mono text-xs text-muted tabular-nums">≈ ${(sol * usd).toFixed(2)}</span>
      )}
    </span>
  );
};
