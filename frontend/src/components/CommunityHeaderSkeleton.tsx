import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function CommunityHeaderSkeleton() {
  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="relative h-48 w-full overflow-hidden rounded-lg">
        <Skeleton className="h-full w-full" />
      </div>

      {/* Main Header */}
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-end -mt-20 md:-mt-16 px-4">
        {/* Logo */}
        <Skeleton className="h-32 w-32 rounded-full border-4 border-background shadow-lg" />

        {/* Info */}
        <div className="flex-1 space-y-3">
          {/* Title row */}
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-8 w-56 rounded" />
            <Skeleton className="h-6 w-20 rounded" />
            <Skeleton className="h-6 w-20 rounded" />
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-24 rounded" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-24 rounded" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-24 rounded" />
            </div>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-24 rounded" />
          <Skeleton className="h-9 w-28 rounded" />
        </div>
      </div>

      {/* Description */}
      <div className="px-4">
        <Skeleton className="h-4 w-5/6 rounded mb-2" />
        <Skeleton className="h-4 w-2/3 rounded" />
      </div>

      {/* Social Links */}
      <div className="flex flex-wrap gap-2 px-4">
        <Skeleton className="h-8 w-24 rounded" />
        <Skeleton className="h-8 w-24 rounded" />
        <Skeleton className="h-8 w-24 rounded" />
      </div>
    </div>
  );
}

