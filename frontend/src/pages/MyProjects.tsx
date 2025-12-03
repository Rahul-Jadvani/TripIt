import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Eye, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useUserItineraries, useDeleteItinerary } from '@/hooks/useProjects';
import { ItineraryCard } from '@/components/ItineraryCard';

// Simple skeleton component for loading states
const ProjectCardSkeletonGrid = ({ count = 5 }: { count?: number }) => (
  <div className="grid grid-cols-1 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="h-40 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
    ))}
  </div>
);
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function MyProjects() {
  const { user } = useAuth();
  const { data, isLoading, error } = useUserItineraries(user?.id || '');
  const deleteProjectMutation = useDeleteItinerary();
  const queryClient = useQueryClient();
  const [projectPendingDeletion, setProjectPendingDeletion] = useState<{ id: string; title: string } | null>(null);
  const handleConfirmDelete = async () => {
    if (!projectPendingDeletion) return;
    await deleteProjectMutation.mutateAsync(projectPendingDeletion.id);
    queryClient.invalidateQueries({ queryKey: ['user-projects'] });
    setProjectPendingDeletion(null);
  };

  return (
    <div className="bg-background min-h-screen overflow-hidden">
      <div className="container mx-auto px-6 py-12 overflow-hidden">
        <div className="mx-auto max-w-5xl w-full box-border">
          {/* Header section */}
          <div className="mb-10 card-elevated p-8">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <h1 className="text-4xl font-black text-foreground mb-2">My Itineraries</h1>
                <p className="text-base text-muted-foreground">
                  Manage your published and draft itineraries
                </p>
              </div>
              <Link to="/publish" className="btn-primary inline-flex items-center gap-2 px-4 py-2 flex-shrink-0">
                <Plus className="h-4 w-4" />
                <span>New Itinerary</span>
              </Link>
            </div>
          </div>

          {/* Loading state */}
          {isLoading && (
            <ProjectCardSkeletonGrid count={4} />
          )}

          {/* Error state */}
          {error && (
            <div className="card-elevated p-12 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-lg font-bold text-foreground mb-2">Failed to load itineraries</p>
              <p className="text-sm text-muted-foreground">{(error as any)?.message || 'Please try again later'}</p>
            </div>
          )}

          {/* Projects List */}
          {!isLoading && !error && (
            <div className="space-y-6">
              {data?.data && data.data.length > 0 ? (
                data.data.map((project: any) => (
                  <div key={project.id}>
                    <ItineraryCard project={project} />

                    {/* Action buttons section - separate area below card */}
                    <div className="border-t-2 border-border bg-secondary/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-bold text-muted-foreground">
                          Itinerary Actions
                        </p>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/project/${project.id}`}
                            className="btn-secondary inline-flex items-center gap-2 px-3 py-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Eye className="h-4 w-4" />
                            <span>View</span>
                          </Link>
                          <Link
                            to={`/project/${project.id}/edit`}
                            className="btn-secondary inline-flex items-center gap-2 px-3 py-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Edit className="h-4 w-4" />
                            <span>Edit</span>
                          </Link>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setProjectPendingDeletion({ id: project.id, title: project.title });
                            }}
                            disabled={deleteProjectMutation.isPending}
                            className="btn-secondary inline-flex items-center gap-2 px-3 py-2 text-destructive hover:bg-destructive/10 border-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="card-elevated p-12 text-center">
                  <div className="space-y-4">
                    <p className="text-lg font-bold text-foreground">You haven't published any itineraries yet.</p>
                    <p className="text-sm text-muted-foreground mb-6">Start by creating and publishing your first travel itinerary</p>
                    <Link to="/publish" className="btn-primary inline-flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Publish Your First Itinerary
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(projectPendingDeletion)}
        onOpenChange={(open) => {
          if (!open && !deleteProjectMutation.isPending) {
            setProjectPendingDeletion(null);
          }
        }}
        title={projectPendingDeletion ? `Delete ${projectPendingDeletion.title}?` : 'Delete project?'}
        description="This action cannot be undone. All associated updates and stats will be removed."
        actionLabel="Delete project"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        isLoading={deleteProjectMutation.isPending}
        isDangerous
      />
    </div>
  );
}


