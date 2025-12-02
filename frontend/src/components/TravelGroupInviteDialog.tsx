import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Send, X, CheckCircle, Clock, XCircle, Award } from 'lucide-react';
import { toast } from 'sonner';
import { travelGroupsService, usersService } from '@/services/api';
import { Traveler } from '@/types';

interface TravelGroupInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
}

interface GroupInvite {
  id: string;
  group_id: string;
  traveler_id: string;
  inviter_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  traveler?: Traveler;
}

export function TravelGroupInviteDialog({
  open,
  onOpenChange,
  groupId,
}: TravelGroupInviteDialogProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTraveler, setSelectedTraveler] = useState<Traveler | null>(null);

  // Fetch pending invites
  const { data: invitesData } = useQuery({
    queryKey: ['group-invites', groupId],
    queryFn: async () => {
      const response = await travelGroupsService.getGroupInvites(groupId);
      return response.data.data as GroupInvite[];
    },
    enabled: open,
  });

  const pendingInvites = invitesData?.filter((i) => i.status === 'pending') || [];

  // Search travelers mutation (debounced search would be ideal)
  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      if (!query.trim()) return [];
      const response = await usersService.searchTravelers(query);
      return response.data.data as Traveler[];
    },
  });

  // Send invite mutation
  const inviteMutation = useMutation({
    mutationFn: (travelerId: string) =>
      travelGroupsService.inviteMember(groupId, travelerId),
    onSuccess: () => {
      toast.success('Invite sent successfully');
      queryClient.invalidateQueries({ queryKey: ['group-invites', groupId] });
      queryClient.invalidateQueries({ queryKey: ['travel-group', groupId] });
      setSelectedTraveler(null);
      setSearchQuery('');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to send invite');
    },
  });

  // Cancel invite mutation
  const cancelInviteMutation = useMutation({
    mutationFn: (inviteId: string) =>
      travelGroupsService.cancelInvite(groupId, inviteId),
    onSuccess: () => {
      toast.success('Invite cancelled');
      queryClient.invalidateQueries({ queryKey: ['group-invites', groupId] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to cancel invite');
    },
  });

  const handleSearch = () => {
    if (searchQuery.trim().length < 2) {
      toast.error('Please enter at least 2 characters');
      return;
    }
    searchMutation.mutate(searchQuery);
  };

  const handleSelectTraveler = (traveler: Traveler) => {
    setSelectedTraveler(traveler);
  };

  const handleSendInvite = () => {
    if (!selectedTraveler) {
      toast.error('Please select a traveler');
      return;
    }

    // Check if already invited
    const alreadyInvited = pendingInvites.some(
      (invite) => invite.traveler_id === selectedTraveler.id
    );

    if (alreadyInvited) {
      toast.error('This traveler has already been invited');
      return;
    }

    inviteMutation.mutate(selectedTraveler.id);
  };

  const handleCancelInvite = (inviteId: string) => {
    cancelInviteMutation.mutate(inviteId);
  };

  const searchResults = searchMutation.data || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Invite Members</DialogTitle>
          <DialogDescription>
            Search for travelers by username or email and send them an invite to join your group.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search Section */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by username or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={searchMutation.isPending || searchQuery.trim().length < 2}
              >
                {searchMutation.isPending ? 'Searching...' : 'Search'}
              </Button>
            </div>

            {/* Selected Traveler */}
            {selectedTraveler && (
              <Card className="p-3 bg-primary/5 border-primary/20">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedTraveler.avatar_url} />
                      <AvatarFallback>
                        {selectedTraveler.username?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {selectedTraveler.username}
                      </p>
                      {selectedTraveler.traveler_reputation_score && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Award className="h-3 w-3" />
                          Reputation: {selectedTraveler.traveler_reputation_score}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSendInvite}
                      disabled={inviteMutation.isPending}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      {inviteMutation.isPending ? 'Sending...' : 'Send Invite'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedTraveler(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && !selectedTraveler && (
            <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
              <h4 className="text-sm font-semibold text-foreground">
                Search Results ({searchResults.length})
              </h4>
              <ScrollArea className="flex-1 border rounded-lg">
                <div className="space-y-1 p-2">
                  {searchResults.map((traveler) => {
                    const alreadyInvited = pendingInvites.some(
                      (invite) => invite.traveler_id === traveler.id
                    );

                    return (
                      <Card
                        key={traveler.id}
                        className={`p-3 cursor-pointer transition-colors ${
                          alreadyInvited
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-secondary/50'
                        }`}
                        onClick={() => !alreadyInvited && handleSelectTraveler(traveler)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={traveler.avatar_url} />
                            <AvatarFallback>
                              {traveler.username?.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-foreground truncate">
                                {traveler.username}
                              </p>
                              {alreadyInvited && (
                                <Badge variant="secondary" className="text-xs">
                                  Invited
                                </Badge>
                              )}
                            </div>
                            {traveler.bio && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {traveler.bio}
                              </p>
                            )}
                            {traveler.traveler_reputation_score && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <Award className="h-3 w-3" />
                                Reputation: {traveler.traveler_reputation_score}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* No Results */}
          {searchMutation.isSuccess && searchResults.length === 0 && searchQuery && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No travelers found matching "{searchQuery}"</p>
            </div>
          )}

          <Separator />

          {/* Pending Invites */}
          <div className="space-y-2 flex-shrink-0">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              Pending Invites ({pendingInvites.length})
            </h4>

            {pendingInvites.length === 0 ? (
              <Card className="p-4 text-center text-sm text-muted-foreground">
                No pending invites
              </Card>
            ) : (
              <ScrollArea className="max-h-48">
                <div className="space-y-1">
                  {pendingInvites.map((invite) => (
                    <Card key={invite.id} className="p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={invite.traveler?.avatar_url} />
                            <AvatarFallback>
                              {invite.traveler?.username?.slice(0, 2).toUpperCase() || 'NA'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground truncate">
                              {invite.traveler?.username || 'Unknown'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Invited {new Date(invite.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCancelInvite(invite.id)}
                          disabled={cancelInviteMutation.isPending}
                          className="text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
