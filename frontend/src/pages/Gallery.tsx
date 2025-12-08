import { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useItineraries } from "@/hooks/useProjects";
import { ItineraryCard } from "@/components/ItineraryCard";
import { Loader2, Grid3X3, List } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Gallery() {
  const { category } = useParams<{ category?: string }>();
  const [sort, setSort] = useState<"trending" | "top-rated" | "newest">(
    "trending"
  );
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    if (category === "top-rated") {
      setSort("top-rated");
    } else if (category === "newest") {
      setSort("newest");
    } else {
      setSort("trending");
    }
  }, [category]);

  const { data, isLoading, error, isFetching } = useItineraries(sort, page);

  const itineraries = data?.data || [];

  const loadMore = () => {
    if (!isFetching && data?.pagination?.hasNext) {
      setPage((prev) => prev + 1);
    }
  };

  if (isLoading && page === 1) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="text-center">
            <p className="text-destructive">Failed to load itineraries</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-foreground mb-4">
            Travel Gallery
          </h1>
          <p className="text-muted-foreground text-lg">
            Discover amazing travel itineraries from around the world
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex gap-2">
            <Button
              variant={sort === "trending" ? "default" : "outline"}
              onClick={() => setSort("trending")}
              size="sm"
            >
              Trending
            </Button>
            <Button
              variant={sort === "top-rated" ? "default" : "outline"}
              onClick={() => setSort("top-rated")}
              size="sm"
            >
              Top Rated
            </Button>
            <Button
              variant={sort === "newest" ? "default" : "outline"}
              onClick={() => setSort("newest")}
              size="sm"
            >
              Newest
            </Button>
          </div>

          <div className="flex gap-2 ml-auto">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              onClick={() => setViewMode("grid")}
              size="sm"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              onClick={() => setViewMode("list")}
              size="sm"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Grid/List View */}
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              : "space-y-6"
          }
        >
          {itineraries.map((itinerary) => (
            <div
              key={itinerary.id}
              className={viewMode === "list" ? "max-w-4xl mx-auto" : ""}
            >
              <ItineraryCard project={itinerary} />
            </div>
          ))}
        </div>

        {/* Load More */}
        {data?.pagination?.hasNext && (
          <div className="flex justify-center mt-12">
            <Button
              onClick={loadMore}
              disabled={isFetching}
              variant="outline"
              size="lg"
            >
              {isFetching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading...
                </>
              ) : (
                "Load More Itineraries"
              )}
            </Button>
          </div>
        )}

        {/* Empty State */}
        {itineraries.length === 0 && !isLoading && (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">
              No itineraries found
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
