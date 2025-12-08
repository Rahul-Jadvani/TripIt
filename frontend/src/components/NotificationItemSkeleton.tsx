import { Skeleton } from '@/components/ui/skeleton';

export function NotificationItemSkeleton() {
  return (
    <div className="flex gap-3 p-4 rounded-xl border border-border/50 bg-background/60 shadow-sm">
      <div className="mt-0.5">
        <Skeleton className="h-4 w-4 rounded" />
      </div>

      <div className="flex-1 space-y-2 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-4 w-48 rounded" />
          <Skeleton className="h-2 w-2 rounded-full" />
        </div>

        <Skeleton className="h-3 w-full rounded" />
        <Skeleton className="h-3 w-2/3 rounded" />

        <Skeleton className="h-3 w-24 rounded" />
      </div>
    </div>
  );
}

export function NotificationItemSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, idx) => (
        <NotificationItemSkeleton key={idx} />
      ))}
    </div>
  );
}
