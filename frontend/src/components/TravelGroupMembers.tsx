import { useState } from 'react';
import { TravelGroup, TravelGroupMember } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { TravelGroupInviteDialog } from '@/components/TravelGroupInviteDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Users, MoreVertical, UserMinus, Shield, Crown, Calendar, Award } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { travelGroupsService } from '@/services/api';

interface TravelGroupMembersProps {
  group: TravelGroup;
}

export function TravelGroupMembers({ group }: TravelGroupMembersProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const isCreator = group.created_by_traveler_id === user?.id;
  const isOrganizer = group.members?.some(
    (m) =>
      m.traveler_id === user?.id &&
      (m.role === 'organizer' || m.role === 'moderator')
  );

  const canManageMembers = isCreator || isOrganizer;

  const removeMemberMutation = useMutation({
    mutationFn: ({ memberId }: { memberId: string }) =>
      travelGroupsService.removeMember(group.id, memberId),
    onSuccess: () => {
      toast.success('Member removed successfully');
      queryClient.invalidateQueries({ queryKey: ['travel-group', group.id] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to remove member');
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      travelGroupsService.updateMemberRole(group.id, memberId, role),
    onSuccess: () => {
      toast.success('Member role updated successfully');
      queryClient.invalidateQueries({ queryKey: ['travel-group', group.id] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update role');
    },
  });

  const handleRemoveMember = (memberId: string, memberName: string) => {
    if (confirm(`Remove ${memberName} from the group?`)) {
      removeMemberMutation.mutate({ memberId });
    }
  };

  const handleChangeRole = (memberId: string, newRole: string) => {
    changeRoleMutation.mutate({ memberId, role: newRole });
  };

  const getRoleBadge = (role: string) => {
    const config: Record<
      string,
      { label: string; icon: React.ReactNode; variant: 'default' | 'secondary' | 'outline' }
    > = {
      organizer: {
        label: 'Organizer',
        icon: <Crown className="h-3 w-3 mr-1" />,
        variant: 'default',
      },
      moderator: {
        label: 'Moderator',
        icon: <Shield className="h-3 w-3 mr-1" />,
        variant: 'default',
      },
      member: { label: 'Member', icon: null, variant: 'secondary' },
      guest: { label: 'Guest', icon: null, variant: 'outline' },
    };

    const roleConfig = config[role] || config.member;

    return (
      <Badge variant={roleConfig.variant} className="text-xs">
        {roleConfig.icon}
        {roleConfig.label}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const config: Record<
      string,
      { label: string; className: string }
    > = {
      accepted: { label: 'Active', className: 'bg-green-500/20 text-green-700 border-green-500/30' },
      pending: { label: 'Pending', className: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30' },
      rejected: { label: 'Rejected', className: 'bg-red-500/20 text-red-700 border-red-500/30' },
      left: { label: 'Left', className: 'bg-gray-500/20 text-gray-700 border-gray-500/30' },
      blocked: { label: 'Blocked', className: 'bg-red-500/20 text-red-700 border-red-500/30' },
    };

    const statusConfig = config[status] || config.accepted;

    return (
      <Badge className={`text-xs ${statusConfig.className}`}>
        {statusConfig.label}
      </Badge>
    );
  };

  const activeMembers = group.members?.filter((m) => m.join_status === 'accepted') || [];
  const pendingMembers = group.members?.filter((m) => m.join_status === 'pending') || [];

  return (
    <div className="space-y-6">
      {/* Header with Invite Button */}
      {canManageMembers && (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">Manage Members</h3>
            <p className="text-sm text-muted-foreground">
              {activeMembers.length} active members
            </p>
          </div>
          <Button onClick={() => setInviteDialogOpen(true)}>
            <Users className="h-4 w-4 mr-2" />
            Invite Members
          </Button>
        </div>
      )}

      {/* Pending Approvals (Only for organizers) */}
      {canManageMembers && pendingMembers.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-foreground flex items-center gap-2">
            <Shield className="h-4 w-4 text-yellow-600" />
            Pending Approvals ({pendingMembers.length})
          </h4>
          <div className="space-y-2">
            {pendingMembers.map((member) => (
              <Card key={member.id} className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.traveler?.avatar_url} />
                      <AvatarFallback>
                        {member.traveler?.username?.slice(0, 2).toUpperCase() || 'NA'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-foreground">
                        {member.traveler?.username || 'Unknown User'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Requested {format(new Date(member.joined_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        handleChangeRole(member.id, 'accepted')
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRemoveMember(member.id, member.traveler?.username || 'User')}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Active Members List */}
      <div className="space-y-3">
        <h4 className="font-semibold text-foreground">
          Active Members ({activeMembers.length})
        </h4>
        <div className="space-y-2">
          {activeMembers.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No active members yet</p>
            </Card>
          ) : (
            activeMembers.map((member) => {
              const isCurrentUser = member.traveler_id === user?.id;
              const isGroupCreator = member.traveler_id === group.created_by_traveler_id;

              return (
                <Card key={member.id} className="p-4 hover:bg-secondary/20 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    {/* Member Info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-12 w-12 flex-shrink-0">
                        <AvatarImage src={member.traveler?.avatar_url} />
                        <AvatarFallback>
                          {member.traveler?.username?.slice(0, 2).toUpperCase() || 'NA'}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-foreground truncate">
                            {member.traveler?.username || 'Unknown User'}
                            {isCurrentUser && (
                              <span className="text-xs text-muted-foreground ml-2">(You)</span>
                            )}
                          </p>
                          {getRoleBadge(member.role)}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Joined {format(new Date(member.joined_date), 'MMM d, yyyy')}
                          </span>
                          {member.traveler?.traveler_reputation_score && (
                            <span className="flex items-center gap-1">
                              <Award className="h-3 w-3" />
                              Reputation: {member.traveler.traveler_reputation_score}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions Menu (for organizers) */}
                    {canManageMembers && !isGroupCreator && !isCurrentUser && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {member.role !== 'organizer' && (
                            <DropdownMenuItem
                              onClick={() => handleChangeRole(member.id, 'organizer')}
                            >
                              <Crown className="h-4 w-4 mr-2" />
                              Make Organizer
                            </DropdownMenuItem>
                          )}
                          {member.role !== 'moderator' && (
                            <DropdownMenuItem
                              onClick={() => handleChangeRole(member.id, 'moderator')}
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              Make Moderator
                            </DropdownMenuItem>
                          )}
                          {member.role !== 'member' && (
                            <DropdownMenuItem
                              onClick={() => handleChangeRole(member.id, 'member')}
                            >
                              <Users className="h-4 w-4 mr-2" />
                              Make Member
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() =>
                              handleRemoveMember(member.id, member.traveler?.username || 'User')
                            }
                            className="text-destructive"
                          >
                            <UserMinus className="h-4 w-4 mr-2" />
                            Remove Member
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Invite Dialog */}
      <TravelGroupInviteDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        groupId={group.id}
      />
    </div>
  );
}
