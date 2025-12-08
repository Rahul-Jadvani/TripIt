import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function CommunityPostCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-4 w-24 rounded" />
                </div>
                <Skeleton className="h-3 w-16 rounded" />
              </div>
            </div>

            {/* Title */}
            <Skeleton className="h-5 w-3/4 rounded mb-2" />

            {/* Content */}
            <div className="mb-3 space-y-2">
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-2/3 rounded" />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-16 rounded" />
              <Skeleton className="h-8 w-20 rounded" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CommunityPostCardSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, idx) => (
        <CommunityPostCardSkeleton key={idx} />
      ))}
    </div>
  );
}
