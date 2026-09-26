import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { Link } from 'react-router';

type Props = { title: string; eyebrow?: string; href?: string; children: ReactNode };

/** Horizontal, snap-scrolling shelf. Arrow buttons page by the visible width. */
export const Rail = ({ title, eyebrow, href, children }: Props) => {
  const scroller = useRef<HTMLDivElement>(null);
  const page = (dir: 1 | -1) => scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth * 0.85, behavior: 'smooth' });

  return (
    <section className="group/rail">
      <div className="mb-5 flex items-end justify-between gap-4 px-4 sm:px-8">
        <div>
          {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
          <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] sm:text-[28px]">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {href && (
            <Link to={href} className="mr-2 text-sm text-muted transition-colors duration-150 hover:text-text">
              See all
            </Link>
          )}
          <button type="button" onClick={() => page(-1)} aria-label="Scroll left" className="pressable hidden size-9 place-items-center rounded-full border border-line text-muted transition-colors duration-150 hover:border-line-strong hover:text-text sm:grid">
            <ChevronLeft className="size-4" />
          </button>
          <button type="button" onClick={() => page(1)} aria-label="Scroll right" className="pressable hidden size-9 place-items-center rounded-full border border-line text-muted transition-colors duration-150 hover:border-line-strong hover:text-text sm:grid">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <div ref={scroller} className="no-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-4 sm:scroll-px-8 sm:gap-5 sm:px-8">
        {children}
      </div>
    </section>
  );
};

export const RailItem = ({ children }: { children: ReactNode }) => (
  <div className="w-[46%] shrink-0 snap-start sm:w-[30%] md:w-[23%] lg:w-[17.5%]">{children}</div>
);
