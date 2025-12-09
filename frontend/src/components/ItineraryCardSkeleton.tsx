import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function ItineraryCardSkeleton() {
  return (
    <div className="group relative w-full">
      <Card className="overflow-hidden relative w-full border border-border/40">
        {/* Caption Section - Creator + Title */}
        <div className="p-4 pb-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 min-w-0 space-y-2">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-3 w-32 rounded" />
            </div>
          </div>

          {/* Title/Caption */}
          <div className="flex items-start justify-between gap-3 mt-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4 rounded" />
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-5/6 rounded" />
            </div>
            {/* Credibility Score badge */}
            <Skeleton className="h-12 w-16 rounded-lg" />
          </div>
        </div>

        {/* Photo Placeholder */}
        <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 animate-pulse" />

        {/* Engagement Actions */}
        <div className="px-4 py-3 border-b border-border/40">
          <div className="flex items-center gap-4">
            <Skeleton className="h-5 w-16 rounded" />
            <Skeleton className="h-5 w-12 rounded" />
            <Skeleton className="h-5 w-5 rounded ml-auto" />
            <Skeleton className="h-5 w-5 rounded" />
          </div>
        </div>

        {/* Trip Overview */}
        <div className="px-4 py-3 space-y-3">
          {/* Description */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-3/4 rounded" />
          </div>

          {/* Trip Details Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-16 rounded" />
                <Skeleton className="h-3 w-12 rounded" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-16 rounded" />
                <Skeleton className="h-3 w-20 rounded" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-16 rounded" />
                <Skeleton className="h-3 w-14 rounded" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-16 rounded" />
                <Skeleton className="h-3 w-12 rounded" />
              </div>
            </div>
          </div>

          {/* Activity Tags */}
          <div className="flex flex-wrap gap-1.5">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-14 rounded-full" />
            <Skeleton className="h-6 w-18 rounded-full" />
            <Skeleton className="h-6 w-12 rounded-full" />
          </div>
        </div>
      </Card>
    </div>
  );
}

export function ItineraryCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, idx) => (
        <ItineraryCardSkeleton key={idx} />
      ))}
    </div>
  );
}
