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
            {/* Left Column */}
            <div className="space-y-6">
              {/* About This Project */}
              <div className="card-elevated p-6">
                <Skeleton className="h-7 w-48 rounded mb-4" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-5/6 rounded" />
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-4/5 rounded" />
                </div>
              </div>

              {/* Insight Cards Grid (optional) */}
              <div className="grid gap-6 md:grid-cols-2">
                {Array.from({ length: 2 }).map((_, idx) => (
                  <div key={idx} className="card-elevated p-5 space-y-3">
                    <Skeleton className="h-6 w-40 rounded" />
                    <Skeleton className="h-4 w-full rounded" />
                    <Skeleton className="h-4 w-5/6 rounded" />
                    <Skeleton className="h-4 w-2/3 rounded" />
                  </div>
                ))}
              </div>

              {/* Screenshots (optional) */}
              <div className="card-elevated p-6">
                <Skeleton className="h-7 w-32 rounded mb-4" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: 2 }).map((_, idx) => (
                    <Skeleton key={idx} className="h-48 rounded-lg" />
                  ))}
                </div>
              </div>

              {/* Comments & Discussion */}
              <div className="card-elevated p-6">
                <Skeleton className="h-7 w-48 rounded mb-4" />
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-3/4 rounded" />
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {/* Creator Card */}
              <div className="card-elevated p-5">
                <Skeleton className="h-5 w-24 rounded mb-4" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-14 w-14 rounded-full flex-shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 rounded mb-2" />
                    <Skeleton className="h-3 w-24 rounded" />
                  </div>
                </div>
              </div>

              {/* Team Card (optional) */}
              <div className="card-elevated p-5 space-y-3">
                <Skeleton className="h-5 w-20 rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-5/6 rounded" />
              </div>

              {/* AI Scoring Card */}
              <div className="card-elevated p-5 space-y-3">
                <Skeleton className="h-5 w-40 rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-3/4 rounded" />
              </div>

              {/* Validation Badges Card */}
              <div className="card-elevated p-4 space-y-3">
                <Skeleton className="h-5 w-32 rounded" />
                <Skeleton className="h-24 w-full rounded" />
              </div>

              {/* Categories Card (optional) */}
              <div className="card-elevated p-5 space-y-2">
                <Skeleton className="h-5 w-24 rounded mb-2" />
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <Skeleton key={idx} className="h-8 w-24 rounded-full" />
                  ))}
                </div>
              </div>

              {/* Chains Card (optional) */}
              <div className="card-elevated p-5 space-y-2">
                <Skeleton className="h-5 w-20 rounded mb-2" />
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 2 }).map((_, idx) => (
                    <Skeleton key={idx} className="h-8 w-28 rounded-full" />
                  ))}
                </div>
              </div>

              {/* Tech Stack Card (optional) */}
              <div className="card-elevated p-5 space-y-2">
                <Skeleton className="h-5 w-28 rounded mb-2" />
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <Skeleton key={idx} className="h-6 w-16 rounded" />
                  ))}
                </div>
              </div>

              {/* Hackathon Card (optional) */}
              <div className="card-elevated p-5 space-y-2">
                <Skeleton className="h-5 w-36 rounded mb-2" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-2/3 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
