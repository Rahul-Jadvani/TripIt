import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TravelGroup } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { TravelGroupMembers } from '@/components/TravelGroupMembers';
import { ShareDialog } from '@/components/ShareDialog';
import {
  Users,
  Calendar,
  MapPin,
  Shield,
  Share2,
  Edit,
  Trash2,
  UserPlus,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { travelGroupsService } from '@/services/api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function TravelGroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['travel-group', groupId],
    queryFn: async () => {
      const response = await travelGroupsService.getGroupById(groupId!);
      return response.data.data as TravelGroup;
    },
    enabled: !!groupId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const group = data;

  const isMember = group?.members?.some(
    (m) => m.traveler_id === user?.id && m.join_status === 'accepted'
  );
  const isPending = group?.members?.some(
    (m) => m.traveler_id === user?.id && m.join_status === 'pending'
  );
  const isCreator = group?.created_by_traveler_id === user?.id;
  const isFull = group && group.current_members_count >= group.max_members;

  const joinMutation = useMutation({
    mutationFn: () => travelGroupsService.joinGroup(groupId!),
    onSuccess: () => {
      toast.success('Join request sent successfully');
      queryClient.invalidateQueries({ queryKey: ['travel-group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['travel-groups'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to join group');
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => travelGroupsService.leaveGroup(groupId!),
    onSuccess: () => {
      toast.success('Left group successfully');
      queryClient.invalidateQueries({ queryKey: ['travel-group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['travel-groups'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to leave group');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => travelGroupsService.deleteGroup(groupId!),
    onSuccess: () => {
      toast.success('Group deleted successfully');
      navigate('/groups');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete group');
    },
  });

  const handleJoinLeave = () => {
    if (!user) {
      toast.error('Please login to join groups');
      navigate('/login');
      return;
    }

    if (isMember || isPending) {
      leaveMutation.mutate();
    } else {
      joinMutation.mutate();
    }
  };

  const handleEdit = () => {
    navigate(`/groups/${groupId}/edit`);
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  const handleShare = () => {
    setShareDialogOpen(true);
  };

  const formatDateRange = () => {
    if (!group) return '';
    try {
      const start = format(new Date(group.start_date), 'MMM d, yyyy');
      const end = format(new Date(group.end_date), 'MMM d, yyyy');
      return `${start} - ${end}`;
    } catch {
      return 'Date TBD';
    }
  };

  const getDaysUntilStart = () => {
    if (!group) return null;
    try {
      const days = differenceInDays(new Date(group.start_date), new Date());
      return days > 0 ? days : null;
    } catch {
      return null;
    }
  };

  const getGroupTypeLabel = (type?: string) => {
    const labels: Record<string, string> = {
      interest_based: 'Interest Based',
      safety_focused: 'Safety Focused',
      women_only: 'Women Only',
      location_based: 'Location Based',
    };
    return type ? labels[type] || type : 'General';
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="max-w-6xl mx-auto text-center py-12">
        <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Group not found</h2>
        <p className="text-muted-foreground mb-6">
          This travel group doesn't exist or has been removed.
        </p>
        <Button onClick={() => navigate('/groups')}>Browse Groups</Button>
      </div>
    );
  }

  const daysUntilStart = getDaysUntilStart();
  const memberPercentage = (group.current_members_count / group.max_members) * 100;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Card */}
      <Card className="p-6 space-y-4">
        {/* Title & Actions */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground mb-2">{group.name}</h1>
            <div className="flex items-center gap-2 text-muted-foreground mb-3">
              <MapPin className="h-5 w-5" />
              <span className="text-lg">{group.destination}</span>
            </div>

            {/* Creator */}
            {group.creator && (
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={group.creator.avatar_url} />
                  <AvatarFallback>
                    {group.creator.username?.slice(0, 2).toUpperCase() || 'NA'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground">
                  Organized by{' '}
                  <span className="font-semibold text-foreground">
                    {group.creator.username}
                  </span>
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>

            {isCreator && (
              <>
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </>
            )}

            {!isCreator && (
              <Button
                onClick={handleJoinLeave}
                disabled={
                  (!isMember && !isPending && isFull) ||
                  joinMutation.isPending ||
                  leaveMutation.isPending
                }
                size="lg"
              >
                {joinMutation.isPending || leaveMutation.isPending ? (
                  'Loading...'
                ) : isPending ? (
                  <>
                    <Clock className="h-4 w-4 mr-2" />
                    Pending Approval
                  </>
                ) : isMember ? (
                  'Leave Group'
                ) : isFull ? (
                  'Group Full'
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Join Group
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Description */}
        {group.description && (
          <div className="bg-secondary/30 rounded-lg p-4 border border-border">
            <p className="text-foreground leading-relaxed">{group.description}</p>
          </div>
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Dates */}
          <div className="bg-secondary/20 rounded-lg p-4 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Calendar className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase">Dates</span>
            </div>
            <p className="text-sm font-semibold text-foreground">{formatDateRange()}</p>
            {daysUntilStart !== null && (
              <p className="text-xs text-muted-foreground mt-1">
                Starts in {daysUntilStart} days
              </p>
            )}
          </div>

          {/* Members */}
          <div className="bg-secondary/20 rounded-lg p-4 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Users className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase">Members</span>
            </div>
            <p className="text-sm font-semibold text-foreground">
              {group.current_members_count} / {group.max_members}
            </p>
            <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${Math.min(memberPercentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Group Type */}
          <div className="bg-secondary/20 rounded-lg p-4 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Shield className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase">Type</span>
            </div>
            <p className="text-sm font-semibold text-foreground">
              {getGroupTypeLabel(group.group_type)}
            </p>
          </div>

          {/* Status */}
          <div className="bg-secondary/20 rounded-lg p-4 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <AlertCircle className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase">Status</span>
            </div>
            <Badge variant={group.is_active ? 'default' : 'secondary'}>
              {group.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>

        {/* Tags & Badges */}
        <div className="flex flex-wrap gap-2">
          {group.is_women_only && (
            <Badge className="bg-pink-500/20 text-pink-700 border-pink-500/30">
              <Shield className="h-3 w-3 mr-1" />
              Women Only
            </Badge>
          )}

          {group.is_featured && (
            <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">
              Featured
            </Badge>
          )}

          {group.activity_tags?.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      </Card>

      {/* Tabs */}
      <Card className="p-6">
        <Tabs defaultValue="members" className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="members">
              <Users className="h-4 w-4 mr-2" />
              Members ({group.current_members_count})
            </TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="itineraries">Itineraries</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="mt-6">
            <TravelGroupMembers group={group} />
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <div className="text-center py-12 text-muted-foreground">
              <p>Activity feed coming soon...</p>
            </div>
          </TabsContent>

          <TabsContent value="itineraries" className="mt-6">
            <div className="text-center py-12 text-muted-foreground">
              <p>
                {group.itineraries?.length || 0} shared itineraries
              </p>
              {group.itineraries?.length === 0 && (
                <p className="mt-2 text-sm">No itineraries shared yet</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Share Dialog */}
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        url={`${window.location.origin}/groups/${group.id}`}
        title={group.name}
        description={`Join me on this trip to ${group.destination}`}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Travel Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{group.name}"? This action cannot be undone
              and all members will be removed from the group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
