import { useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook for infinite scroll pagination
 * Combines React Query's useInfiniteQuery with scroll detection
 *
 * Usage:
 * const { data, isLoading, hasNextPage, fetchNextPage, observerTarget } = useInfiniteScroll({
 *   queryKey: ['admin', 'projects'],
 *   queryFn: ({ pageParam = 1 }) => adminService.getProjects({ page: pageParam, perPage: 30 }),
 * })
 */

interface UseInfiniteScrollOptions {
  queryKey: any[];
  queryFn: ({ pageParam }: { pageParam: number }) => Promise<any>;
  initialPageParam?: number;
  staleTime?: number;
  gcTime?: number;
}

export function useInfiniteScroll({
  queryKey,
  queryFn,
  initialPageParam = 1,
  staleTime = 1000 * 60 * 3,
  gcTime = 1000 * 60 * 30,
}: UseInfiniteScrollOptions) {
  const observerTarget = useRef<HTMLDivElement>(null);

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isLoading,
    status,
  } = useInfiniteQuery({
    queryKey,
    queryFn,
    initialPageParam,
    getNextPageParam: (lastPage, pages) => {
      // If the last page returned fewer items than per_page, we've reached the end
      const itemsReturned = lastPage.projects?.length || lastPage.data?.length || lastPage.length || 0;
      const perPage = 30; // Matches the perPage we use

      if (itemsReturned < perPage) {
        return undefined; // No more pages
      }

      return pages.length + 1; // Next page number
    },
    staleTime,
    gcTime,
  });

  // Intersection Observer for auto-load on scroll
  useEffect(() => {
    if (!observerTarget.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // When the target comes into view and we have more pages, fetch next
        if (entries[0].isIntersecting && hasNextPage && !isFetching) {
          fetchNextPage();
        }
      },
      {
        rootMargin: '200px', // Start fetching 200px before reaching bottom
      }
    );

    observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetching, fetchNextPage]);

  // Flatten all pages into a single array
  const allItems = data?.pages?.flatMap((page) => {
    if (Array.isArray(page)) return page;
    return page.projects || page.data || [];
  }) || [];

  return {
    items: allItems,
    isLoading,
    isFetching,
    error,
    hasNextPage,
    fetchNextPage: useCallback(() => fetchNextPage(), [fetchNextPage]),
    observerTarget,
    status,
  };
}
