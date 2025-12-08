import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function TravelGroupCardSkeleton() {
  return (
    <Card className="card-skeleton overflow-hidden relative transition-all duration-300">
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-48 rounded" />
            </div>

            <div className="flex items-center gap-1">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-32 rounded" />
            </div>

            <div className="space-y-2">
              <Skeleton className="h-3 w-full rounded" />
              <Skeleton className="h-3 w-5/6 rounded" />
            </div>
          </div>

          {/* Average Safety Score */}
          <Skeleton className="h-16 w-16 rounded-lg" />
        </div>

        {/* Dates */}
        <div className="flex items-center gap-2 bg-secondary/30 rounded-lg p-2.5 border border-border/40">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-40 rounded" />
        </div>

        {/* Activity Tags & Badges */}
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-18 rounded-full" />
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>

        {/* Footer with Members & Action */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/40">
          {/* Member Count */}
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              <Skeleton className="h-7 w-7 rounded-full border-2 border-background" />
              <Skeleton className="h-7 w-7 rounded-full border-2 border-background" />
              <Skeleton className="h-7 w-7 rounded-full border-2 border-background" />
            </div>
            <Skeleton className="h-4 w-12 rounded" />
          </div>

          {/* Join/Leave Button */}
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>
    </Card>
  );
}

export function TravelGroupCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, idx) => (
        <TravelGroupCardSkeleton key={idx} />
      ))}
    </div>
  );
}
