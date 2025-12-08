import { Skeleton } from '@/components/ui/skeleton';

export function SnapCardSkeleton() {
  return (
    <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl shadow-2xl overflow-hidden border-2 border-orange-500/20 h-full flex flex-col">
      {/* CREATOR HEADER */}
      <div className="p-4 flex items-center gap-3 border-b border-orange-500/10">
        <Skeleton className="w-10 h-10 rounded-full" />

        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24 rounded bg-gray-700" />
          <Skeleton className="h-3 w-20 rounded bg-gray-700" />
        </div>

        <Skeleton className="h-3 w-16 rounded bg-gray-700" />
      </div>

      {/* MAIN IMAGE PLACEHOLDER */}
      <div className="relative flex-1 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 animate-pulse min-h-[300px]">
        {/* LOCATION OVERLAY */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4">
          <div className="flex items-start gap-2">
            <Skeleton className="w-5 h-5 rounded bg-orange-500/50" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32 rounded bg-orange-500/50" />
              <Skeleton className="h-3 w-48 rounded bg-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* CAPTION */}
      <div className="p-4 space-y-2">
        <Skeleton className="h-3 w-full rounded bg-gray-700" />
        <Skeleton className="h-3 w-3/4 rounded bg-gray-700" />
      </div>
    </div>
  );
}

export function SnapCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, idx) => (
        <SnapCardSkeleton key={idx} />
      ))}
    </div>
  );
}
