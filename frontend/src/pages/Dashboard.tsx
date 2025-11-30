import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Rocket, FileText, ThumbsUp, MessageSquare, Users, Plus, Loader2, AlertCircle, Bookmark } from 'lucide-react';
import { useDashboardStats } from '@/hooks/useStats';
import { DashboardStatsSkeleton, DashboardHeaderSkeleton } from '@/components/DashboardStatsSkeleton';
import { useSavedItineraries } from '@/hooks/useSavedItineraries';
import { ProjectCard } from '@/components/ProjectCard';
import { formatDistanceToNow } from '@/utils/date';

export default function Dashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading, error } = useDashboardStats();
  const { data: savedItinerariesData, isLoading: savedLoading } = useSavedItineraries(1, 10);

  return (
    <div className="bg-background min-h-screen overflow-hidden">
      <div className="container mx-auto px-3 sm:px-6 py-6 sm:py-12 overflow-hidden">
        <div className="mx-auto max-w-6xl w-full box-border">
          {/* Header */}
          {isLoading ? (
            <DashboardHeaderSkeleton />
          ) : (
            <div className="mb-8 sm:mb-10 card-elevated p-4 sm:p-8">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground mb-2">Welcome back, {user?.username}!</h1>
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
                Here's what's happening with your Itineraries
              </p>
            </div>
          )}

          {/* Loading State */}
          {isLoading && <DashboardStatsSkeleton />}

          {/* Error State */}
          {error && (
            <div className="card-elevated p-12 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-lg font-bold text-foreground mb-2">Failed to load dashboard data</p>
              <p className="text-sm text-muted-foreground">{(error as any)?.message || 'Please try again later'}</p>
            </div>
          )}

          {/* Stats Grid */}
          {!isLoading && !error && stats && (
            <div className="mb-8 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 w-full box-border overflow-hidden">
              {/* Total Itineraries */}
              <div className="card-elevated p-4 sm:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-muted-foreground mb-1">Total Itineraries</p>
                    <p className="text-2xl sm:text-3xl font-black text-foreground">{stats.totalItineraries}</p>
                  </div>
                  <div className="badge-primary flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-[10px] flex-shrink-0">
                    <Rocket className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
                  </div>
                </div>
                <Link to="/my-Itineraries" className="text-xs text-primary hover:underline font-bold">
                  View all →
                </Link>
              </div>

              {/* Total Votes */}
              <div className="card-elevated p-4 sm:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-muted-foreground mb-1">Total Upvotes</p>
                    <p className="text-2xl sm:text-3xl font-black text-foreground">{stats.totalVotes}</p>
                  </div>
                  <div className="badge-primary flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-[10px] flex-shrink-0">
                    <ThumbsUp className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">All Itineraries</p>
              </div>

              {/* Comments */}
              <div className="card-elevated p-4 sm:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-muted-foreground mb-1">Total Comments</p>
                    <p className="text-2xl sm:text-3xl font-black text-foreground">{stats.totalComments}</p>
                  </div>
                  <div className="badge-primary flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-[10px] flex-shrink-0">
                    <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Community</p>
              </div>

              {/* Intro Requests */}
              <div className="card-elevated p-4 sm:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-muted-foreground mb-1">Intros</p>
                    <p className="text-2xl sm:text-3xl font-black text-foreground">{stats.introRequests}</p>
                  </div>
                  <div className="badge-primary flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-[10px] flex-shrink-0">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
                  </div>
                </div>
                <Link to="/intros" className="text-xs text-primary hover:underline font-bold">
                  {stats.pendingIntros} pending →
                </Link>
              </div>

              {/* Saved Itineraries */}
              <div className="card-elevated p-4 sm:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-muted-foreground mb-1">Saved</p>
                    <p className="text-2xl sm:text-3xl font-black text-foreground">
                      {savedItinerariesData?.pagination?.total || 0}
                    </p>
                  </div>
                  <div className="badge-primary flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-[10px] flex-shrink-0">
                    <Bookmark className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
                  </div>
                </div>
                <Link to="/dashboard#saved" className="text-xs text-primary hover:underline font-bold">
                  View saved →
                </Link>
              </div>
            </div>
          )}

          {/* Main Content Grid */}
          {!isLoading && !error && stats && (
            <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2 w-full box-border overflow-hidden">
              {/* Quick Actions */}
              <div className="card-elevated p-4 sm:p-6">
                <h2 className="text-xl sm:text-2xl font-black mb-4 text-foreground border-b-4 border-primary pb-3">
                  Quick Actions
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">What would you like to do today?</p>

                <div className="space-y-3">
                  <Link to="/publish" className="btn-primary w-full inline-flex items-center justify-start gap-3 px-4 py-3">
                    <Plus className="h-5 w-5" />
                    <span>Publish New Project</span>
                  </Link>
                  <Link to="/my-Itineraries" className="btn-secondary w-full inline-flex items-center justify-start gap-3 px-4 py-3">
                    <FileText className="h-5 w-5" />
                    <span>Manage My Itineraries</span>
                  </Link>
                  <Link to={`/u/${user?.username}`} className="btn-secondary w-full inline-flex items-center justify-start gap-3 px-4 py-3">
                    <Users className="h-5 w-5" />
                    <span>View My Profile</span>
                  </Link>
                  <a href="#saved" className="btn-secondary w-full inline-flex items-center justify-start gap-3 px-4 py-3">
                    <Bookmark className="h-5 w-5" />
                    <span>View Saved Itineraries</span>
                  </a>
                </div>
              </div>

            </div>
          )}

          {/* Saved Itineraries Section */}
          {!isLoading && !error && (
            <div id="saved" className="mt-8 w-full box-border">
              <div className="card-elevated p-6">
                <h2 className="text-2xl font-black mb-4 text-foreground border-b-4 border-primary pb-3">
                  <Bookmark className="inline h-6 w-6 mr-2 mb-1" />
                  Saved Itineraries
                </h2>
                <p className="text-sm text-muted-foreground mb-6">Itineraries you've bookmarked for later</p>

                {savedLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : savedItinerariesData?.data && savedItinerariesData.data.length > 0 ? (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {savedItinerariesData.data.map((project: any) => (
                      <ProjectCard key={project.id} project={project} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Bookmark className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">No saved Itineraries yet</p>
                    <p className="text-xs text-muted-foreground">
                      Click the bookmark icon on any project card to save it here
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


