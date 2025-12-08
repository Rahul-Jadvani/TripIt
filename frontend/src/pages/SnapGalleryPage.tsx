import React, { useMemo } from "react";
import SnapCard from "@/components/SnapCard";
import { useSnaps, Snap } from "@/hooks/useSnaps";
import { CoffeeLoader } from "@/components/CoffeeLoader";

export default function SnapGalleryPage() {
  const { data: snapsData, isLoading, isError, error } = useSnaps(1, 100, {
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  }); // Fetch up to 100 snaps for the gallery

  const snaps = useMemo(() => snapsData?.data || [], [snapsData]);

  const sortedSnaps = useMemo(() => {
    if (!snaps) return [];
    return [...snaps].sort(
      (a: Snap, b: Snap) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
    );
  }, [snaps]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <CoffeeLoader message="Loading snaps..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-96 bg-destructive/10 rounded-lg">
        <p className="text-destructive-foreground">Error loading snaps: {error?.message}</p>
      </div>
    );
  }

  if (snaps.length === 0) {
    return null;
  }

  return (
    <div className="w-full px-4 md:px-8 lg:px-16 py-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-10">
        <h1 className="text-3xl font-bold">Snap Gallery</h1>
        <p className="text-muted-foreground mt-2 sm:mt-0">
          Explore all travel snaps shared by the community.
        </p>
      </div>

      {/* GRID */}
      <div
        className="
          grid
          grid-cols-1 
          sm:grid-cols-2 
          md:grid-cols-3 
          lg:grid-cols-4
          xl:grid-cols-5 
          gap-6
        "
      >
        {sortedSnaps.map((snap: Snap) => (
          <div
            key={snap.id}
            className="rounded-xl overflow-hidden shadow-lg transition-transform hover:scale-[1.02] border border-border/20"
          >
            <SnapCard snap={snap} />
          </div>
        ))}
      </div>
    </div>
  );
}

