import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { travelGroupsService } from '@/services/api';
import { TravelGroupCard } from '@/components/TravelGroupCard';
import { TravelGroupCardSkeletonGrid } from '@/components/TravelGroupCardSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Plus, Search, Filter } from 'lucide-react';

export default function TravelGroupsListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    destination: '',
    women_safe: undefined,
    has_availability: true,
    sort: 'newest',
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['travel-groups', search, filters],
    queryFn: async () => {
      const params = {
        search,
        ...filters,
      };
      const response = await travelGroupsService.getGroups(params);
      return response.data;
    },
  });

  const groups = data?.data?.groups || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-black text-foreground flex items-center gap-3">
                <Users className="h-10 w-10 text-primary" />
                Travel Layerz
              </h1>
              <p className="text-muted-foreground mt-2">
                Find travel companions and join group adventures
              </p>
            </div>
            <Button
              onClick={() => navigate('/layerz/create')}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Layerz
            </Button>
          </div>

          {/* Search & Filters */}
          <div className="flex gap-4 mt-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                placeholder="Search layerz by name, destination..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="w-5 h-5 mr-2" />
              Filters
            </Button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <TravelGroupCardSkeletonGrid count={9} />
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-destructive">Failed to load travel layerz</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-20 h-20 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No layerz found</h2>
            <p className="text-muted-foreground mb-6">
              {search || filters.destination
                ? 'Try adjusting your search filters'
                : 'Be the first to create a travel layerz!'}
            </p>
            <Button
              onClick={() => navigate('/layerz/create')}
              className="bg-gradient-to-r from-primary to-accent"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create First Layerz
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group: any) => (
              <TravelGroupCard key={group.id} group={group} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
