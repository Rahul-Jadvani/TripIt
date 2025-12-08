import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SnapCard from './SnapCard';

interface TravelSnapsCarouselProps {
  snaps: any[]; // Array of snap objects
  className?: string;
}

export function TravelSnapsCarousel({ snaps, className = '' }: TravelSnapsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isInView, setIsInView] = useState(false);

  // ====== VIEWPORT DETECTION (for auto-scroll on viewport) ======
  useEffect(() => {
    if (!carouselRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.1, // when 10% of the carousel is visible
      }
    );

    observer.observe(carouselRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  // ====== INFINITE DATA DUPLICATION ======
  const duplicatedSnaps = useMemo(() => {
    if (snaps.length === 0) return [];
    return [...snaps, ...snaps, ...snaps]; // 3x duplication
  }, [snaps]);

  const originalLength = snaps.length;
  const middleStart = originalLength; // starting index of middle section
  const middleEnd = originalLength * 2 - 1; // ending index of middle section

  const CARD_WIDTH = 320 + 16; // w-80 + gap-4 (visual design kept the same)

  // ====== INITIAL POSITION TO MIDDLE SECTION ======
  useEffect(() => {
    if (!scrollRef.current || duplicatedSnaps.length === 0) return;

    const container = scrollRef.current;
    const initialScroll = middleStart * CARD_WIDTH;

    container.scrollLeft = initialScroll;
    setCurrentIndex(middleStart);
  }, [duplicatedSnaps.length, middleStart]);

  // ====== INFINITE SCROLL HANDLER ======
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || isDragging || duplicatedSnaps.length === 0) return;

    const container = scrollRef.current;
    const currentScroll = container.scrollLeft;

    // Jump to the start of middle section when going too far right
    if (currentScroll >= middleEnd * CARD_WIDTH - container.clientWidth / 2) {
      container.scrollLeft = middleStart * CARD_WIDTH;
      setCurrentIndex(middleStart);
    }
    // Jump to near end of middle section when going too far left
    else if (currentScroll <= middleStart * CARD_WIDTH - container.clientWidth / 2) {
      container.scrollLeft = (middleEnd - 2) * CARD_WIDTH;
      setCurrentIndex(middleEnd - 2);
    }
  }, [duplicatedSnaps.length, middleStart, middleEnd, isDragging]);

  // ====== NAVIGATION HELPERS ======
  const scrollToCard = useCallback((index: number) => {
    if (!scrollRef.current) return;

    scrollRef.current.scrollTo({
      left: index * CARD_WIDTH,
      behavior: 'smooth',
    });
  }, []);

  const scrollPrev = useCallback(() => {
    if (duplicatedSnaps.length === 0) return;

    const newIndex = currentIndex - 1;
    setCurrentIndex(newIndex);
    scrollToCard(newIndex);
  }, [currentIndex, duplicatedSnaps.length, scrollToCard]);

  const scrollNext = useCallback(() => {
    if (duplicatedSnaps.length === 0) return;

    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);
    scrollToCard(newIndex);
  }, [currentIndex, duplicatedSnaps.length, scrollToCard]);

  // ====== DRAG / TOUCH HANDLERS ======
  const handleInteractionStart = useCallback(() => {
    setIsAutoScrolling(false);
  }, []);

  const handleInteractionEnd = useCallback(() => {
    // Restart auto-scroll after some idle time
    const timeout = setTimeout(() => {
      setIsAutoScrolling(true);
    }, 5000);

    return () => clearTimeout(timeout);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    handleInteractionStart();
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    handleInteractionEnd();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!scrollRef.current) return;
    handleInteractionStart();
    setIsDragging(true);
    setStartX(e.touches[0].pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !scrollRef.current) return;
    const x = e.touches[0].pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    handleInteractionEnd();
  };

  // ====== HOVER HANDLERS (PAUSE AUTO-SCROLL) ======
  const handleMouseEnter = () => {
    setIsHovered(true);
    handleInteractionStart();
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    handleInteractionEnd();
  };

  // ====== AUTO-SCROLL ONLY WHEN IN VIEWPORT ======
  useEffect(() => {
    if (!isAutoScrolling || isDragging || isHovered || !isInView) return;
    if (duplicatedSnaps.length === 0) return;

    const interval = setInterval(() => {
      scrollNext();
    }, 3000);

    return () => clearInterval(interval);
  }, [
    isAutoScrolling,
    isDragging,
    isHovered,
    isInView,
    duplicatedSnaps.length,
    scrollNext,
  ]);

  // ====== KEYBOARD NAVIGATION ======
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isInView) return; // only when carousel is visible

      if (e.key === 'ArrowLeft') {
        handleInteractionStart();
        scrollPrev();
        handleInteractionEnd();
      } else if (e.key === 'ArrowRight') {
        handleInteractionStart();
        scrollNext();
        handleInteractionEnd();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInView, handleInteractionStart, handleInteractionEnd, scrollPrev, scrollNext]);

  // ====== EMPTY STATE ======
  if (snaps.length === 0) {
    return (
      <div className={`flex items-center justify-center h-96 bg-secondary/20 rounded-lg ${className}`}>
        <p className="text-muted-foreground">No snaps available</p>
      </div>
    );
  }

  // ====== RENDER ======
  return (
    <div ref={carouselRef} className={`relative w-full ${className}`}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Travel Snaps</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Live moments from travelers around the world
          </p>
        </div>
        {/* All Posts arrow button */}
        <button
          onClick={() => navigate('/gallery/snap')}
          className="badge badge-dash badge-primary hover:opacity-90 flex items-center gap-1"
        >
          All Posts
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {/* Carousel Container with Navigation Arrows */}
      <div
        className="relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Left Arrow */}
        <button
          onClick={() => {
            handleInteractionStart();
            scrollPrev();
            handleInteractionEnd();
          }}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all duration-200 hover:scale-110"
          aria-label="Previous snap"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        {/* Right Arrow */}
        <button
          onClick={() => {
            handleInteractionStart();
            scrollNext();
            handleInteractionEnd();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all duration-200 hover:scale-110"
          aria-label="Next snap"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        {/* Main Carousel */}
        <div className="relative overflow-hidden rounded-xl">
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory"
            style={{
              scrollSnapType: 'x mandatory',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
            onScroll={handleScroll}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {duplicatedSnaps.map((snap, index) => (
              <div
                key={`${snap.id}-${index}`}
                className="flex-shrink-0 w-80 snap-center snap-always transition-transform duration-300 hover:scale-105"
                style={{
                  scrollSnapAlign: 'center',
                }}
              >
                <div className="h-96">
                  <SnapCard snap={snap} />
                </div>
              </div>
            ))}
          </div>

          {/* Gradient overlays for premium look */}
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent pointer-events-none z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `,
        }}
      />
    </div>
  );
}
