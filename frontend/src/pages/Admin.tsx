import { useState, useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Shield, Users, Award, FolderOpen, TrendingUp, CheckCircle, XCircle, Loader2, Ban, Trash2, Upload, Copy, ExternalLink, List, Edit2, Settings, MessageSquare, Layers, Star, Clock, Eye, Calendar, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { toast } from 'sonner';
import { adminService } from '@/services/api';
import { adminApi } from '@/services/adminApi';
import { formatScore, getProjectScore } from '@/utils/score';
import {
  useAdminStats,
  useAdminUsers,
  useAdminValidators,
  useAdminProjects,
  useAdminProjectsInfinite,
  useAdminBadgesInfinite,
  useAdminInvestorRequests,
  useToggleUserAdmin,
  useToggleUserActive,
  useAddValidator,
  useRemoveValidator,
  useUpdateValidatorPermissions,
  useToggleProjectFeatured,
  useDeleteProject,
  useAwardCustomBadge,
  useApproveInvestorRequest,
  useRejectInvestorRequest,
} from '@/hooks/useAdmin';
import {
  useAdminChains,
  useBanChain,
  useSuspendChain,
  useUnbanChain,
  useDeleteChainAdmin,
  useToggleChainFeatured,
} from '@/hooks/useAdminChains';
import CoffeeLoader from '@/components/CoffeeLoader';
import { AdminScoringConfig } from '@/components/AdminScoringConfig';
import { AdminUserManagement } from '@/components/AdminUserManagement';
import { AdminOTPLogin } from '@/components/AdminOTPLogin';

const getBackendUrl = (): string => {
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
  const isDev = currentHost.includes('localhost') || currentHost.includes('127.0.0.1');
  return isDev ? 'http://localhost:5000' : 'https://backend.zer0.pro';
};

interface User {
  id: string;
  username: string;
  email: string;
  display_name?: string;
  is_admin: boolean;
  is_investor: boolean;
  is_validator: boolean;
  is_active: boolean;
  karma: number;
  created_at: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  creator?: { username: string };
  proof_score: number;
  is_featured: boolean;
  created_at: string;
}

interface InvestorRequest {
  id: string;
  user_id: string;
  // Basic Info
  plan_type: string;
  investor_type: string;
  name?: string;
  company_name?: string;
  position_title?: string;
  linkedin_url?: string;
  website_url?: string;
  location?: string;
  years_experience?: string;
  // Investment Focus
  investment_stages?: string[];
  industries?: string[];
  ticket_size_min?: number;
  ticket_size_max?: number;
  geographic_focus?: string[];
  // About
  reason?: string;
  bio?: string;
  investment_thesis?: string;
  // Track Record
  num_investments?: string;
  notable_investments?: Array<{ company: string; stage: string; year: string }>;
  portfolio_highlights?: string;
  // Value Add
  value_adds?: string[];
  expertise_areas?: string;
  // Visibility
  is_public?: boolean;
  open_to_requests?: boolean;
  // Contact
  twitter_url?: string;
  calendar_link?: string;
  // Organization
  fund_size?: string;
  // Admin
  status: string;
  admin_notes?: string;
  created_at: string;
  user?: { username: string; email: string };
}

interface ValidatorWithPermissions {
  id: string;
  username: string;
  email: string;
  is_validator: boolean;
  permissions?: {
    can_validate_all: boolean;
    allowed_badge_types: string[];
    allowed_project_ids: string[];
    allowed_categories: string[];
  };
  assignments?: {
    total: number;
    pending: number;
    in_review: number;
    completed: number;
    category_breakdown?: Record<string, number>;
  };
}

interface Stats {
  users: { total: number; active: number; admins: number; validators: number; investors: number };
  projects: { total: number; featured: number };
  badges: { total: number; breakdown: Record<string, number> };
  investor_requests: { pending: number; approved: number };
}

interface BadgeItem {
  id: string;
  badge_type: string;
  custom_name?: string;
  points: number;
  rationale: string;
  created_at: string;
  project?: {
    id: string;
    title: string;
  };
  validator?: {
    id: string;
    username: string;
  };
}

interface BadgeManagementListProps {
  observerTarget: React.RefObject<HTMLDivElement>;
}

function BadgeManagementList({ observerTarget }: BadgeManagementListProps) {
  const [filterBadgeType, setFilterBadgeType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingBadge, setEditingBadge] = useState<BadgeItem | null>(null);
  const [editBadgeType, setEditBadgeType] = useState('');
  const [editRationale, setEditRationale] = useState('');

  // Use infinite scroll for badges
  const {
    items: allBadges,
    isLoading: loading,
    hasNextPage,
    fetchNextPage,
  } = useAdminBadgesInfinite({ filterBadgeType: filterBadgeType !== 'all' ? filterBadgeType : undefined });

  // Refetch when needed (after editing/deleting)
  const refetchBadges = () => {
    fetchNextPage();
  };

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!observerTarget.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !loading) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasNextPage, loading, fetchNextPage]);

  // Client-side filtering
  const filteredBadges = useMemo(() => {
    return allBadges.filter(badge => {
      // Filter by badge type
      if (filterBadgeType !== 'all' && badge.badge_type !== filterBadgeType) {
        return false;
      }

      // Filter by search query (project name or author name)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const projectTitle = badge.project?.title?.toLowerCase() || '';
        const authorName = badge.validator?.username?.toLowerCase() || '';

        if (!projectTitle.includes(query) && !authorName.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [allBadges, filterBadgeType, searchQuery]);

  const handleEditBadge = (badge: BadgeItem) => {
    setEditingBadge(badge);
    setEditBadgeType(badge.badge_type);
    setEditRationale(badge.rationale);
  };

  const handleUpdateBadge = async () => {
    if (!editingBadge) return;

    try {
      await adminService.updateBadge(editingBadge.id, {
        badge_type: editBadgeType,
        rationale: editRationale,
      });
      toast.success('Badge updated successfully');
      setEditingBadge(null);
      refetchBadges();
    } catch (error) {
      console.error('Failed to update badge:', error);
      toast.error('Failed to update badge');
    }
  };

  const handleDeleteBadge = async (badgeId: string) => {
    if (!confirm('Are you sure you want to delete this badge? If this is the last badge, the project will be reset to pending validation status.')) return;

    try {
      const response = await adminService.deleteBadge(badgeId);
      toast.success(response.data.message || 'Badge deleted successfully');
      refetchBadges();
    } catch (error: any) {
      console.error('Failed to delete badge:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete badge';
      toast.error(errorMessage);
    }
  };

  const getBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      stone: 'bg-gray-500',
      silver: 'bg-gray-400',
      gold: 'bg-yellow-500',
      platinum: 'bg-purple-500',
      demerit: 'bg-red-500',
      custom: 'bg-blue-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Filter by Badge Type</Label>
              <Select value={filterBadgeType} onValueChange={setFilterBadgeType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="stone">Stone</SelectItem>
                  <SelectItem value="silver">Silver</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="platinum">Platinum</SelectItem>
                  <SelectItem value="demerit">Demerit</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>Search by Project or Author</Label>
              <Input
                placeholder="Search by project title or author name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            Showing {filteredBadges.length} of {allBadges.length} badges
          </div>
        </CardContent>
      </Card>

      {/* Badges List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : filteredBadges.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {allBadges.length === 0 ? 'No badges found' : 'No badges match your filters'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredBadges.map((badge) => (
            <Card key={badge.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getBadgeColor(badge.badge_type)}>
                        {badge.custom_name || badge.badge_type.toUpperCase()}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {badge.points} points
                      </span>
                    </div>
                    {badge.project && (
                      <p className="text-sm font-medium">
                        Project: {badge.project.title}
                      </p>
                    )}
                    {badge.validator && (
                      <p className="text-sm text-muted-foreground">
                        Awarded by: {badge.validator.username}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      Rationale: {badge.rationale || 'No rationale provided'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ID: {badge.id} • Created: {new Date(badge.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditBadge(badge)}
                        >
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Badge</DialogTitle>
                          <DialogDescription>
                            Update badge type or rationale
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Badge Type</Label>
                            <Select value={editBadgeType} onValueChange={setEditBadgeType}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="stone">Stone (5 pts)</SelectItem>
                                <SelectItem value="silver">Silver (10 pts)</SelectItem>
                                <SelectItem value="gold">Gold (15 pts)</SelectItem>
                                <SelectItem value="platinum">Platinum (20 pts)</SelectItem>
                                <SelectItem value="demerit">Demerit (-10 pts)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Rationale</Label>
                            <Textarea
                              value={editRationale}
                              onChange={(e) => setEditRationale(e.target.value)}
                              placeholder="Reason for this badge..."
                            />
                          </div>
                          <Button onClick={handleUpdateBadge} className="w-full">
                            Update Badge
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteBadge(badge.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Infinite scroll observer target */}
          <div ref={observerTarget} className="py-4 text-center">
            {hasNextPage ? (
              <p className="text-sm text-muted-foreground">Scroll to load more badges...</p>
            ) : allBadges.length > 0 ? (
              <p className="text-sm text-muted-foreground">No more badges</p>
            ) : null}
          </div>
        </div>
      )}

      {/* Edit Badge Dialog - Controlled outside map */}
      {editingBadge && (
        <Dialog open={!!editingBadge} onOpenChange={() => setEditingBadge(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Badge</DialogTitle>
              <DialogDescription>
                Update badge type or rationale for project: {editingBadge.project?.title}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Badge Type</Label>
                <Select value={editBadgeType} onValueChange={setEditBadgeType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stone">Stone (5 pts)</SelectItem>
                    <SelectItem value="silver">Silver (10 pts)</SelectItem>
                    <SelectItem value="gold">Gold (15 pts)</SelectItem>
                    <SelectItem value="platinum">Platinum (20 pts)</SelectItem>
                    <SelectItem value="demerit">Demerit (-10 pts)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Rationale</Label>
                <Textarea
                  value={editRationale}
                  onChange={(e) => setEditRationale(e.target.value)}
                  placeholder="Reason for this badge..."
                />
              </div>
              <Button onClick={handleUpdateBadge} className="w-full">
                Update Badge
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

interface FeedbackItem {
  id: string;
  feedback_type: string;
  message: string;
  contact_email?: string;
  reported_project_id?: string;
  reported_user_id?: string;
  report_reason?: string;
  status: string;
  admin_notes?: string;
  created_at: string;
  user_id?: string;
  submitter?: {
    id: string;
    username: string;
    email: string;
  };
}

function ChainsModerationSection() {
  const [chainSearch, setChainSearch] = useState('');
  const [chainStatusFilter, setChainStatusFilter] = useState<'all' | 'active' | 'banned' | 'suspended'>('all');
  const [chainPage, setChainPage] = useState(1);
  const [selectedChain, setSelectedChain] = useState<any>(null);
  const [banReason, setBanReason] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendDuration, setSuspendDuration] = useState(7);
  const [deleteReason, setDeleteReason] = useState('');

  const { data: chainsData, isLoading: chainsLoading } = useAdminChains({
    page: chainPage,
    per_page: 20,
    search: chainSearch,
    status: chainStatusFilter === 'all' ? '' : chainStatusFilter,
  });

  const banChainMutation = useBanChain();
  const suspendChainMutation = useSuspendChain();
  const unbanChainMutation = useUnbanChain();
  const deleteChainMutation = useDeleteChainAdmin();
  const toggleFeaturedMutation = useToggleChainFeatured();

  const chains = chainsData?.data?.chains || [];
  const totalChains = chainsData?.data?.total || 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'banned':
        return <Badge variant="destructive">Banned</Badge>;
      case 'suspended':
        return <Badge className="bg-orange-500">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Input
            placeholder="Search layerz..."
            value={chainSearch}
            onChange={(e) => setChainSearch(e.target.value)}
          />
        </div>
        <Select value={chainStatusFilter} onValueChange={(value: any) => setChainStatusFilter(value)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Chains List */}
      {chainsLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, idx) => (
            <Card key={idx} className="animate-pulse">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-40 bg-secondary rounded"></div>
                    <div className="h-4 w-48 bg-secondary rounded"></div>
                    <div className="flex gap-3 mt-2">
                      <div className="h-6 w-16 bg-secondary rounded-full"></div>
                      <div className="h-6 w-24 bg-secondary rounded-full"></div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-9 w-20 bg-secondary rounded"></div>
                    <div className="h-9 w-20 bg-secondary rounded"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : chains.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No layerz found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {chains.map((chain: any) => (
            <Card key={chain.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Link
                        to={`/layerz/${chain.slug}`}
                        className="text-lg font-bold hover:text-primary transition-colors flex items-center gap-1"
                      >
                        {chain.name}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                      {getStatusBadge(chain.status)}
                      {chain.is_featured && (
                        <Badge className="bg-yellow-500/20 text-yellow-500">
                          <Star className="h-3 w-3 mr-1" />
                          Featured
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {chain.description}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FolderOpen className="h-3 w-3" />
                        {chain.project_count} projects
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {chain.follower_count} followers
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {chain.view_count} views
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(chain.created_at)}
                      </span>
                    </div>

                    {chain.ban_reason && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded p-2">
                        <p className="text-xs text-red-500">Reason: {chain.ban_reason}</p>
                        {chain.suspended_until && (
                          <p className="text-xs text-red-400">
                            Until: {formatDate(chain.suspended_until)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    {chain.status === 'active' ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            await toggleFeaturedMutation.mutateAsync(chain.slug);
                          }}
                          disabled={toggleFeaturedMutation.isPending}
                        >
                          <Star className="h-3 w-3 mr-1" />
                          {chain.is_featured ? 'Unfeature' : 'Feature'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            const reason = prompt('Suspend reason (optional):');
                            if (reason !== null) {
                              await suspendChainMutation.mutateAsync({
                                slug: chain.slug,
                                reason: reason || undefined,
                                duration_days: 7,
                              });
                            }
                          }}
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          Suspend
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={async () => {
                            const reason = prompt('Ban reason (optional):');
                            if (reason !== null) {
                              await banChainMutation.mutateAsync({
                                slug: chain.slug,
                                reason: reason || undefined,
                              });
                            }
                          }}
                        >
                          <Ban className="h-3 w-3 mr-1" />
                          Ban
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={async () => {
                          await unbanChainMutation.mutateAsync({
                            slug: chain.slug,
                            reason: 'Unbanned by admin',
                          });
                        }}
                        disabled={unbanChainMutation.isPending}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Unban
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-500"
                      onClick={async () => {
                        if (confirm(`Delete "${chain.name}" permanently?`)) {
                          const reason = prompt('Delete reason (optional):');
                          if (reason !== null) {
                            await deleteChainMutation.mutateAsync({
                              slug: chain.slug,
                              reason: reason || undefined,
                            });
                          }
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Total layerz: {totalChains}</CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}

function FeedbackManagement() {
  const { toast } = useToast();
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (typeFilter !== 'all') params.type = typeFilter;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await adminService.getAllFeedback(params);
      setFeedback(response.data.data || []);
    } catch (error: any) {
      console.error('Error fetching feedback:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load feedback',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, [typeFilter, statusFilter]);

  const handleUpdateStatus = async (feedbackId: string, newStatus: string) => {
    try {
      setUpdatingStatus(feedbackId);
      await adminService.updateFeedbackStatus(feedbackId, {
        status: newStatus,
        admin_notes: adminNotes[feedbackId] || undefined,
      });

      toast({
        title: 'Success',
        description: 'Status updated successfully',
      });

      fetchFeedback();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update status',
        variant: 'destructive',
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleDelete = async (feedbackId: string) => {
    if (!confirm('Are you sure you want to delete this feedback?')) return;

    try {
      await adminService.deleteFeedback(feedbackId);
      toast({
        title: 'Success',
        description: 'Feedback deleted successfully',
      });
      fetchFeedback();
    } catch (error: any) {
      console.error('Error deleting feedback:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete feedback',
        variant: 'destructive',
      });
    }
  };

  const getTypeBadge = (type: string) => {
    const variants: Record<string, any> = {
      suggestion: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50', icon: '💡' },
      improvement: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/50', icon: '🔧' },
      contact: { color: 'bg-green-500/20 text-green-400 border-green-500/50', icon: '💬' },
      report: { color: 'bg-red-500/20 text-red-400 border-red-500/50', icon: '🚩' },
    };
    const variant = variants[type] || variants.contact;
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium border ${variant.color}`}>
        {variant.icon} {type}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
      reviewed: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
      resolved: 'bg-green-500/20 text-green-400 border-green-500/50',
      dismissed: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium border ${variants[status] || variants.pending}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, idx) => (
          <Card key={idx} className="animate-pulse">
            <CardContent className="py-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="h-5 w-32 bg-secondary rounded"></div>
                  <div className="h-5 w-20 bg-secondary rounded"></div>
                </div>
                <div className="h-4 w-full bg-secondary rounded"></div>
                <div className="h-4 w-5/6 bg-secondary rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="suggestion">Suggestions</SelectItem>
            <SelectItem value="improvement">Improvements</SelectItem>
            <SelectItem value="contact">Contact</SelectItem>
            <SelectItem value="report">Reports</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Feedback List */}
      {feedback.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No feedback found</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {feedback.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {getTypeBadge(item.feedback_type)}
                      {getStatusBadge(item.status)}
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                    </div>
                    {item.submitter && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-yellow-400">
                          Submitted by: @{item.submitter.username}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({item.submitter.email})
                        </span>
                      </div>
                    )}
                    {item.contact_email && (
                      <p className="text-sm text-muted-foreground">
                        Contact: {item.contact_email}
                      </p>
                    )}
                    {item.report_reason && (
                      <p className="text-sm text-muted-foreground">
                        Reason: {item.report_reason}
                      </p>
                    )}
                    {item.reported_project_id && (
                      <p className="text-sm text-muted-foreground">
                        Project ID: {item.reported_project_id}
                      </p>
                    )}
                    {item.reported_user_id && (
                      <p className="text-sm text-muted-foreground">
                        User ID: {item.reported_user_id}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Message</Label>
                  <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                    {item.message}
                  </p>
                </div>

                {item.admin_notes && (
                  <div>
                    <Label className="text-sm font-medium">Admin Notes</Label>
                    <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                      {item.admin_notes}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Textarea
                    placeholder="Add admin notes..."
                    value={adminNotes[item.id] || ''}
                    onChange={(e) => setAdminNotes({ ...adminNotes, [item.id]: e.target.value })}
                    className="flex-1"
                    rows={2}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateStatus(item.id, 'reviewed')}
                    disabled={updatingStatus === item.id}
                  >
                    Mark Reviewed
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateStatus(item.id, 'resolved')}
                    disabled={updatingStatus === item.id}
                  >
                    Mark Resolved
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateStatus(item.id, 'dismissed')}
                    disabled={updatingStatus === item.id}
                  >
                    Dismiss
                  </Button>
                  {updatingStatus === item.id && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  const { toast: showToast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('analytics');
  const [validatorTab, setValidatorTab] = useState('current');
  const [investorTab, setInvestorTab] = useState('current');

  // OTP Authentication state
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check admin authentication on mount
  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        const response = await adminApi.checkAuth();
        if (response.data.status === 'success' && response.data.authenticated) {
          setIsAdminAuthenticated(true);
        }
      } catch (error) {
        // Not authenticated
        setIsAdminAuthenticated(false);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAdminAuth();
  }, []);

  // Search/filter state
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [projectSearch, setProjectSearch] = useState('');

  // Validator state
  const [newValidatorEmail, setNewValidatorEmail] = useState('');
  const [selectedValidatorId, setSelectedValidatorId] = useState<string>('');
  const [validatorPermissions, setValidatorPermissions] = useState({
    can_validate_all: false,
    allowed_badge_types: ['stone', 'silver', 'gold', 'platinum', 'demerit'],
    allowed_categories: [] as string[],
  });
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [currentValidatorForAssignment, setCurrentValidatorForAssignment] = useState<string>('');
  const [bulkAssigningValidatorId, setBulkAssigningValidatorId] = useState<string | null>(null);
  const [assigningSelectedValidatorId, setAssigningSelectedValidatorId] = useState<string | null>(null);

  // Add validator by search state
  const [validatorSearchQuery, setValidatorSearchQuery] = useState('');
  const [validatorSearchResults, setValidatorSearchResults] = useState<any[]>([]);
  const [isSearchingValidators, setIsSearchingValidators] = useState(false);
  const [selectedValidatorForAdd, setSelectedValidatorForAdd] = useState<any>(null);

  // Badge state
  const [customBadgeName, setCustomBadgeName] = useState('');
  const [customBadgeImage, setCustomBadgeImage] = useState('');
  const [customBadgePoints, setCustomBadgePoints] = useState(10);
  const [customBadgeProjectId, setCustomBadgeProjectId] = useState('');
  const [customBadgeRationale, setCustomBadgeRationale] = useState('');

  // Investor management loading states
  const [removingInvestor, setRemovingInvestor] = useState<string | null>(null);
  const [updatingPermissions, setUpdatingPermissions] = useState<string | null>(null);

  // Refs for infinite scroll observer targets
  const projectsObserverTarget = useRef<HTMLDivElement>(null);
  const badgesObserverTarget = useRef<HTMLDivElement>(null);

  // OPTIMIZED: Load all data on mount with React Query (cached automatically)
  const { data: stats } = useAdminStats();
  const { data: usersData, isLoading: usersLoading } = useAdminUsers({ search: userSearch, role: userFilter, perPage: 100 });
  const { data: validatorsData, isLoading: validatorsLoading } = useAdminValidators();

  // Use infinite scroll for projects instead of paginated load
  const {
    items: allProjects,
    isLoading: projectsLoading,
    hasNextPage: projectsHasNextPage,
    fetchNextPage: fetchNextProjectsPage,
  } = useAdminProjectsInfinite({ search: projectSearch });

  const { data: investorRequestsData, isLoading: investorsLoading, refetch: refetchInvestorRequests } = useAdminInvestorRequests();

  const users = usersData?.users || [];
  const validators = validatorsData || [];
  const projects = allProjects; // From infinite scroll hook
  const investorRequests = investorRequestsData || [];

  // Mutations
  const toggleUserAdminMutation = useToggleUserAdmin();
  const toggleUserActiveMutation = useToggleUserActive();
  const addValidatorMutation = useAddValidator();
  const removeValidatorMutation = useRemoveValidator();
  const updateValidatorPermissionsMutation = useUpdateValidatorPermissions();
  const toggleProjectFeaturedMutation = useToggleProjectFeatured();
  const deleteProjectMutation = useDeleteProject();
  const awardCustomBadgeMutation = useAwardCustomBadge();
  const approveInvestorMutation = useApproveInvestorRequest();
  const rejectInvestorMutation = useRejectInvestorRequest();

  // Intersection Observer for infinite scroll - Projects
  useEffect(() => {
    if (!projectsObserverTarget.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && projectsHasNextPage && !projectsLoading) {
          fetchNextProjectsPage();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(projectsObserverTarget.current);
    return () => observer.disconnect();
  }, [projectsHasNextPage, projectsLoading, fetchNextProjectsPage]);


  // ==================== Action Handlers ====================

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast({ title: 'Copied!', description: `${label} copied to clipboard` });
  };

  const handleAddValidator = () => {
    if (!newValidatorEmail.trim()) {
      showToast({ title: 'Error', description: 'Email is required', variant: 'destructive' });
      return;
    }
    addValidatorMutation.mutate(newValidatorEmail, {
      onSuccess: () => setNewValidatorEmail(''),
    });
  };

  const handleSearchValidators = async (query: string) => {
    setValidatorSearchQuery(query);
    if (query.trim().length < 2) {
      setValidatorSearchResults([]);
      return;
    }

    setIsSearchingValidators(true);
    try {
      const response = await adminService.getUsers({ search: query, perPage: 10 });
      const payload = response.data?.data;
      const users = Array.isArray(payload) ? payload : payload?.users || [];
      // Filter out existing validators
      const nonValidators = users.filter((user: any) => !user.is_validator);
      setValidatorSearchResults(nonValidators);
    } catch (error) {
      console.error('Error searching validators:', error);
      setValidatorSearchResults([]);
    } finally {
      setIsSearchingValidators(false);
    }
  };

  const handleSelectValidatorForAdd = (user: any) => {
    setSelectedValidatorForAdd(user);
    addValidatorMutation.mutate(user.email, {
      onSuccess: () => {
        setSelectedValidatorForAdd(null);
        setValidatorSearchQuery('');
        setValidatorSearchResults([]);
      },
    });
  };

  const handleUpdateValidatorPermissions = () => {
    if (!selectedValidatorId) return;
    updateValidatorPermissionsMutation.mutate(
      { validatorId: selectedValidatorId, permissions: validatorPermissions },
      { onSuccess: () => setSelectedValidatorId('') }
    );
  };

  const handleAwardCustomBadge = () => {
    if (!customBadgeProjectId || !customBadgeName || !customBadgeRationale) {
      showToast({ title: 'Error', description: 'All fields required', variant: 'destructive' });
      return;
    }
    awardCustomBadgeMutation.mutate({
      project_id: customBadgeProjectId,
      badge_type: 'custom',
      custom_name: customBadgeName,
      custom_image: customBadgeImage,
      points: customBadgePoints,
      rationale: customBadgeRationale,
    }, {
      onSuccess: () => {
        setCustomBadgeName('');
        setCustomBadgeImage('');
        setCustomBadgeProjectId('');
        setCustomBadgeRationale('');
      }
    });
  };

  const handleDeleteProject = (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    deleteProjectMutation.mutate(projectId);
  };

  const handleBulkAssignProjects = async (validatorId: string) => {
    const category = (document.getElementById(`category-${validatorId}`) as HTMLSelectElement | null)?.value || 'all';
    const limitValue = (document.getElementById(`limit-${validatorId}`) as HTMLInputElement | null)?.value || '50';
    const parsedLimit = parseInt(limitValue, 10);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 50;
    const priority = (document.getElementById(`priority-${validatorId}`) as HTMLSelectElement | null)?.value || 'normal';

    setBulkAssigningValidatorId(validatorId);
    try {
      const response = await adminService.bulkAssignProjects({
        validator_id: validatorId,
        category_filter: category,
        priority,
        limit,
      });
      const assignedCount = response?.data?.data?.count ?? 0;
      toast.success(`${assignedCount} project${assignedCount === 1 ? '' : 's'} assigned successfully!`);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'validators'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'projects'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'projects', 'infinite'] }),
      ]);
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to assign projects';
      toast.error(message);
    } finally {
      setBulkAssigningValidatorId(null);
    }
  };

  const handleAssignSelectedProjects = async () => {
    if (!currentValidatorForAssignment || selectedProjects.length === 0) {
      toast.error('Select projects and validator');
      return;
    }

    setAssigningSelectedValidatorId(currentValidatorForAssignment);

    try {
      const results = await Promise.allSettled(
        selectedProjects.map(projectId =>
          adminService.assignProjectToValidator({
            validator_id: currentValidatorForAssignment,
            project_id: projectId,
            priority: 'normal'
          })
        )
      );

      const successes = results.filter(r => r.status === 'fulfilled').length;
      const errors = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map(r => (r.reason?.response?.data?.message || r.reason?.message || 'Failed'));

      if (successes > 0) {
        toast.success(`${successes} project${successes === 1 ? '' : 's'} assigned successfully`);
      }
      if (errors.length > 0) {
        const uniqueErrors = Array.from(new Set(errors));
        toast.error(uniqueErrors.join('; '));
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'validators'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'projects'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'projects', 'infinite'] }),
      ]);
      setSelectedProjects([]);
      setCurrentValidatorForAssignment('');
    } catch (error: any) {
      // toast.promise already surfaced the error; keep a fallback log
      console.error('Assign projects failed', error);
    } finally {
      setAssigningSelectedValidatorId(null);
    }
  };

  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjects(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const toggleSelectAllProjects = () => {
    if (selectedProjects.length === projects.length) {
      setSelectedProjects([]);
    } else {
      setSelectedProjects(projects.map(p => p.id));
    }
  };

  // ==================== Render ====================

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return <CoffeeLoader overlay captionCategory="admin" />;
  }

  // Show OTP login if not authenticated
  if (!isAdminAuthenticated) {
    return <AdminOTPLogin onSuccess={() => setIsAdminAuthenticated(true)} />;
  }

  // Show loading animation on first load
  if ((usersLoading || validatorsLoading || projectsLoading) && users.length === 0 && validators.length === 0 && projects.length === 0) {
    return <CoffeeLoader overlay captionCategory="admin" />;
  }

  const handleAdminLogout = async () => {
    try {
      await adminApi.logout();
      setIsAdminAuthenticated(false);
      showToast({
        title: 'Logged Out',
        description: 'Admin session ended',
      });
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      setIsAdminAuthenticated(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            </div>
            <p className="text-muted-foreground">Manage users, validators, projects, and platform settings</p>
          </div>
          <Button variant="outline" onClick={handleAdminLogout}>
            Logout
          </Button>
        </div>
      </div>

      <Card className="mb-6 border-dashed border-primary/40 bg-secondary/10">
        <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-primary" />
              Need to rescore projects?
            </h3>
            <p className="text-sm text-muted-foreground">
              Open the dedicated rescore console to queue a single project or bulk batch with filters.
            </p>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link to="/admin/rescore">
              <RefreshCw className="h-4 w-4 mr-2" />
              Project Rescore Console
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="analytics">
            <TrendingUp className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="validators">
            <Shield className="h-4 w-4 mr-2" />
            Validators
          </TabsTrigger>
          <TabsTrigger value="projects">
            <FolderOpen className="h-4 w-4 mr-2" />
            Projects
          </TabsTrigger>
          <TabsTrigger value="chains">
            <Layers className="h-4 w-4 mr-2" />
            layerz
          </TabsTrigger>
          <TabsTrigger value="badges">
            <Award className="h-4 w-4 mr-2" />
            Badges
          </TabsTrigger>
          <TabsTrigger value="investors">
            <Users className="h-4 w-4 mr-2" />
            Investors
          </TabsTrigger>
          <TabsTrigger value="feedback">
            <MessageSquare className="h-4 w-4 mr-2" />
            Feedback
          </TabsTrigger>
          <TabsTrigger value="admins">
            <Shield className="h-4 w-4 mr-2 text-purple-600" />
            Admins
          </TabsTrigger>
        </TabsList>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6 mt-6">
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.users.total}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.users.active} active
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Projects</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.projects.total}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.projects.featured} featured
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Validators</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.users.validators}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.users.admins} admins
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Badges Awarded</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.badges.total}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.badges.breakdown.platinum} platinum
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* AI Scoring Configuration */}
          <AdminScoringConfig />
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4 mt-6">
          <div className="flex gap-4">
            <Input
              placeholder="Search users..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="max-w-sm"
            />
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
                <SelectItem value="validator">Validators</SelectItem>
                <SelectItem value="investor">Investors</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {usersLoading && users.length === 0 ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, idx) => (
                <Card key={idx} className="animate-pulse">
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex-1">
                      <div className="h-5 w-32 bg-secondary rounded mb-2"></div>
                      <div className="h-4 w-48 bg-secondary rounded mb-2"></div>
                      <div className="flex gap-2 mt-2">
                        <div className="h-6 w-16 bg-secondary rounded-full"></div>
                        <div className="h-6 w-20 bg-secondary rounded-full"></div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-9 w-24 bg-secondary rounded"></div>
                      <div className="h-9 w-24 bg-secondary rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {users.map(user => (
                <Card key={user.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-semibold">{user.username}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <div className="flex gap-2 mt-2">
                        {user.is_admin && <Badge>Admin</Badge>}
                        {user.is_validator && <Badge variant="secondary">Validator</Badge>}
                        {user.is_investor && <Badge variant="outline">Investor</Badge>}
                        {user.is_active === false && <Badge variant="destructive">Banned</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleUserAdminMutation.mutate(user.id)}
                        disabled={toggleUserAdminMutation.isPending}
                      >
                        {toggleUserAdminMutation.isPending ? (
                          <>
                            <div className="h-4 w-4 mr-1 border-2 border-transparent border-t-current rounded-full animate-spin" />
                            Updating...
                          </>
                        ) : (
                          user.is_admin ? 'Remove Admin' : 'Make Admin'
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant={user.is_active ? 'destructive' : 'default'}
                        onClick={() => toggleUserActiveMutation.mutate(user.id)}
                        disabled={toggleUserActiveMutation.isPending}
                      >
                        {toggleUserActiveMutation.isPending ? (
                          <>
                            <div className="h-4 w-4 mr-1 border-2 border-transparent border-t-current rounded-full animate-spin" />
                            {user.is_active ? 'Banning...' : 'Unbanning...'}
                          </>
                        ) : (
                          <>
                            <Ban className="h-4 w-4 mr-1" />
                            {user.is_active ? 'Ban' : 'Unban'}
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Validators Tab */}
        <TabsContent value="validators" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Add Validator</CardTitle>
              <CardDescription>Search and add a user as validator</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Input
                  placeholder="Search by username or email..."
                  value={validatorSearchQuery}
                  onChange={(e) => handleSearchValidators(e.target.value)}
                  disabled={isSearchingValidators}
                />
                {isSearchingValidators && (
                  <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Search Results */}
              {validatorSearchResults.length > 0 && (
                <div className="border rounded-md max-h-64 overflow-y-auto space-y-1 bg-muted/30 p-2">
                  {validatorSearchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleSelectValidatorForAdd(user)}
                      disabled={addValidatorMutation.isPending}
                      className="w-full text-left p-3 rounded-md hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium">{user.username}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      {addValidatorMutation.isPending && selectedValidatorForAdd?.id === user.id && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {validatorSearchQuery.trim().length >= 2 && validatorSearchResults.length === 0 && !isSearchingValidators && (
                <p className="text-sm text-muted-foreground p-2">No users found</p>
              )}

              {validatorSearchQuery.trim().length < 2 && (
                <p className="text-sm text-muted-foreground p-2">Type at least 2 characters to search</p>
              )}
            </CardContent>
          </Card>

          {validatorsLoading && validators.length === 0 ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, idx) => (
                <Card key={idx} className="animate-pulse">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="h-5 w-40 bg-secondary rounded"></div>
                        <div className="h-4 w-32 bg-secondary rounded mb-2"></div>
                        <div className="flex gap-2">
                          <div className="h-6 w-16 bg-secondary rounded-full"></div>
                          <div className="h-6 w-20 bg-secondary rounded-full"></div>
                        </div>
                      </div>
                      <div className="h-9 w-32 bg-secondary rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {validators.map(validator => (
                <Card key={validator.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{validator.username}</p>
                          <Badge variant="secondary">Validator</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{validator.email}</p>
                        {validator.permissions && (
                          <div className="mt-2 text-sm space-y-1">
                            <p className="text-muted-foreground">
                              Validate all: {validator.permissions.can_validate_all ? '✓ Yes' : '✗ No'}
                            </p>
                            <p className="text-muted-foreground">
                              Badge types: {validator.permissions.allowed_badge_types.join(', ')}
                            </p>
                            {validator.permissions.allowed_categories && validator.permissions.allowed_categories.length > 0 && (
                              <p className="text-muted-foreground">
                                Categories: {validator.permissions.allowed_categories.join(', ')}
                              </p>
                            )}
                          </div>
                        )}
                        {validator.assignments && (
                          <>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {validator.assignments.total} Total
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {validator.assignments.pending} Pending
                              </Badge>
                              <Badge variant="default" className="text-xs bg-blue-500">
                                {validator.assignments.in_review} In Review
                              </Badge>
                              <Badge variant="default" className="text-xs bg-green-500">
                                {validator.assignments.completed} Completed
                              </Badge>
                            </div>
                            {validator.assignments.category_breakdown && Object.keys(validator.assignments.category_breakdown).length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs text-muted-foreground mb-1 font-semibold">Assigned Project Categories:</p>
                                <div className="flex flex-wrap gap-1">
                                  {Object.entries(validator.assignments.category_breakdown).map(([category, count]) => (
                                    <Badge key={category} variant="outline" className="text-xs bg-primary/10">
                                      {category} ({count})
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        {/* Bulk Assign by Domain */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant={validator.assignments && validator.assignments.total > 0 ? "outline" : "default"}
                            >
                              {validator.assignments && validator.assignments.total > 0
                                ? "Manage Assignments"
                                : "Assign by Domain"}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>
                                {validator.assignments && validator.assignments.total > 0
                                  ? `Manage Assignments for ${validator.username}`
                                  : `Assign Projects to ${validator.username}`}
                              </DialogTitle>
                              <DialogDescription>
                                {validator.assignments && validator.assignments.total > 0
                                  ? `Currently has ${validator.assignments.total} assignments. Assign more projects by category.`
                                  : "Bulk assign projects by category filter"}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              {/* Show current assignment breakdown */}
                              {validator.assignments && validator.assignments.total > 0 && validator.assignments.category_breakdown && (
                                <div className="p-3 bg-muted rounded-md">
                                  <p className="text-sm font-semibold mb-2">Current Assignments by Category:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {Object.entries(validator.assignments.category_breakdown).map(([category, count]) => (
                                      <Badge key={category} variant="secondary" className="text-xs">
                                        {category}: {count}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div>
                                <Label>Category Filter</Label>
                                <select
                                  className="w-full mt-1 p-2 border rounded-md"
                                  defaultValue="all"
                                  id={`category-${validator.id}`}
                                >
                                  <option value="all">All Projects</option>
                                  <option value="AI/ML">AI/ML</option>
                                  <option value="Web3/Blockchain">Web3/Blockchain</option>
                                  <option value="FinTech">FinTech</option>
                                  <option value="HealthTech">HealthTech</option>
                                  <option value="EdTech">EdTech</option>
                                  <option value="E-Commerce">E-Commerce</option>
                                  <option value="SaaS">SaaS</option>
                                  <option value="DevTools">DevTools</option>
                                  <option value="IoT">IoT</option>
                                  <option value="Gaming">Gaming</option>
                                  <option value="Social">Social</option>
                                  <option value="Other">Other</option>
                                </select>
                              </div>
                              <div>
                                <Label>Limit (max projects)</Label>
                                <Input
                                  type="number"
                                  defaultValue="50"
                                  min="1"
                                  max="200"
                                  id={`limit-${validator.id}`}
                                />
                              </div>
                              <div>
                                <Label>Priority</Label>
                                <select
                                  className="w-full mt-1 p-2 border rounded-md"
                                  defaultValue="normal"
                                  id={`priority-${validator.id}`}
                                >
                                  <option value="low">Low</option>
                                  <option value="normal">Normal</option>
                                  <option value="high">High</option>
                                  <option value="urgent">Urgent</option>
                                </select>
                              </div>
                              <Button
                                className="w-full"
                                onClick={() => handleBulkAssignProjects(validator.id)}
                                disabled={bulkAssigningValidatorId === validator.id}
                              >
                                {bulkAssigningValidatorId === validator.id ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Assigning...
                                  </>
                                ) : (
                                  'Assign Projects'
                                )}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>

                        {/* Individual Project Assignment */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setCurrentValidatorForAssignment(validator.id);
                                setSelectedProjects([]);
                              }}
                            >
                              <List className="h-4 w-4 mr-1" />
                              Select Projects
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
                            <DialogHeader>
                              <DialogTitle>Assign Specific Projects to {validator.username}</DialogTitle>
                              <DialogDescription>
                                Select individual projects to assign
                              </DialogDescription>
                            </DialogHeader>
                            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                              {/* Select All Checkbox */}
                              <div className="sticky top-0 bg-background z-10 pb-2 border-b">
                                <label className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selectedProjects.length === projects.length && projects.length > 0}
                                    onChange={toggleSelectAllProjects}
                                    className="w-4 h-4"
                                  />
                                  <span className="font-semibold">Select All ({projects.length} projects)</span>
                                </label>
                              </div>

                              {/* Project List */}
                              {projectsLoading && projects.length === 0 ? (
                                <div className="flex justify-center py-8">
                                  <Loader2 className="h-6 w-6 animate-spin" />
                                </div>
                              ) : projects.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">No projects available</p>
                              ) : (
                                projects.map(project => (
                                  <label
                                    key={project.id}
                                    className="flex items-start gap-2 p-3 hover:bg-muted rounded cursor-pointer border"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedProjects.includes(project.id)}
                                      onChange={() => toggleProjectSelection(project.id)}
                                      className="w-4 h-4 mt-1"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium truncate">{project.title}</p>
                                      <p className="text-sm text-muted-foreground truncate">
                                        {project.description?.substring(0, 100)}...
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Score: {formatScore(getProjectScore(project))}
                                      </p>
                                    </div>
                                  </label>
                                ))
                              )}
                            </div>
                            <div className="pt-4 border-t">
                              <p className="text-sm text-muted-foreground mb-2">
                                {selectedProjects.length} project(s) selected
                              </p>
                              <Button
                                className="w-full"
                                onClick={handleAssignSelectedProjects}
                                disabled={selectedProjects.length === 0 || assigningSelectedValidatorId === currentValidatorForAssignment}
                              >
                                {assigningSelectedValidatorId === currentValidatorForAssignment ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Assigning...
                                  </>
                                ) : (
                                  'Assign Selected Projects'
                                )}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>

                        {/* Edit Permissions Button */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedValidatorId(validator.id);
                                if (validator.permissions) {
                                  setValidatorPermissions(validator.permissions);
                                }
                              }}
                            >
                              Edit Permissions
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Validator Permissions</DialogTitle>
                              <DialogDescription>
                                Configure what {validator.username} can validate
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id="validate-all"
                                  checked={validatorPermissions.can_validate_all}
                                  onChange={(e) => setValidatorPermissions({
                                    ...validatorPermissions,
                                    can_validate_all: e.target.checked
                                  })}
                                />
                                <Label htmlFor="validate-all">Can validate all projects</Label>
                              </div>
                              <div>
                                <Label>Allowed Badge Types</Label>
                                <div className="space-y-2 mt-2">
                                  {['stone', 'silver', 'gold', 'platinum', 'demerit'].map(type => (
                                    <div key={type} className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        id={`badge-${type}`}
                                        checked={validatorPermissions.allowed_badge_types.includes(type)}
                                        onChange={(e) => {
                                          const types = e.target.checked
                                            ? [...validatorPermissions.allowed_badge_types, type]
                                            : validatorPermissions.allowed_badge_types.filter(t => t !== type);
                                          setValidatorPermissions({
                                            ...validatorPermissions,
                                            allowed_badge_types: types
                                          });
                                        }}
                                      />
                                      <Label htmlFor={`badge-${type}`}>{type}</Label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <Label>Allowed Categories (auto-assignment)</Label>
                                <p className="text-xs text-muted-foreground mb-2">
                                  New projects with these categories will be auto-assigned to this validator
                                </p>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                  {['AI/ML', 'Web3/Blockchain', 'FinTech', 'HealthTech', 'EdTech', 'E-Commerce', 'SaaS', 'DevTools', 'IoT', 'Gaming', 'Social', 'Other'].map(cat => (
                                    <div key={cat} className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        id={`cat-${cat}`}
                                        checked={validatorPermissions.allowed_categories?.includes(cat) || false}
                                        onChange={(e) => {
                                          const categories = e.target.checked
                                            ? [...(validatorPermissions.allowed_categories || []), cat]
                                            : (validatorPermissions.allowed_categories || []).filter(c => c !== cat);
                                          setValidatorPermissions({
                                            ...validatorPermissions,
                                            allowed_categories: categories
                                          });
                                        }}
                                      />
                                      <Label htmlFor={`cat-${cat}`} className="text-xs">{cat}</Label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <Button onClick={handleUpdateValidatorPermissions}>
                                Save Permissions
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>

                        {/* Remove Button */}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeValidatorMutation.mutate(validator.id)}
                          disabled={removeValidatorMutation.isPending}
                        >
                          {removeValidatorMutation.isPending ? (
                            <>
                              <div className="h-4 w-4 mr-1 border-2 border-transparent border-t-current rounded-full animate-spin" />
                              Removing...
                            </>
                          ) : (
                            'Remove'
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-4 mt-6">
          <div className="flex gap-4">
            <Input
              placeholder="Search projects..."
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {projectsLoading && projects.length === 0 ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map(project => (
                <Card key={project.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/project/${project.id}`}
                          className="font-semibold hover:text-primary transition-colors flex items-center gap-1"
                        >
                          {project.title}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                        {project.is_featured && <Badge>Featured</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        By {project.creator?.username || 'Unknown'} • Score: {formatScore(getProjectScore(project))}
                      </p>
                      <button
                        onClick={() => copyToClipboard(project.id, 'Project ID')}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-1"
                      >
                        <Copy className="h-3 w-3" />
                        ID: {project.id.slice(0, 8)}...
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleProjectFeaturedMutation.mutate(project.id)}
                        disabled={toggleProjectFeaturedMutation.isPending}
                      >
                        {toggleProjectFeaturedMutation.isPending ? (
                          <>
                            <div className="h-4 w-4 mr-1 border-2 border-transparent border-t-current rounded-full animate-spin" />
                            Updating...
                          </>
                        ) : (
                          project.is_featured ? 'Unfeature' : 'Feature'
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteProject(project.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Infinite scroll observer target */}
              <div ref={projectsObserverTarget} className="py-4 text-center">
                {projectsHasNextPage ? (
                  <p className="text-sm text-muted-foreground">Scroll to load more projects...</p>
                ) : projects.length > 0 ? (
                  <p className="text-sm text-muted-foreground">No more projects</p>
                ) : null}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Chains Tab */}
        <TabsContent value="chains" className="space-y-6 mt-6">
          <ChainsModerationSection />
        </TabsContent>

        {/* Badges Tab */}
        <TabsContent value="badges" className="space-y-4 mt-6">
          <Tabs value={validatorTab} onValueChange={setValidatorTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="current">All Badges</TabsTrigger>
              <TabsTrigger value="award">Award Badge</TabsTrigger>
            </TabsList>

            {/* All Badges List */}
            <TabsContent value="current" className="mt-4 space-y-4">
              <BadgeManagementList observerTarget={badgesObserverTarget} />
            </TabsContent>

            {/* Award New Badge */}
            <TabsContent value="award" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Award Custom Badge</CardTitle>
                  <CardDescription>Create and award a custom badge with image</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Project ID</Label>
                    <Input
                      placeholder="Project ID"
                      value={customBadgeProjectId}
                      onChange={(e) => setCustomBadgeProjectId(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Badge Name</Label>
                    <Input
                      placeholder="e.g., Innovation Award"
                      value={customBadgeName}
                      onChange={(e) => setCustomBadgeName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Badge Image URL (Optional)</Label>
                    <Input
                      placeholder="https://..."
                      value={customBadgeImage}
                      onChange={(e) => setCustomBadgeImage(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Points</Label>
                    <Input
                      type="number"
                      value={customBadgePoints}
                      onChange={(e) => setCustomBadgePoints(parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Rationale</Label>
                    <Textarea
                      placeholder="Why are you awarding this badge?"
                      value={customBadgeRationale}
                      onChange={(e) => setCustomBadgeRationale(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleAwardCustomBadge}>
                    <Upload className="h-4 w-4 mr-2" />
                    Award Custom Badge
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Investors Tab with Subtabs */}
        <TabsContent value="investors" className="space-y-4 mt-6">
          <Tabs value={investorTab} onValueChange={setInvestorTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="requests">Pending Requests</TabsTrigger>
              <TabsTrigger value="current">Current Investors</TabsTrigger>
            </TabsList>

            {/* Pending Requests */}
            <TabsContent value="requests" className="mt-4">
              {investorsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="space-y-3">
                  {investorRequests.filter(r => r.status === 'pending').length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground">No pending investor requests</p>
                      </CardContent>
                    </Card>
                  ) : (
                    investorRequests.filter(r => r.status === 'pending').map(request => (
                      <Card key={request.id}>
                        <CardContent className="py-4">
                          {/* Header with User Info and Actions */}
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <p className="font-semibold text-lg">{request.user?.username || 'Unknown'}</p>
                              <p className="text-sm text-muted-foreground">{request.user?.email}</p>
                              <div className="flex gap-2 mt-2">
                                <Badge>{request.plan_type}</Badge>
                                <Badge variant="outline">{request.investor_type || 'individual'}</Badge>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => approveInvestorMutation.mutate(request.id)}
                                disabled={approveInvestorMutation.isPending}
                              >
                                {approveInvestorMutation.isPending ? (
                                  <>
                                    <div className="h-4 w-4 mr-1 border-2 border-transparent border-t-current rounded-full animate-spin" />
                                    Approving...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Approve
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => rejectInvestorMutation.mutate(request.id)}
                                disabled={rejectInvestorMutation.isPending}
                              >
                                {rejectInvestorMutation.isPending ? (
                                  <>
                                    <div className="h-4 w-4 mr-1 border-2 border-transparent border-t-current rounded-full animate-spin" />
                                    Rejecting...
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Reject
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>

                          {/* Professional Info */}
                          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                            {request.name && (
                              <div>
                                <span className="font-medium">Name: </span>
                                {request.name}
                              </div>
                            )}
                            {request.company_name && (
                              <div>
                                <span className="font-medium">Company: </span>
                                {request.company_name}
                              </div>
                            )}
                            {request.position_title && (
                              <div>
                                <span className="font-medium">Position: </span>
                                {request.position_title}
                              </div>
                            )}
                            {request.location && (
                              <div>
                                <span className="font-medium">Location: </span>
                                {request.location}
                              </div>
                            )}
                            {request.years_experience && (
                              <div>
                                <span className="font-medium">Experience: </span>
                                {request.years_experience} years
                              </div>
                            )}
                            {request.fund_size && (
                              <div>
                                <span className="font-medium">Fund Size: </span>
                                {request.fund_size}
                              </div>
                            )}
                          </div>

                          {/* Investment Focus */}
                          {(request.investment_stages?.length || request.industries?.length || request.geographic_focus?.length) && (
                            <div className="mb-4 space-y-2">
                              <p className="font-medium text-sm">Investment Focus:</p>
                              {request.investment_stages && request.investment_stages.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  <span className="text-xs text-muted-foreground">Stages:</span>
                                  {request.investment_stages.map(stage => (
                                    <Badge key={stage} variant="secondary" className="text-xs">{stage}</Badge>
                                  ))}
                                </div>
                              )}
                              {request.industries && request.industries.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  <span className="text-xs text-muted-foreground">Industries:</span>
                                  {request.industries.map(industry => (
                                    <Badge key={industry} variant="secondary" className="text-xs">{industry}</Badge>
                                  ))}
                                </div>
                              )}
                              {request.geographic_focus && request.geographic_focus.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  <span className="text-xs text-muted-foreground">Regions:</span>
                                  {request.geographic_focus.map(geo => (
                                    <Badge key={geo} variant="secondary" className="text-xs">{geo}</Badge>
                                  ))}
                                </div>
                              )}
                              {(request.ticket_size_min || request.ticket_size_max) && (
                                <div className="text-sm">
                                  <span className="font-medium">Ticket Size: </span>
                                  ${request.ticket_size_min?.toLocaleString() || '0'} - ${request.ticket_size_max?.toLocaleString() || '∞'}
                                </div>
                              )}
                            </div>
                          )}

                          {/* About */}
                          {(request.bio || request.investment_thesis) && (
                            <div className="mb-4 space-y-2">
                              {request.bio && (
                                <div>
                                  <p className="font-medium text-sm">Bio:</p>
                                  <p className="text-sm text-muted-foreground">{request.bio}</p>
                                </div>
                              )}
                              {request.investment_thesis && (
                                <div>
                                  <p className="font-medium text-sm">Investment Thesis:</p>
                                  <p className="text-sm text-muted-foreground">{request.investment_thesis}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Track Record */}
                          {(request.num_investments || request.portfolio_highlights || request.notable_investments?.length) && (
                            <div className="mb-4 space-y-2">
                              <p className="font-medium text-sm">Track Record:</p>
                              {request.num_investments && (
                                <div className="text-sm">
                                  <span className="font-medium">Number of Investments: </span>
                                  {request.num_investments}
                                </div>
                              )}
                              {request.notable_investments && request.notable_investments.length > 0 && (
                                <div className="text-sm">
                                  <span className="font-medium">Notable Investments:</span>
                                  <ul className="list-disc list-inside ml-2 text-muted-foreground">
                                    {request.notable_investments.map((inv, idx) => (
                                      <li key={idx}>{inv.company} ({inv.stage}, {inv.year})</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {request.portfolio_highlights && (
                                <div className="text-sm">
                                  <span className="font-medium">Portfolio Highlights: </span>
                                  <p className="text-muted-foreground">{request.portfolio_highlights}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Value Add */}
                          {(request.value_adds?.length || request.expertise_areas) && (
                            <div className="mb-4 space-y-2">
                              <p className="font-medium text-sm">Value Add:</p>
                              {request.value_adds && request.value_adds.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {request.value_adds.map(value => (
                                    <Badge key={value} variant="secondary" className="text-xs">{value}</Badge>
                                  ))}
                                </div>
                              )}
                              {request.expertise_areas && (
                                <div className="text-sm text-muted-foreground">
                                  {request.expertise_areas}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Visibility & Contact */}
                          <div className="grid grid-cols-2 gap-4 pt-4 border-t text-sm">
                            <div>
                              <p className="font-medium mb-1">Visibility:</p>
                              <div className="flex gap-2">
                                <Badge variant={request.is_public ? "default" : "outline"}>
                                  {request.is_public ? 'Public Profile' : 'Private'}
                                </Badge>
                                {request.open_to_requests && (
                                  <Badge variant="default">Open to Requests</Badge>
                                )}
                              </div>
                            </div>
                            {(request.linkedin_url || request.twitter_url || request.website_url) && (
                              <div>
                                <p className="font-medium mb-1">Links:</p>
                                <div className="flex gap-2 flex-wrap">
                                  {request.linkedin_url && (
                                    <a href={request.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">LinkedIn</a>
                                  )}
                                  {request.twitter_url && (
                                    <a href={request.twitter_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">Twitter</a>
                                  )}
                                  {request.website_url && (
                                    <a href={request.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">Website</a>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </TabsContent>

            {/* Current Investors */}
            <TabsContent value="current" className="mt-4">
              {investorsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="space-y-3">
                  {investorRequests.filter(r => r.status === 'approved').length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground">No approved investors yet</p>
                      </CardContent>
                    </Card>
                  ) : (
                    investorRequests.filter(r => r.status === 'approved').map(request => (
                      <Card key={request.id}>
                        <CardContent className="py-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <p className="font-semibold">{request.user?.username || 'Unknown'}</p>
                              <p className="text-sm text-muted-foreground">{request.user?.email}</p>
                              <div className="mt-2 space-y-1">
                                <div className="flex gap-2">
                                  <Badge variant="outline">{request.plan_type}</Badge>
                                  <Badge variant={request.is_public ? 'default' : 'secondary'}>
                                    {request.is_public ? 'Public' : 'Private'}
                                  </Badge>
                                  {request.open_to_requests && (
                                    <Badge variant="outline">Open to Requests</Badge>
                                  )}
                                </div>
                                {request.company_name && (
                                  <p className="text-sm">Company: {request.company_name}</p>
                                )}
                                {request.location && (
                                  <p className="text-sm">Location: {request.location}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Edit Investor Permissions</DialogTitle>
                                    <DialogDescription>
                                      Manage visibility and permissions for {request.user?.username}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                      <Label>Plan Type</Label>
                                      <Select
                                        defaultValue={request.plan_type}
                                        disabled={updatingPermissions === request.id}
                                        onValueChange={async (value) => {
                                          setUpdatingPermissions(request.id);
                                          try {
                                            const res = await fetch(`${getBackendUrl()}/api/investor-requests/${request.id}/update-permissions`, {
                                              method: 'POST',
                                              headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${localStorage.getItem('token')}`
                                              },
                                              body: JSON.stringify({ plan_type: value })
                                            });
                                            const data = await res.json();
                                            if (data.status === 'success') {
                                              toast.success(`Plan updated to ${value} successfully`);
                                              await refetchInvestorRequests();
                                            } else {
                                              toast.error(data.message || 'Failed to update plan type');
                                            }
                                          } catch (error) {
                                            toast.error('Failed to update plan type');
                                          } finally {
                                            setUpdatingPermissions(null);
                                          }
                                        }}
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="free">Free</SelectItem>
                                          <SelectItem value="pro">Pro</SelectItem>
                                          <SelectItem value="enterprise">Enterprise</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      {updatingPermissions === request.id && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                          <span>Updating...</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="space-y-3">
                                      <Label>Visibility Settings</Label>
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm">Public Profile</span>
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="checkbox"
                                            defaultChecked={request.is_public}
                                            disabled={updatingPermissions === request.id}
                                            onChange={async (e) => {
                                              setUpdatingPermissions(request.id);
                                              try {
                                                const res = await fetch(`${getBackendUrl()}/api/investor-requests/${request.id}/update-permissions`, {
                                                  method: 'POST',
                                                  headers: {
                                                    'Content-Type': 'application/json',
                                                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                                                  },
                                                  body: JSON.stringify({ is_public: e.target.checked })
                                                });
                                                const data = await res.json();
                                                if (data.status === 'success') {
                                                  toast.success(`Profile ${e.target.checked ? 'is now public' : 'is now private'}`);
                                                  await refetchInvestorRequests();
                                                } else {
                                                  toast.error(data.message || 'Failed to update visibility');
                                                }
                                              } catch (error) {
                                                toast.error('Failed to update visibility');
                                              } finally {
                                                setUpdatingPermissions(null);
                                              }
                                            }}
                                            className="h-4 w-4"
                                          />
                                          {updatingPermissions === request.id && (
                                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm">Open to Requests</span>
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="checkbox"
                                            defaultChecked={request.open_to_requests}
                                            disabled={updatingPermissions === request.id}
                                            onChange={async (e) => {
                                              setUpdatingPermissions(request.id);
                                              try {
                                                const res = await fetch(`${getBackendUrl()}/api/investor-requests/${request.id}/update-permissions`, {
                                                  method: 'POST',
                                                  headers: {
                                                    'Content-Type': 'application/json',
                                                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                                                  },
                                                  body: JSON.stringify({ open_to_requests: e.target.checked })
                                                });
                                                const data = await res.json();
                                                if (data.status === 'success') {
                                                  toast.success(`${e.target.checked ? 'Now accepting requests' : 'Not accepting requests'}`);
                                                  await refetchInvestorRequests();
                                                } else {
                                                  toast.error(data.message || 'Failed to update permissions');
                                                }
                                              } catch (error) {
                                                toast.error('Failed to update permissions');
                                              } finally {
                                                setUpdatingPermissions(null);
                                              }
                                            }}
                                            className="h-4 w-4"
                                          />
                                          {updatingPermissions === request.id && (
                                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={removingInvestor === request.id}
                                onClick={async () => {
                                  if (!confirm(`Remove investor status from ${request.user?.username}?`)) return;
                                  setRemovingInvestor(request.id);
                                  try {
                                    const res = await fetch(`${getBackendUrl()}/api/investor-requests/${request.id}/remove-investor`, {
                                      method: 'POST',
                                      headers: {
                                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                                      }
                                    });
                                    const data = await res.json();
                                    if (data.status === 'success') {
                                      toast.success('Investor status removed successfully');
                                      await refetchInvestorRequests();
                                    } else {
                                      toast.error(data.message || 'Failed to remove investor status');
                                    }
                                  } catch (error) {
                                    toast.error('Failed to remove investor status');
                                  } finally {
                                    setRemovingInvestor(null);
                                  }
                                }}
                              >
                                {removingInvestor === request.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Ban className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Feedback & Reports Tab */}
        <TabsContent value="feedback" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Feedback & Reports</CardTitle>
              <CardDescription>
                View and manage user feedback, suggestions, and reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FeedbackManagement />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admin Management Tab */}
        <TabsContent value="admins" className="space-y-6 mt-6">
          <AdminUserManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
