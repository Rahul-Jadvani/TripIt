import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function DashboardStatsSkeleton() {
  return (
    <div className="space-y-8 w-full box-border overflow-hidden">
      {/* Stats Grid skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 w-full box-border overflow-hidden">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="card-elevated p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <Skeleton className="h-4 w-32 rounded mb-2" />
                <Skeleton className="h-8 w-16 rounded" />
              </div>
              <Skeleton className="h-10 w-10 rounded-[10px] flex-shrink-0" />
            </div>
            <Skeleton className="h-3 w-40 rounded" />
          </div>
        ))}
      </div>

      {/* Main Content Grid skeleton */}
      <div className="grid gap-6 lg:grid-cols-2 w-full box-border overflow-hidden">
        {/* Quick Actions Card skeleton */}
        <div className="card-elevated p-6">
          <Skeleton className="h-7 w-40 rounded mb-3" />
          <Skeleton className="h-4 w-52 rounded mb-6" />
          <div className="space-y-3">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>

        {/* Recent Projects Card skeleton */}
        <div className="card-elevated p-6">
          <Skeleton className="h-7 w-40 rounded mb-3" />
          <Skeleton className="h-4 w-52 rounded mb-6" />

          {/* Recent Projects List skeleton */}
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="flex items-start gap-4 group">
                <Skeleton className="h-3 w-3 rounded-full flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-48 rounded mb-2" />
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-3 w-24 rounded" />
                    <Skeleton className="h-3 w-20 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardHeaderSkeleton() {
  return (
    <div className="mb-10 card-elevated p-8">
      <Skeleton className="h-10 w-96 rounded mb-2" />
      <Skeleton className="h-4 w-80 rounded" />
    </div>
  );
}
