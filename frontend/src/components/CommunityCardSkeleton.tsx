import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function CommunityCardSkeleton() {
  return (
    <Card className="card-skeleton overflow-hidden relative h-full transition-all duration-300">
      {/* Banner */}
      <div className="h-24 w-full bg-gradient-to-br from-primary/20 to-primary/5" />

      <div className="p-5 space-y-3">
        {/* Header with logo and title */}
        <div className="flex items-start gap-3 -mt-8">
          <Skeleton className="h-16 w-16 rounded-full border-4 border-background" />

          <div className="flex-1 mt-6 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-40 rounded" />
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-4 rounded" />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-full rounded" />
          <Skeleton className="h-3 w-5/6 rounded" />
        </div>

        {/* Categories */}
        <div className="flex gap-2 flex-wrap">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-3.5 rounded" />
            <Skeleton className="h-3 w-10 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-3.5 rounded" />
            <Skeleton className="h-3 w-10 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-3.5 rounded" />
            <Skeleton className="h-3 w-10 rounded" />
          </div>
        </div>

        {/* Creator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Skeleton className="h-4 w-32 rounded" />
        </div>
      </div>
    </Card>
  );
}

export function CommunityCardSkeletonGrid({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="h-full">
          <CommunityCardSkeleton />
        </div>
      ))}
    </div>
  );
}

