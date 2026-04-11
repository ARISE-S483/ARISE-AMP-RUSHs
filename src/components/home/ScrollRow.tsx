import { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

interface ScrollRowProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onViewAll?: () => void;
}

export function ScrollRow({ title, icon, children, onViewAll }: ScrollRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const isMobile = useIsMobile();

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', checkScroll); ro.disconnect(); };
  }, [checkScroll]);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  return (
    <motion.section variants={fadeUp} className="relative group/row">
      {/* Header with subtle separator */}
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="font-display text-lg md:text-xl font-bold tracking-tight flex items-center gap-2.5">
          {isMobile ? (
            <div className="flex items-center gap-2 text-white">
              <div className="w-[3px] h-[18px] bg-white rounded-full opacity-80" />
              <span className="text-base tracking-wide font-medium">{title}</span>
            </div>
          ) : (
            <>
              {icon}
              {title}
            </>
          )}
        </h2>
        <div className="flex items-center gap-2">
          {!isMobile && (
            <button
              onClick={() => scroll('left')}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 glass-subtle border border-border/30 vision-border ${
                canScrollLeft
                  ? 'hover:bg-accent/50 text-foreground'
                  : 'text-muted-foreground/30 pointer-events-none opacity-40'
              }`}
              aria-label="Scroll left"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          {!isMobile ? (
            <button
              onClick={() => scroll('right')}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 glass-subtle border border-border/30 vision-border ${
                canScrollRight
                  ? 'hover:bg-accent/50 text-foreground'
                  : 'text-muted-foreground/30 pointer-events-none opacity-40'
              }`}
              aria-label="Scroll right"
            >
              <ChevronRight size={18} />
            </button>
          ) : (
             <ChevronRightIcon size={20} className="text-white/50" />
          )}
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium ml-1"
            >
              View all
            </button>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-none scroll-smooth pb-1"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {children}
      </div>
    </motion.section>
  );
}

// Skeleton cards for loading states
export function CardSkeletonRow({ count = 7 }: { count?: number }) {
  return (
    <div className="flex gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-[160px] md:w-[180px] space-y-2.5" style={{ scrollSnapAlign: 'start' }}>
          <div className="aspect-square rounded-xl bg-secondary/50 animate-pulse" />
          <div className="h-3.5 w-4/5 bg-secondary/40 rounded animate-pulse" />
          <div className="h-3 w-3/5 bg-secondary/30 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function TrackSkeletonRow({ count = 7 }: { count?: number }) {
  return (
    <div className="flex gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-[160px] md:w-[180px] space-y-2.5" style={{ scrollSnapAlign: 'start' }}>
          <div className="aspect-square rounded-xl bg-secondary/50 animate-pulse" />
          <div className="h-3.5 w-4/5 bg-secondary/40 rounded animate-pulse" />
          <div className="h-3 w-3/5 bg-secondary/30 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}
