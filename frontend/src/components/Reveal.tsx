import { useEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Props = {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  /** `rise`: fade + lift + unblur. `clip`: wipe up from the bottom edge. */
  variant?: 'rise' | 'clip';
  delay?: number;
};

/**
 * Scroll-triggered entrance. An IntersectionObserver flips `data-shown`; CSS transitions do the
 * animating, so it stays smooth off the main thread (and under throttled rAF). Plays once.
 * For `clip`, the observer watches the unclipped wrapper — IO honours the target's own clip-path.
 */
export const Reveal = ({ children, as: Tag = 'div', className, variant = 'rise', delay = 0 }: Props) => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          el.dataset.shown = '';
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const style = { '--reveal-delay': `${delay}ms` } as CSSProperties;
  return variant === 'clip' ? (
    <Tag ref={ref} className={cn('reveal-clip', className)} style={style}>
      <div className="reveal-clip-inner">{children}</div>
    </Tag>
  ) : (
    <Tag ref={ref} className={cn('reveal', className)} style={style}>
      {children}
    </Tag>
  );
};
