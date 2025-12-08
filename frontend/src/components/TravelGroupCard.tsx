import { memo, useCallback } from 'react';
import { TravelGroup } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Calendar, MapPin, Shield, Star } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { travelGroupsService } from '@/services/api';

interface TravelGroupCardProps {
  group: TravelGroup;
  onClick?: () => void;
  averageSafetyScore?: number;
}

export const TravelGroupCard = memo(function TravelGroupCard({ group, onClick, averageSafetyScore }: TravelGroupCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isMember = group.members?.some(m => m.traveler_id === user?.id && m.join_status === 'accepted');
  const isPending = group.members?.some(m => m.traveler_id === user?.id && m.join_status === 'pending');
  const isCreator = group.created_by_traveler_id === user?.id;
  const isFull = group.current_members_count >= group.max_members;

  const joinMutation = useMutation({
    mutationFn: () => travelGroupsService.joinGroup(group.id),
    onSuccess: () => {
      toast.success('Join request sent successfully');
      queryClient.invalidateQueries({ queryKey: ['travel-groups'] });
      queryClient.invalidateQueries({ queryKey: ['travel-group', group.id] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to join group');
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => travelGroupsService.leaveGroup(group.id),
    onSuccess: () => {
      toast.success('Left group successfully');
      queryClient.invalidateQueries({ queryKey: ['travel-groups'] });
      queryClient.invalidateQueries({ queryKey: ['travel-group', group.id] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to leave group');
    },
  });

  const handleJoinLeave = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user) {
      toast.error('Please login to join groups');
      return;
    }

    if (isMember || isPending) {
      leaveMutation.mutate();
    } else {
      joinMutation.mutate();
    }
  }, [user, isMember, isPending, leaveMutation, joinMutation]);

  const formatDateRange = useCallback(() => {
    try {
      const start = format(new Date(group.start_date), 'MMM d');
      const end = format(new Date(group.end_date), 'MMM d, yyyy');
      return `${start} - ${end}`;
    } catch {
      return 'Date TBD';
    }
  }, [group.start_date, group.end_date]);

  const getGroupTypeLabel = useCallback((type?: string) => {
    const labels: Record<string, string> = {
      interest_based: 'Interest Based',
      safety_focused: 'Safety Focused',
      women_only: 'Women Only',
      location_based: 'Location Based',
    };
    return type ? labels[type] || type : 'General';
  }, []);

  return (
    <Card
      className="card-interactive overflow-hidden relative cursor-pointer transition-all duration-300 hover:shadow-lg"
      onClick={onClick}
    >
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {group.is_featured && (
                <Star className="h-4 w-4 fill-primary text-primary flex-shrink-0" />
              )}
              <h3 className="text-lg font-bold text-foreground line-clamp-1">
                {group.name}
              </h3>
            </div>

            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="line-clamp-1">{group.destination}</span>
            </div>

            {group.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {group.description}
              </p>
            )}
          </div>

          {/* Average Safety Score */}
          {averageSafetyScore !== undefined && averageSafetyScore > 0 && (
            <div className="flex flex-col items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 px-3 py-2 min-w-[70px] flex-shrink-0">
              <Shield className="h-4 w-4 text-primary mb-1" />
              <span className="text-lg font-bold text-primary">
                {averageSafetyScore.toFixed(1)}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">
                Safety
              </span>
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="flex items-center gap-2 text-sm text-foreground bg-secondary/30 rounded-lg p-2.5 border border-border/40">
          <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="font-medium">{formatDateRange()}</span>
        </div>

        {/* Activity Tags & Badges */}
        <div className="flex flex-wrap gap-1.5">
          {group.is_women_only && (
            <Badge className="bg-pink-500/20 text-pink-700 border-pink-500/30 text-xs">
              <Shield className="h-3 w-3 mr-1" />
              Women Only
            </Badge>
          )}

          <Badge variant="secondary" className="text-xs">
            {getGroupTypeLabel(group.group_type)}
          </Badge>

          {group.activity_tags?.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}

          {group.activity_tags && group.activity_tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{group.activity_tags.length - 3}
            </Badge>
          )}
        </div>

        {/* Footer with Members & Action */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/40">
          {/* Member Count */}
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {group.members?.slice(0, 3).map((member, idx) => (
                <Avatar key={idx} className="h-7 w-7 border-2 border-background">
                  <AvatarImage src={member.traveler?.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {member.traveler?.username?.slice(0, 2).toUpperCase() || 'NA'}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <div className="flex items-center gap-1 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-foreground">
                {group.current_members_count}/{group.max_members}
              </span>
            </div>
          </div>

          {/* Join/Leave Button */}
          {!isCreator && (
            <Button
              size="sm"
              variant={isMember ? "outline" : "default"}
              onClick={handleJoinLeave}
              disabled={(!isMember && !isPending && isFull) || joinMutation.isPending || leaveMutation.isPending}
              className="min-w-[100px]"
            >
              {joinMutation.isPending || leaveMutation.isPending ? (
                'Loading...'
              ) : isPending ? (
                'Pending'
              ) : isMember ? (
                'Leave'
              ) : isFull ? (
                'Full'
              ) : (
                'Join Group'
              )}
            </Button>
          )}

          {isCreator && (
            <Badge variant="secondary" className="text-xs font-semibold">
              Organizer
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
});
