import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { WomenGuideCard } from '@/components/WomenGuideCard';
import { GuideBookingDialog } from '@/components/GuideBookingDialog';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, X, Users } from 'lucide-react';
import { WomenGuide } from '@/types';
import api from '@/services/api';

interface GuideFilters {
  search: string;
  location: string;
  language: string;
  specialization: string;
  verifiedOnly: boolean;
  minRating: number;
  sort: 'rating' | 'experience' | 'availability';
}

export function WomenGuideDirectory() {
  const [filters, setFilters] = useState<GuideFilters>({
    search: '',
    location: '',
    language: '',
    specialization: '',
    verifiedOnly: false,
    minRating: 0,
    sort: 'rating',
  });
  const [page, setPage] = useState(1);
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['women-guides', filters, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: '12',
        sort: filters.sort,
        ...(filters.search && { search: filters.search }),
        ...(filters.location && { location: filters.location }),
        ...(filters.language && { language: filters.language }),
        ...(filters.specialization && { specialization: filters.specialization }),
        ...(filters.verifiedOnly && { verified_only: 'true' }),
        ...(filters.minRating > 0 && { min_rating: filters.minRating.toString() }),
      });

      const response = await api.get(`/women-safety/guides?${params.toString()}`);
      return response.data.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const guides: WomenGuide[] = data?.guides || [];
  const totalPages = data?.pagination?.pages || 1;
  const totalGuides = data?.pagination?.total || 0;

  const handleFilterChange = (key: keyof GuideFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page on filter change
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      location: '',
      language: '',
      specialization: '',
      verifiedOnly: false,
      minRating: 0,
      sort: 'rating',
    });
    setPage(1);
  };

  const activeFiltersCount = [
    filters.search,
    filters.location,
    filters.language,
    filters.specialization,
    filters.verifiedOnly,
    filters.minRating > 0,
  ].filter(Boolean).length;

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Users className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold text-foreground">Women's Travel Guides</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Connect with verified women guides for safe and authentic travel experiences
        </p>
      </div>

      {/* Search and Filter Bar */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, location, or specialization..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Sort */}
          <Select
            value={filters.sort}
            onValueChange={(value: any) => handleFilterChange('sort', value)}
          >
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="experience">Most Experienced</SelectItem>
              <SelectItem value="availability">Available Now</SelectItem>
            </SelectContent>
          </Select>

          {/* Filter Toggle */}
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-primary text-black">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-border space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Location Filter */}
              <div className="space-y-2">
                <Label htmlFor="location">Service Location</Label>
                <Input
                  id="location"
                  placeholder="e.g., Delhi, Mumbai"
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                />
              </div>

              {/* Language Filter */}
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Input
                  id="language"
                  placeholder="e.g., English, Hindi"
                  value={filters.language}
                  onChange={(e) => handleFilterChange('language', e.target.value)}
                />
              </div>

              {/* Specialization Filter */}
              <div className="space-y-2">
                <Label htmlFor="specialization">Specialization</Label>
                <Input
                  id="specialization"
                  placeholder="e.g., adventure, cultural"
                  value={filters.specialization}
                  onChange={(e) => handleFilterChange('specialization', e.target.value)}
                />
              </div>
            </div>

            {/* Verified and Rating Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="verified"
                  checked={filters.verifiedOnly}
                  onCheckedChange={(checked) =>
                    handleFilterChange('verifiedOnly', checked === true)
                  }
                />
                <label
                  htmlFor="verified"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Verified guides only
                </label>
              </div>

              <div className="space-y-2">
                <Label>Minimum Rating: {filters.minRating > 0 ? filters.minRating : 'Any'}</Label>
                <Slider
                  value={[filters.minRating]}
                  onValueChange={(value) => handleFilterChange('minRating', value[0])}
                  max={5}
                  step={0.5}
                  className="w-full"
                />
              </div>
            </div>

            {/* Clear Filters */}
            {activeFiltersCount > 0 && (
              <Button variant="ghost" onClick={clearFilters} className="w-full">
                <X className="h-4 w-4 mr-2" />
                Clear all filters
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Results Count */}
      <div className="mb-4 text-sm text-muted-foreground">
        Found {totalGuides} guide{totalGuides !== 1 ? 's' : ''}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-6 space-y-4">
              <div className="flex items-start gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-full" />
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Failed to load guides. Please try again.</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </Card>
      )}

      {/* Guides Grid */}
      {!isLoading && !error && guides.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {guides.map((guide) => (
            <WomenGuideCard
              key={guide.id}
              guide={guide}
              onBook={(guideId) => setSelectedGuideId(guideId)}
            />
          ))}
        </div>
      )}

      {/* No Results */}
      {!isLoading && !error && guides.length === 0 && (
        <Card className="p-12 text-center">
          <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No guides found</h3>
          <p className="text-muted-foreground mb-4">
            Try adjusting your filters or search criteria
          </p>
          {activeFiltersCount > 0 && (
            <Button variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </Card>
      )}

      {/* Pagination */}
      {!isLoading && !error && guides.length > 0 && totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <div className="flex items-center gap-2">
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const pageNum = page <= 3 ? i + 1 : page - 2 + i;
              if (pageNum > totalPages) return null;
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? 'default' : 'outline'}
                  onClick={() => setPage(pageNum)}
                  className="w-10"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Booking Dialog */}
      {selectedGuideId && (
        <GuideBookingDialog
          guideId={selectedGuideId}
          open={!!selectedGuideId}
          onOpenChange={(open) => !open && setSelectedGuideId(null)}
        />
      )}
    </div>
  );
}
