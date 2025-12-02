import { useState, useEffect } from 'react';
import { CommunityPostCard } from './CommunityPostCard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Loader2, TrendingUp, Clock, ArrowBigUp, Zap } from 'lucide-react';
import { useCommunityPosts } from '@/hooks/useCommunityPosts';

interface CommunityPostListProps {
  communitySlug: string;
  isOwner?: boolean;
}

export function CommunityPostList({ communitySlug, isOwner = false }: CommunityPostListProps) {
  const [sort, setSort] = useState<'hot' | 'new' | 'top' | 'active'>('hot');
  const [page, setPage] = useState(1);

  // Reset state when communitySlug changes (navigating to different community)
  useEffect(() => {
    setPage(1);
    setSort('hot');
  }, [communitySlug]);

  const { data, isLoading, error } = useCommunityPosts(communitySlug, {
    sort,
    page,
    per_page: 20,
  });

  if (error) {
    return (
      <Card className="p-8 text-center">
        <p className="text-destructive">Failed to load posts</p>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const posts = data?.posts || [];
  const totalPages = data?.total_pages || 1;

  return (
    <div className="space-y-4">
      {/* Sort Options */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {data?.total || 0} {data?.total === 1 ? 'Discussion' : 'Discussions'}
        </h3>
        <Select value={sort} onValueChange={(value: any) => setSort(value)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hot">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Hot
              </div>
            </SelectItem>
            <SelectItem value="new">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                New
              </div>
            </SelectItem>
            <SelectItem value="top">
              <div className="flex items-center gap-2">
                <ArrowBigUp className="h-4 w-4" />
                Top
              </div>
            </SelectItem>
            <SelectItem value="active">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Active
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Posts List */}
      {posts.length === 0 ? (
        <Card className="p-12 text-center space-y-2">
          <p className="text-muted-foreground text-lg">No discussions yet</p>
          <p className="text-sm text-muted-foreground">Be the first to start a discussion in this community!</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <CommunityPostCard key={post.id} post={post} communitySlug={communitySlug} isOwner={isOwner} />
          ))}
        </div>
      )}

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
    </div>
  );
}
