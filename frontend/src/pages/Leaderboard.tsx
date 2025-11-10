import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Medal, Loader2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FeaturedProjectsGridSkeleton } from '@/components/FeaturedProjectsSkeleton';
import { useProjectsLeaderboard, useBuildersLeaderboard } from '@/hooks/useLeaderboard';

type LeaderboardTab = 'projects' | 'builders' | 'featured';

export default function Leaderboard() {
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as LeaderboardTab) || 'projects';
  const [tab, setTab] = useState<LeaderboardTab>(initialTab);
  useEffect(() => {
    const t = (searchParams.get('tab') as LeaderboardTab) || 'projects';
    setTab(t);
  }, [searchParams]);

  const { data: projectsData, isLoading: projectsLoading, error: projectsError } = useProjectsLeaderboard();
  const { data: buildersData, isLoading: buildersLoading, error: buildersError } = useBuildersLeaderboard();

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-6 w-6 text-primary" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Medal className="h-6 w-6 text-amber-600" />;
    return <span className="text-lg font-black text-muted-foreground">{rank}</span>;
  };

  return (
    <div className="min-h-screen overflow-hidden">
      <div className="container mx-auto px-6 py-12 overflow-hidden">
        <div className="mx-auto max-w-5xl w-full box-border">
          {/* Header section */}
          <div className="mb-6 card-elevated p-8">
            <h1 className="text-4xl font-black text-foreground mb-2">Leaderboard</h1>
            <p className="text-base text-muted-foreground">
              Top projects and builders on 0x.ship
            </p>
          </div>

          {/* Tabs and image in one row */}
          <div className="mb-3 flex items-center justify-between gap-4 flex-wrap">
            <Tabs value={tab} onValueChange={(v) => setTab(v as LeaderboardTab)}>
              <TabsList className="inline-flex h-auto rounded-[15px] bg-secondary border-4 border-black p-1">
                <TabsTrigger
                  value="projects"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold transition-quick data-[state=active]:bg-primary data-[state=active]:text-black"
                >
                  Projects
                </TabsTrigger>
                <TabsTrigger
                  value="builders"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold transition-quick data-[state=active]:bg-primary data-[state=active]:text-black"
                >
                  Builders
                </TabsTrigger>
                <TabsTrigger
                  value="featured"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold transition-quick data-[state=active]:bg-primary data-[state=active]:text-black"
                >
                  Featured
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center">
              <img
                src="/assets/leaderboard.gif"
                alt="Leaderboard graphic"
                className="block w-40 sm:w-48 md:w-60 h-auto"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/leaderboard.png'; }}
              />
            </div>
          </div>

          {/* Leaderboard Items */}
          <div className="space-y-4 w-full box-border overflow-hidden">
            {/* Projects Tab */}
            {tab === 'projects' && (
              <>
                {projectsLoading && (
                  <FeaturedProjectsGridSkeleton count={6} />
                )}

                {projectsError && (
                  <div className="card-elevated p-12 text-center">
                    <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <p className="text-lg font-bold text-foreground mb-2">Failed to load leaderboard</p>
                    <p className="text-sm text-muted-foreground">{(projectsError as any)?.message || 'Please try again later'}</p>
                  </div>
                )}

                {!projectsLoading && !projectsError && projectsData && projectsData.length > 0 ? (
                  projectsData.map((item: any) => (
                    <div key={item.rank} className="card-elevated p-6">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center flex-shrink-0">
                          {getRankIcon(item.rank)}
                        </div>
                        <div className="flex-1">
                          <Link to={`/project/${item.id}`} className="text-lg font-black text-primary hover:opacity-80 transition-quick block mb-1">
                            {item.title}
                          </Link>
                          <p className="text-sm text-muted-foreground">by {item.author.username}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-3xl font-black text-primary">{item.score}</div>
                          <div className="text-xs font-bold text-muted-foreground">votes</div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  !projectsLoading && !projectsError && (
                    <div className="card-elevated p-12 text-center">
                      <p className="text-lg font-bold text-foreground">No projects yet</p>
                      <p className="text-sm text-muted-foreground mt-2">Be the first to publish a project!</p>
                    </div>
                  )
                )}
              </>
            )}

            {/* Builders Tab */}
            {tab === 'builders' && (
              <>
                {buildersLoading && (
                  <FeaturedProjectsGridSkeleton count={6} />
                )}

                {buildersError && (
                  <div className="card-elevated p-12 text-center">
                    <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <p className="text-lg font-bold text-foreground mb-2">Failed to load leaderboard</p>
                    <p className="text-sm text-muted-foreground">{(buildersError as any)?.message || 'Please try again later'}</p>
                  </div>
                )}

                {!buildersLoading && !buildersError && buildersData && buildersData.length > 0 ? (
                  buildersData.map((item: any) => (
                    <div key={item.rank} className="card-elevated p-6">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center flex-shrink-0">
                          {getRankIcon(item.rank)}
                        </div>
                        <Avatar className="h-12 w-12 border-3 border-primary flex-shrink-0">
                          <AvatarImage src={item.avatar} alt={item.username} />
                          <AvatarFallback className="bg-primary text-black font-bold text-sm">
                            {item.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <Link to={`/u/${item.username}`} className="text-lg font-black text-primary hover:opacity-80 transition-quick block mb-1">
                            {item.username}
                          </Link>
                          <p className="text-sm text-muted-foreground">{item.projects} projects</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-3xl font-black text-primary">{item.score}</div>
                          <div className="text-xs font-bold text-muted-foreground">karma</div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  !buildersLoading && !buildersError && (
                    <div className="card-elevated p-12 text-center">
                      <p className="text-lg font-bold text-foreground">No builders yet</p>
                      <p className="text-sm text-muted-foreground mt-2">Be the first to join the community!</p>
                    </div>
                  )
                )}
              </>
            )}

            {/* Featured Tab */}
            {tab === 'featured' && (
              <div className="card-elevated p-12 text-center">
                <p className="text-lg font-bold text-foreground">Featured projects coming soon...</p>
                <p className="text-sm text-muted-foreground mt-2">Check back later for featured projects and community picks</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
