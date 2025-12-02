import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useUserProjects } from '@/hooks/useProjects';
import { useAddItineraryToCommunity } from '@/hooks/useCommunities';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, CheckCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { formatScore, getProjectScore } from '@/utils/score';

interface AddItineraryToCommunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communitySlug: string;
  communityName: string;
  requiresApproval: boolean;
}

export function AddItineraryToCommunityDialog({
  open,
  onOpenChange,
  communitySlug,
  communityName,
  requiresApproval,
}: AddItineraryToCommunityDialogProps) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const { data: projectsData, isLoading: projectsLoading } = useUserProjects(user?.id || '');
  const addProjectMutation = useAddItineraryToCommunity();

  const projects = projectsData?.data || [];
  const filteredProjects = projects.filter((project) =>
    project.title.toLowerCase().includes(search.toLowerCase())
  );

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const handleAdd = async () => {
    if (!selectedProjectId) {
      toast.error('Please select a project');
      return;
    }

    try {
      await addProjectMutation.mutateAsync({
        slug: communitySlug,
        itineraryId: selectedProjectId,
        message: message.trim() || undefined,
      });

      if (requiresApproval) {
        toast.success('Request submitted for approval!');
      } else {
        toast.success('Itinerary added to community!');
      }

      onOpenChange(false);
      setSelectedProjectId(null);
      setMessage('');
      setSearch('');
    } catch (error: any) {
      console.error('Add project error:', error);
      // Error handling is done in the mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Itinerary to {communityName}</DialogTitle>
          <DialogDescription>
            {requiresApproval
              ? 'Select one of your published itineraries to submit for approval'
              : 'Select one of your published itineraries to add to this community'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-hidden flex flex-col">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search your projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Projects List */}
          <ScrollArea className="flex-1 h-[300px]">
            {projectsLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {search
                    ? 'No projects found matching your search'
                    : 'You have no published projects yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-3 pr-4">
                {filteredProjects.map((project) => (
                  <Card
                    key={project.id}
                    className={`p-4 cursor-pointer transition-all ${
                      selectedProjectId === project.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedProjectId(project.id)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Selection Indicator */}
                      <div className="flex-shrink-0 mt-1">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedProjectId === project.id
                              ? 'border-primary bg-primary'
                              : 'border-muted-foreground'
                          }`}
                        >
                          {selectedProjectId === project.id && (
                            <CheckCircle className="h-4 w-4 text-white" />
                          )}
                        </div>
                      </div>

                      {/* Project Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-base truncate">{project.title}</h4>
                          {project.isFeatured && (
                            <Badge variant="default" className="flex-shrink-0">
                              Featured
                            </Badge>
                          )}
                        </div>
                        {project.tagline && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {project.tagline}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Score: {formatScore(getProjectScore(project))}</span>
                          <span>{project.voteCount} votes</span>
                          <span>{project.commentCount} comments</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Message (optional, shown when a project is selected) */}
          {selectedProjectId && (
            <div className="space-y-2">
              <Label htmlFor="message">
                Message {requiresApproval ? '(Optional)' : '(Optional)'}
              </Label>
              <Textarea
                id="message"
                placeholder={
                  requiresApproval
                    ? 'Add a message for the chain owner (optional)'
                    : 'Add a note about why this project fits this chain (optional)'
                }
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!selectedProjectId || addProjectMutation.isPending}
          >
            {addProjectMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {requiresApproval ? 'Submitting...' : 'Adding...'}
              </>
            ) : requiresApproval ? (
              'Submit for Approval'
            ) : (
              'Add to Community'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
