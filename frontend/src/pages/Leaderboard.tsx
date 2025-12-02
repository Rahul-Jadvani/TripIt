import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Medal, Loader2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProjectCardSkeletonGrid } from '@/components/ProjectCardSkeleton';
import { useProjectsLeaderboard, useBuildersLeaderboard, useFeaturedLeaderboard } from '@/hooks/useLeaderboard';

type LeaderboardTab = 'itineraries' | 'builders' | 'featured';

export default function Leaderboard() {
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as LeaderboardTab) || 'itineraries';
  const [tab, setTab] = useState<LeaderboardTab>(initialTab);
  useEffect(() => {
    const t = (searchParams.get('tab') as LeaderboardTab) || 'itineraries';
    setTab(t);
  }, [searchParams]);

  const { data: itinerariesData, isLoading: itinerariesLoading, error: itinerariesError } = useProjectsLeaderboard();
  const { data: buildersData, isLoading: buildersLoading, error: buildersError } = useBuildersLeaderboard();
  const { data: featuredData, isLoading: featuredLoading, error: featuredError } = useFeaturedLeaderboard(30);

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
              Top itineraries and builders on Zer0
            </p>
          </div>

          {/* Tabs and image in one row */}
          <div className="mb-3 flex items-center justify-between gap-4 flex-wrap">
            <Tabs value={tab} onValueChange={(v) => setTab(v as LeaderboardTab)}>
              <TabsList className="inline-flex h-auto rounded-[15px] bg-secondary border-4 border-black p-1">
                <TabsTrigger
                  value="Itineraries"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold transition-quick data-[state=active]:bg-primary data-[state=active]:text-black"
                >
                  itineraries
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
            {/* itineraries Tab */}
            {tab === 'itineraries' && (
              <>
                {itinerariesLoading && (
                  <FeaturedItinerariesSkeleton count={6} />
                )}

                {itinerariesError && (
                  <div className="card-elevated p-12 text-center">
                    <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <p className="text-lg font-bold text-foreground mb-2">Failed to load leaderboard</p>
                    <p className="text-sm text-muted-foreground">{(itinerariesError as any)?.message || 'Please try again later'}</p>
                  </div>
                )}

                {!itinerariesLoading && !itinerariesError && itinerariesData && itinerariesData.length > 0 ? (
                  itinerariesData.map((item: any) => (
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
                  !itinerariesLoading && !itinerariesError && (
                    <div className="card-elevated p-12 text-center">
                      <p className="text-lg font-bold text-foreground">No itineraries yet</p>
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
                  <FeaturedItinerariesSkeleton count={6} />
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
                          <p className="text-sm text-muted-foreground">{item.itineraries} itineraries</p>
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
              <>
                {featuredLoading && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <div key={idx} className="card-elevated p-6 h-full animate-pulse">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-10 w-10 rounded-full bg-secondary"></div>
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="h-6 w-32 bg-secondary rounded"></div>
                            <div className="h-3 w-24 bg-secondary rounded"></div>
                          </div>
                        </div>
                        <div className="h-4 w-full bg-secondary rounded mb-2"></div>
                        <div className="h-4 w-5/6 bg-secondary rounded mb-4"></div>
                        <div className="flex items-center gap-3 mt-auto">
                          <div className="h-6 w-20 bg-secondary rounded-full"></div>
                          <div className="ml-auto h-4 w-16 bg-secondary rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {featuredError && (
                  <div className="card-elevated p-12 text-center">
                    <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <p className="text-lg font-bold text-foreground mb-2">Failed to load featured</p>
                    <p className="text-sm text-muted-foreground">{(featuredError as any)?.message || 'Please try again later'}</p>
                  </div>
                )}

                {!featuredLoading && !featuredError && featuredData && featuredData.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {featuredData.map((item: any) => (
                      <div key={item.id} className="card-elevated p-6 h-full flex flex-col">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-10 w-10 rounded-full bg-primary text-black font-black flex items-center justify-center border-2 border-black">
                            #{item.rank}
                          </div>
                          <div className="flex-1 min-w-0">
                            <Link to={`/project/${item.id}`} className="text-lg font-black text-foreground hover:text-primary transition-quick truncate">
                              {item.title}
                            </Link>
                            <p className="text-xs text-muted-foreground truncate">by {item.author?.username || 'Unknown'}</p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{item.tagline || 'Featured on Zer0'}</p>
                        <div className="mt-auto flex items-center gap-3">
                          <div className="px-3 py-1 rounded-full bg-primary text-black font-bold text-xs border border-black">Featured</div>
                          <div className="ml-auto text-xs text-muted-foreground">Score: {item.score}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  !featuredLoading && !featuredError && (
                    <div className="card-elevated p-12 text-center">
                      <p className="text-lg font-bold text-foreground">No featured itineraries yet</p>
                      <p className="text-sm text-muted-foreground mt-2">Feature itineraries from the admin panel to show them here.</p>
                    </div>
                  )
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


