import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function InvestorCardSkeleton() {
  return (
    <Card className="card-skeleton overflow-hidden relative w-full h-full box-border">
      <CardContent className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2 min-w-0">
            <Skeleton className="h-5 w-48 rounded" />
            <Skeleton className="h-3 w-36 rounded" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-4 rounded" />
              <Skeleton className="h-3 w-28 rounded" />
            </div>
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-full rounded" />
          <Skeleton className="h-3 w-5/6 rounded" />
          <Skeleton className="h-3 w-2/3 rounded" />
        </div>

        {/* Key Info Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-3 rounded" />
            <Skeleton className="h-3 w-24 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-3 rounded" />
            <Skeleton className="h-3 w-24 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-3 rounded" />
            <Skeleton className="h-3 w-24 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-3 rounded" />
            <Skeleton className="h-3 w-24 rounded" />
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-3">
          <div>
            <Skeleton className="h-3 w-24 rounded mb-2" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          </div>
          <div>
            <Skeleton className="h-3 w-24 rounded mb-2" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
          <div>
            <Skeleton className="h-3 w-28 rounded mb-2" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-2 pt-4 border-t border-border/40 flex-wrap">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-28 rounded-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function InvestorCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {Array.from({ length: count }).map((_, idx) => (
        <InvestorCardSkeleton key={idx} />
      ))}
    </div>
  );
}

