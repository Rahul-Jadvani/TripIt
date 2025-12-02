import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCommunities } from '@/hooks/useCommunities';
import { CommunityCard } from '@/components/CommunityCard';
import { CommunityFilters } from '@/components/CommunityFilters';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Loader2 } from 'lucide-react';
import { CommunityCardSkeletonGrid } from '@/components/CommunityCardSkeleton';
import { useAuth } from '@/context/AuthContext';

export default function CommunitiesListPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('trending');
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useCommunities({
    search,
    sort,
    category,
    featured: featuredOnly,
    page,
    limit: 12,
  });

  const communities = data?.communities || [];
  const totalPages = data?.pagination?.pages || 1;

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold">Travel Communities</h1>
          <p className="text-muted-foreground mt-2">
            Discover and join travel communities
          </p>
        </div>
        {user && (
          <Button asChild>
            <Link to="/community/create">
              <Plus className="h-4 w-4 mr-2" />
              Create Community
            </Link>
          </Button>
        )}
      </div>

      {/* Filters */}
      <CommunityFilters
        search={search}
        onSearchChange={setSearch}
        sort={sort}
        onSortChange={setSort}
        category={category}
        onCategoryChange={setCategory}
        featuredOnly={featuredOnly}
        onFeaturedOnlyChange={setFeaturedOnly}
      />

      {/* Communities Grid */}
      {isLoading ? (
        <CommunityCardSkeletonGrid count={12} />
      ) : error ? (
        <Card className="p-8 text-center">
          <p className="text-destructive">Failed to load communities. Please try again.</p>
        </Card>
      ) : communities.length === 0 ? (
        <Card className="p-12 text-center space-y-4">
          <p className="text-muted-foreground text-lg">No communities found</p>
          {search && (
            <p className="text-sm text-muted-foreground">
              Try adjusting your search or filters
            </p>
          )}
          {user && !search && (
            <Button asChild className="mt-4">
              <Link to="/community/create">
                <Plus className="h-4 w-4 mr-2" />
                Create the first community
              </Link>
            </Button>
          )}
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {communities.map((community) => (
              <CommunityCard key={community.id} community={community} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-2 px-4">
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
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
        </>
      )}
    </div>
  );
}
