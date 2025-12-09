import { useEffect, useRef, useState } from 'react';

interface UseLazyLoadOptions {
  threshold?: number | number[];
  rootMargin?: string;
}

/**
 * Custom hook for lazy loading elements using Intersection Observer
 * @param options - Configuration for Intersection Observer
 * @returns ref to attach to element and isVisible state
 */
export function useLazyLoad(options: UseLazyLoadOptions = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        // Stop observing after first intersection
        observer.unobserve(entry.target);
      }
    }, {
      threshold: options.threshold ?? 0.1,
      rootMargin: options.rootMargin ?? '50px',
    });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [options.threshold, options.rootMargin]);

  return { ref, isVisible };
}

/**
 * Hook for infinite scroll pagination
 * @param callback - Function to call when user scrolls near bottom
 * @param threshold - Distance from bottom in pixels to trigger callback
 */
export function useInfiniteScroll(callback: () => void, threshold = 500) {
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          callback();
        }
      },
      {
        threshold: 0.1,
        rootMargin: `${threshold}px`,
      }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [callback, threshold]);

  return observerTarget;
}
