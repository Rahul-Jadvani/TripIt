import { Skeleton } from '@/components/ui/skeleton';

export function ProjectDetailSkeleton() {
  return (
    <div className="bg-background min-h-screen overflow-hidden">
      <div className="mx-auto w-full max-w-[1400px] px-3 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Hero Header Section */}
          <div className="card-elevated p-6">
            <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
              <div className="flex-1">
                <Skeleton className="h-6 w-24 rounded mb-3" />
                <Skeleton className="h-10 w-3/4 rounded mb-2" />
                <Skeleton className="h-5 w-full rounded mb-1" />
                <Skeleton className="h-5 w-2/3 rounded" />
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-10 w-36 rounded-lg" />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-24 rounded-lg" />
                  <Skeleton className="h-10 w-24 rounded-lg" />
                </div>
                <Skeleton className="h-16 w-28 rounded-[15px]" />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <Skeleton className="h-9 w-24 rounded-lg" />
              <Skeleton className="h-9 w-20 rounded-lg" />
              <Skeleton className="h-9 w-24 rounded-lg" />
              <Skeleton className="h-9 w-24 rounded-lg" />
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
            <div className="space-y-6">
              <Skeleton className="h-6 w-48 rounded-full" />
              <div className="card-elevated p-6">
                <Skeleton className="h-7 w-40 rounded mb-4" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-5/6 rounded" />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {Array.from({ length: 2 }).map((_, idx) => (
                  <div key={idx} className="card-elevated p-5 space-y-3">
                    <Skeleton className="h-6 w-32 rounded" />
                    <Skeleton className="h-4 w-full rounded" />
                    <Skeleton className="h-4 w-5/6 rounded" />
                    <Skeleton className="h-4 w-2/3 rounded" />
                  </div>
                ))}
              </div>

              <div className="card-elevated p-6">
                <Skeleton className="h-7 w-40 rounded mb-4" />
                <div className="space-y-3">
                  <Skeleton className="h-5 w-full rounded" />
                  <Skeleton className="h-5 w-3/4 rounded" />
                </div>
              </div>

              <div className="card-elevated p-6">
                <Skeleton className="h-7 w-32 rounded mb-4" />
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <Skeleton key={idx} className="h-8 w-20 rounded-full" />
                  ))}
                </div>
              </div>

              <div className="card-elevated p-6">
                <Skeleton className="h-7 w-44 rounded mb-4" />
                <div className="space-y-4">
                  {Array.from({ length: 2 }).map((_, idx) => (
                    <div key={idx} className="space-y-2">
                      <Skeleton className="h-4 w-40 rounded" />
                      <Skeleton className="h-4 w-full rounded" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="card-elevated p-5">
                <Skeleton className="h-5 w-32 rounded mb-4" />
                <div className="flex items-center gap-3 mb-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 rounded mb-2" />
                    <Skeleton className="h-3 w-24 rounded" />
                  </div>
                </div>
                <Skeleton className="h-3 w-20 rounded mb-2" />
                <Skeleton className="h-4 w-full rounded" />
              </div>

              <div className="card-elevated p-5 space-y-3">
                <Skeleton className="h-5 w-36 rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-5/6 rounded" />
                <Skeleton className="h-4 w-2/3 rounded" />
              </div>

              <div className="card-elevated p-5 space-y-3">
                <Skeleton className="h-5 w-32 rounded" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </div>

              <div className="card-elevated p-5 space-y-3">
                <Skeleton className="h-5 w-32 rounded" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
