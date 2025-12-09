import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { TravelGroup, TravelGroupFilters } from '@/types';
import { TravelGroupCard } from '@/components/TravelGroupCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, Plus, Users, X } from 'lucide-react';
import { travelGroupsService } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

const ACTIVITY_TAGS = [
  'Trekking',
  'Photography',
  'Food',
  'Culture',
  'Adventure',
  'Wildlife',
  'Beach',
  'Mountains',
  'Backpacking',
  'Luxury',
];

const GROUP_TYPES = [
  { value: 'interest_based', label: 'Interest Based' },
  { value: 'safety_focused', label: 'Safety Focused' },
  { value: 'women_only', label: 'Women Only' },
  { value: 'location_based', label: 'Location Based' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Popular' },
  { value: 'starting_soon', label: 'Starting Soon' },
];

export function TravelGroupDiscovery() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [filters, setFilters] = useState<TravelGroupFilters>({
    search: '',
    destination: '',
    group_type: undefined,
    activity: [],
    women_safe: undefined,
    has_availability: undefined,
    sort: 'newest',
  });

  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['travel-groups', filters, page],
    queryFn: async () => {
      const response = await travelGroupsService.getGroups({
        ...filters,
        page,
        limit: 20,
      });
      return response.data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const groups = data?.data || [];
  const pagination = data?.pagination;

  const handleSearchChange = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
    setPage(1);
  };

  const handleDestinationChange = (value: string) => {
    setFilters((prev) => ({ ...prev, destination: value }));
    setPage(1);
  };

  const handleGroupTypeChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      group_type: value === 'all' ? undefined : value,
    }));
    setPage(1);
  };

  const handleSortChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      sort: value as 'newest' | 'popular' | 'starting_soon',
    }));
    setPage(1);
  };

  const toggleActivityTag = (tag: string) => {
    setFilters((prev) => {
      const activities = prev.activity || [];
      const newActivities = activities.includes(tag)
        ? activities.filter((a) => a !== tag)
        : [...activities, tag];
      return { ...prev, activity: newActivities };
    });
    setPage(1);
  };

  const toggleWomenSafe = () => {
    setFilters((prev) => ({
      ...prev,
      women_safe: prev.women_safe === true ? undefined : true,
    }));
    setPage(1);
  };

  const toggleAvailability = () => {
    setFilters((prev) => ({
      ...prev,
      has_availability: prev.has_availability === true ? undefined : true,
    }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      destination: '',
      group_type: undefined,
      activity: [],
      women_safe: undefined,
      has_availability: undefined,
      sort: 'newest',
    });
    setPage(1);
  };

  const handleCreateGroup = () => {
    if (!user) {
      toast.error('Please login to create a group');
      navigate('/login');
      return;
    }
    navigate('/groups/create');
  };

  const activeFilterCount = [
    filters.search,
    filters.destination,
    filters.group_type,
    filters.activity?.length,
    filters.women_safe,
    filters.has_availability,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            Discover Travel Groups
          </h1>
          <p className="text-muted-foreground mt-1">
            Find and join travel groups for your next adventure
          </p>
        </div>
        <Button onClick={handleCreateGroup} size="lg">
          <Plus className="h-5 w-5 mr-2" />
          Create Group
        </Button>
      </div>

      {/* Search & Sort Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search groups by name..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        <Input
          placeholder="Filter by destination..."
          value={filters.destination}
          onChange={(e) => handleDestinationChange(e.target.value)}
          className="sm:w-64"
        />

        <Select value={filters.sort || 'newest'} onValueChange={handleSortChange}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="relative"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="bg-secondary/30 rounded-lg border border-border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Advanced Filters</h3>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>

          {/* Group Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Group Type</label>
            <Select
              value={filters.group_type || 'all'}
              onValueChange={handleGroupTypeChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {GROUP_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Activity Tags */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Activities</label>
            <div className="flex flex-wrap gap-2">
              {ACTIVITY_TAGS.map((tag) => (
                <Badge
                  key={tag}
                  variant={filters.activity?.includes(tag) ? 'default' : 'outline'}
                  className="cursor-pointer hover:bg-primary/80"
                  onClick={() => toggleActivityTag(tag)}
                >
                  {tag}
                  {filters.activity?.includes(tag) && (
                    <X className="h-3 w-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-3">
            <Badge
              variant={filters.women_safe ? 'default' : 'outline'}
              className="cursor-pointer hover:bg-primary/80 px-3 py-1.5"
              onClick={toggleWomenSafe}
            >
              Women Safe Only
            </Badge>
            <Badge
              variant={filters.has_availability ? 'default' : 'outline'}
              className="cursor-pointer hover:bg-primary/80 px-3 py-1.5"
              onClick={toggleAvailability}
            >
              Has Availability
            </Badge>
          </div>
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-destructive">Failed to load travel groups. Please try again.</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12 bg-secondary/20 rounded-lg border border-border">
          <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-bold text-foreground mb-2">No groups found</h3>
          <p className="text-muted-foreground mb-6">
            Be the first to create a travel group for this destination!
          </p>
          <Button onClick={handleCreateGroup}>
            <Plus className="h-4 w-4 mr-2" />
            Create Group
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {groups.map((group: TravelGroup) => (
              <TravelGroupCard
                key={group.id}
                group={group}
                onClick={() => navigate(`/groups/${group.id}`)}
                averageSafetyScore={0} // TODO: Calculate from itineraries
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground px-4">
                Page {page} of {pagination.pages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
