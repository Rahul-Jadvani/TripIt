import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useChain, useChainProjects, useFollowChain, useUnfollowChain } from '@/hooks/useCommunities';
import { useBanChain, useSuspendChain, useUnbanChain, useDeleteChainAdmin, useToggleChainFeatured } from '@/hooks/useAdminCommunities';
import { CommunityHeader } from '@/components/CommunityHeader';
import { CommunityHeaderSkeleton } from '@/components/CommunityHeaderSkeleton';
import { ProjectCard } from '@/components/ItineraryCard';
import { AddItineraryToCommunityDialog } from '@/components/AddItineraryToCommunityDialog';
import { CommunityPostList } from '@/components/CommunityPostList';
import { CreatePostDialog } from '@/components/CreatePostDialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft, TrendingUp, Clock, ThumbsUp, Zap, Shield, Ban, Star, Trash2, BarChart3 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export default function ChainDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sort, setSort] = useState('trending');
  const [page, setPage] = useState(1);
  const [showAddProjectDialog, setShowAddProjectDialog] = useState(false);

  // Reset state when navigating to a different chain
  useEffect(() => {
    setPage(1);
    setSort('trending');
    setShowAddProjectDialog(false);
  }, [slug]);

  // Admin mutations
  const banChainMutation = useBanChain();
  const suspendChainMutation = useSuspendChain();
  const unbanChainMutation = useUnbanChain();
  const deleteChainMutation = useDeleteChainAdmin();
  const toggleFeaturedMutation = useToggleChainFeatured();

  const { data: chainData, isLoading: chainLoading, error: chainError } = useChain(slug || '');
  const {
    data: projectsData,
    isLoading: projectsLoading,
    error: projectsError,
  } = useChainProjects(slug || '', {
    sort,
    page,
    limit: 12,
  });

  const chain = chainData?.chain;
  const projects = projectsData?.projects || [];
  const totalPages = projectsData?.total_pages || 1;
  const followMutation = useFollowChain();
  const unfollowMutation = useUnfollowChain();

  // Admin handler functions
  const handleAdminAction = async (action: string) => {
    if (!chain || !slug) return;

    try {
      switch (action) {
        case 'ban':
          const banReason = prompt('Enter reason for banning (optional):');
          if (banReason !== null) {
            await banChainMutation.mutateAsync({ slug, reason: banReason || undefined });
          }
          break;
        case 'suspend':
          const suspendReason = prompt('Enter reason for suspending (optional):');
          if (suspendReason !== null) {
            await suspendChainMutation.mutateAsync({
              slug,
              reason: suspendReason || undefined,
              duration_days: 7,
            });
          }
          break;
        case 'unban':
          await unbanChainMutation.mutateAsync({ slug, reason: 'Unbanned by administrator' });
          break;
        case 'delete':
          const confirmDelete = confirm(
            `Are you sure you want to PERMANENTLY delete "${chain.name}"? This action cannot be undone.`
          );
          if (confirmDelete) {
            const deleteReason = prompt('Enter reason for deletion (optional):');
            if (deleteReason !== null) {
              await deleteChainMutation.mutateAsync({ slug, reason: deleteReason || undefined });
              navigate('/layerz');
            }
          }
          break;
        case 'toggleFeatured':
          await toggleFeaturedMutation.mutateAsync(slug);
          break;
      }
    } catch (error) {
      // Errors handled by mutation hooks
    }
  };

  const isAdmin = user?.isAdmin || user?.is_admin;
  const isOwner = user && chain && (chain.creator_id === user.id || chain.creator_id === user.userId);

  if (chainLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-8">
        <Button asChild variant="ghost" className="gap-2 w-fit">
          <Link to="/layerz">
            <ArrowLeft className="h-4 w-4" />
            Back to layerz
          </Link>
        </Button>

        <CommunityHeaderSkeleton />

        {/* Projects skeleton grid */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-24 rounded" />
            <Skeleton className="h-10 w-44 rounded" />
          </div>
          <CommunityCardSkeletonGrid count={12} />
        </div>
      </div>
    );
  }

  if (chainError || !chain) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <p className="text-destructive">Chain not found or failed to load</p>
          <Button asChild className="mt-4" variant="outline">
            <Link to="/layerz">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to layerz
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Back Button */}
      <Button asChild variant="ghost" size="sm">
        <Link to="/layerz">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to layerz
        </Link>
      </Button>

      {/* Chain Header */}
      <CommunityHeader chain={chain} />

      {/* Community actions like subreddit (Join + Create Post) */}
      <div className="flex items-center justify-between gap-3 px-1 -mt-4">
        <div className="flex items-center gap-2">
          {user && (
            <Button
              size="sm"
              variant={chain.is_following ? 'outline' : 'default'}
              onClick={() => {
                if (chain.is_following) {
                  unfollowMutation.mutate(chain.slug);
                } else {
                  followMutation.mutate(chain.slug);
                }
              }}
              disabled={followMutation.isPending || unfollowMutation.isPending}
            >
              {chain.is_following ? 'Joined' : 'Join'}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <CreatePostDialog chainSlug={slug || ''} chainName={chain.name} />
          )}
        </div>
      </div>

      {/* Admin Actions - Only visible to admins */}
      {isAdmin && (
        <Alert className="border-yellow-500/50 bg-yellow-500/10">
          <Shield className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <span className="text-sm font-medium">Admin Controls</span>
            <div className="flex flex-wrap gap-2">
              {chain.status === 'active' ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAdminAction('toggleFeatured')}
                    disabled={toggleFeaturedMutation.isPending}
                  >
                    <Star className="h-4 w-4 mr-2" />
                    {chain.is_featured ? 'Unfeature' : 'Feature'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAdminAction('suspend')}
                    disabled={suspendChainMutation.isPending}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Suspend
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleAdminAction('ban')}
                    disabled={banChainMutation.isPending}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Ban
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleAdminAction('unban')}
                  disabled={unbanChainMutation.isPending}
                >
                  {unbanChainMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4 mr-2" />
                  )}
                  Unban
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="text-red-500"
                onClick={() => handleAdminAction('delete')}
                disabled={deleteChainMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to="/admin/chains">
                  <Shield className="h-4 w-4 mr-2" />
                  Admin Panel
                </Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Owner Analytics - Only visible to chain owner (admins see this + admin controls) */}
      {isOwner && (
        <Alert className="border-blue-500/50 bg-blue-500/10">
          <BarChart3 className="h-4 w-4 text-blue-500" />
          <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <span className="text-sm font-medium">Chain Owner Tools</span>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="default" asChild>
                <Link to={`/layerz/${slug}/analytics`}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Analytics
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to={`/layerz/${slug}/requests`}>
                  Manage Requests ({chain.pending_requests || 0})
                </Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      {/* Subreddit-style layout: main content + sticky sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
      <Tabs defaultValue="projects" className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <TabsList>
            <TabsTrigger value="projects">
              Projects ({chain.project_count})
            </TabsTrigger>
            <TabsTrigger value="forum">
              Forum
            </TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          {/* Sort Dropdown - Only show on projects tab */}
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="trending">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Trending
                </div>
              </SelectItem>
              <SelectItem value="newest">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Newest
                </div>
              </SelectItem>
              <SelectItem value="most_upvoted">
                <div className="flex items-center gap-2">
                  <ThumbsUp className="h-4 w-4" />
                  Most Upvoted
                </div>
              </SelectItem>
              <SelectItem value="pinned">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Pinned First
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-6">
          {projectsLoading ? (
            <CommunityCardSkeletonGrid count={12} />
          ) : projectsError ? (
            <Card className="p-8 text-center">
              <p className="text-destructive">Failed to load projects</p>
            </Card>
          ) : projects.length === 0 ? (
            <Card className="p-12 text-center space-y-4">
              <p className="text-muted-foreground text-lg">No projects yet</p>
              <p className="text-sm text-muted-foreground">
                Be the first to add a project to this chain!
              </p>
              {user && (
                <Button onClick={() => setShowAddProjectDialog(true)} className="mt-4">
                  Add Project
                </Button>
              )}
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                  <ItineraryCard key={project.id} itinerary={project} />
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
        </TabsContent>

        {/* Forum Tab */}
        <TabsContent value="forum" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Discussions</h2>
              <p className="text-muted-foreground">
                Join the conversation and connect with other members
              </p>
            </div>
            {user && <CreatePostDialog chainSlug={slug || ''} chainName={chain.name} />}
          </div>
          <CommunityPostList chainSlug={slug || ''} isOwner={isOwner} />
        </TabsContent>

        {/* About Tab */}
        <TabsContent value="about" className="space-y-6">
          <Card className="p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground">{chain.description}</p>
            </div>

            {chain.rules && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Rules & Guidelines</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{chain.rules}</p>
              </div>
            )}

            {chain.categories && chain.categories.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {chain.categories.map((category) => (
                    <span
                      key={category}
                      className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-lg font-semibold mb-2">Settings</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Visibility:</span>
                  <span>{chain.is_public ? 'Public' : 'Private'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Approval:</span>
                  <span>
                    {chain.requires_approval
                      ? 'Projects require approval'
                      : 'Projects added instantly'}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
        </div>

        {/* Sticky sidebar with About/Rules/Links */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            <Card className="p-5 space-y-3">
              <div>
                <h3 className="text-lg font-bold">About {chain.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {chain.description}
                </p>
              </div>

              {chain.categories && chain.categories.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">Categories</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {chain.categories.slice(0, 6).map((category) => (
                      <span key={category} className="px-2 py-0.5 rounded-full text-xs bg-secondary">
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 pt-2 border-t">
                <div className="text-center">
                  <div className="text-xl font-black text-primary">{chain.project_count}</div>
                  <div className="text-xs text-muted-foreground">projects</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-black text-primary">{chain.follower_count}</div>
                  <div className="text-xs text-muted-foreground">followers</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-black text-primary">{chain.view_count}</div>
                  <div className="text-xs text-muted-foreground">views</div>
                </div>
              </div>

              {chain.social_links && Object.keys(chain.social_links).length > 0 && (
                <div className="pt-2 border-t">
                  <h4 className="text-sm font-semibold mb-2">Links</h4>
                  <div className="flex flex-wrap gap-2">
                    {chain.social_links.website && (
                      <a className="btn-secondary text-xs px-3 py-1 rounded-full" target="_blank" rel="noopener noreferrer" href={chain.social_links.website}>Website</a>
                    )}
                    {chain.social_links.twitter && (
                      <a className="btn-secondary text-xs px-3 py-1 rounded-full" target="_blank" rel="noopener noreferrer" href={chain.social_links.twitter}>Twitter</a>
                    )}
                    {chain.social_links.discord && (
                      <a className="btn-secondary text-xs px-3 py-1 rounded-full" target="_blank" rel="noopener noreferrer" href={chain.social_links.discord}>Discord</a>
                    )}
                  </div>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Created by{' '}
                {chain.creator ? (
                  <span className="text-foreground font-medium">@{chain.creator.username}</span>
                ) : (
                  'community'
                )}
              </div>
            </Card>

            {/* Rules */}
            {chain.rules && (
              <Card className="p-5">
                <h3 className="text-lg font-bold mb-2">Rules</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{chain.rules}</p>
              </Card>
            )}

            {/* Moderators - only if backend provides */}
            {Array.isArray((chain as any).moderators) && (chain as any).moderators.length > 0 && (
              <Card className="p-5">
                <h3 className="text-lg font-bold mb-2">Moderators</h3>
                <div className="flex flex-wrap gap-2 text-sm">
                  {((chain as any).moderators as Array<{ username: string }>).map((mod, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full bg-secondary">@{mod.username}</span>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </aside>
      </div>

      {/* Add Project Dialog */}
      {user && (
        <AddItineraryToCommunityDialog
          open={showAddProjectDialog}
          onOpenChange={setShowAddProjectDialog}
          chainSlug={slug || ''}
          chainName={chain.name}
          requiresApproval={chain.requires_approval}
        />
      )}
    </div>
  );
}
