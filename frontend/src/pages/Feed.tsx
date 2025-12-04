import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
// Lazy load heavy carousels (named exports -> map to default)
const TopRatedCarousel = lazy(() =>
  import('@/components/TopRatedCarousel').then((m) => ({ default: m.TopRatedCarousel }))
);
// Simple skeleton components for loading states
const ProjectCardSkeletonGrid = ({ count = 5 }: { count?: number }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
    ))}
  </div>
);

const TopRatedCarouselSkeleton = () => (
  <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
);
import { Flame, Clock, TrendingUp, Zap, Sparkles, MessageCircle, Shield } from 'lucide-react';
import { useItineraries, transformProject } from '@/hooks/useProjects';
import { useBuildersLeaderboard } from '@/hooks/useLeaderboard';
import { usePublicInvestors } from '@/hooks/useInvestors';
import { useDashboardStats } from '@/hooks/useStats';
import { useMostRequestedProjects, useRecentConnections, useFeaturedProjects, useRisingStars, useCategoryProjects } from '@/hooks/useFeed';
import { useAuth } from '@/context/AuthContext';
import { itinerariesService } from '@/services/api';
import { Itinerary } from '@/types';
import { FeedMiniThread } from '@/components/FeedMiniThread';
import { FeedLeaderTagCard } from '@/components/FeedLeaderTagCard';
// import { FeedTopInvestorCard } from '@/components/FeedTopInvestorCard';
// import { FeedTopInvestorsGrid } from '@/components/FeedTopInvestorsGrid';
import FeedStatCards from '@/components/FeedStatCards';
// import GlobeDemo from '@/components/ui/globe-demo';

// Render children only when visible in viewport; shows placeholder until then
function LazyOnVisible({
  children,
  placeholder,
  rootMargin = '200px',
}: {
  children: React.ReactNode;
  placeholder: React.ReactNode;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current || visible) return;
    const el = ref.current;
    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { root: null, rootMargin, threshold: 0.01 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visible]);

  return <div ref={ref}>{visible ? children : placeholder}</div>;
}

export default function Feed() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // PROGRESSIVE LOADING: Load trending & top-rated first (priority), newest loads immediately after
  const { data: hotData, isLoading: hotLoading } = useItineraries('trending', 1);
  const { data: topData, isLoading: topLoading } = useItineraries('top-rated', 1);
  const { data: newData, isLoading: newLoading } = useItineraries('newest', 1);
  const { data: topBuilders = [] } = useBuildersLeaderboard(8);
  const { data: buildersForCount = [] } = useBuildersLeaderboard(50);
  const { data: investors = [] } = usePublicInvestors();
  // Only load dashboard stats if user is authenticated (prevents 401 errors for guests)
  const { data: dashboard } = useDashboardStats(!!user);
  // Load feed-specific data (cached for 1 hour on backend)
  const { data: mostRequestedData } = useMostRequestedProjects(30);
  const { data: recentConnectionsData } = useRecentConnections(30);
  const { data: featuredData } = useFeaturedProjects(30);
  const { data: risingStarsData } = useRisingStars(30);

  // Travel-specific sections - fetch multiple pages to get more itineraries
  const { data: page2Data } = useItineraries('trending', 2);
  const { data: page3Data } = useItineraries('trending', 3);
  const { data: page4Data } = useItineraries('top-rated', 2);
  const { data: page5Data } = useItineraries('newest', 2);

  const investorsHref = user ? '/investor-directory' : '/investors';

  // Normalize investors to an array defensively
  const investorsList: any[] = Array.isArray(investors)
    ? investors
    : (investors && Array.isArray((investors as any).investors)
        ? (investors as any).investors
        : []);

  // Prefetch additional pages on-demand when user scrolls (lazy prefetch)
  // Pages 2-3 are already prefetched by usePrefetch hook in idle time, so we only prefetch deeper pages here
  useEffect(() => {
    // Only prefetch page 3 on-demand to avoid duplicate work with usePrefetch
    if (!hotLoading && !topLoading) {
      const prefetchDeepPages = async () => {
        // Prefetch page 3 only (page 2 handled by usePrefetch idle batch)
        for (const sort of ['trending', 'top-rated', 'newest']) {
          queryClient.prefetchQuery({
            queryKey: ['itineraries', sort, 3],
            queryFn: async () => {
              const response = await itinerariesService.getAll(sort, 3);
              return {
                ...response.data,
                data: response.data.data?.map(transformProject) || [],
              };
            },
            staleTime: 1000 * 60 * 5,
          });
        }
      };

      // Schedule this for idle time to avoid competing with critical prefetch
      const scheduleIdle = (cb: () => void) => {
        const win: any = typeof window !== 'undefined' ? window : undefined;
        if (win && typeof win.requestIdleCallback === 'function') {
          win.requestIdleCallback(cb, { timeout: 5000 });
        } else {
          setTimeout(cb, 2000); // Delay on older browsers
        }
      };

      scheduleIdle(prefetchDeepPages);
    }
  }, [hotLoading, topLoading, queryClient]);

  // Progressive loading: Show page when trending & top-rated are loaded
  const isLoading = hotLoading || topLoading;

  // Categorize itineraries by activity tags
  const categorizedProjects = useMemo(() => {
    // Combine all data sources
    const allItineraries = [
      ...(hotData?.data || []),
      ...(topData?.data || []),
      ...(newData?.data || []),
      ...(page2Data?.data || []),
      ...(page3Data?.data || []),
      ...(page4Data?.data || []),
      ...(page5Data?.data || []),
      ...(featuredData?.data || []),
      ...(risingStarsData?.data || []),
    ];

    // Remove duplicates
    const uniqueMap = new Map();
    allItineraries.forEach(item => {
      if (item && item.id && !uniqueMap.has(item.id)) {
        uniqueMap.set(item.id, item);
      }
    });
    const unique = Array.from(uniqueMap.values());

    // Categorize by activity tags
    const adventure = unique.filter((p: any) =>
      p.activity_tags?.some((tag: string) =>
        ['Trekking', 'Hiking', 'Mountain', 'Climbing', 'Camping'].some(keyword =>
          tag.includes(keyword)
        )
      )
    );

    const beach = unique.filter((p: any) =>
      p.activity_tags?.some((tag: string) =>
        ['Beach', 'Scuba', 'Snorkeling', 'Surfing', 'Water Sports'].some(keyword =>
          tag.includes(keyword)
        )
      )
    );

    const cultural = unique.filter((p: any) =>
      p.activity_tags?.some((tag: string) =>
        ['Culture', 'Heritage', 'Temple', 'Museum', 'Festival'].some(keyword =>
          tag.includes(keyword)
        )
      )
    );

    const digitalNomad = unique.filter((p: any) =>
      p.activity_tags?.some((tag: string) =>
        tag.includes('Digital Nomad') || tag.includes('Remote Work')
      )
    );

    const womenSafe = unique.filter((p: any) => p.women_safe_certified === true);

    return {
      hot: (hotData?.data || []).slice(0, 30),
      topScored: (topData?.data || []).slice(0, 30),
      featured: (featuredData?.data || []).slice(0, 30),
      risingStars: (risingStarsData?.data || []).slice(0, 30),
      newLaunches: (newData?.data || []).slice(0, 30),
      adventure: adventure.slice(0, 30),
      beach: beach.slice(0, 30),
      cultural: cultural.slice(0, 30),
      digitalNomad: digitalNomad.slice(0, 30),
      womenSafe: womenSafe.slice(0, 30),
      mostRequested: (mostRequestedData?.data || []).slice(0, 30),
    };
  }, [hotData, topData, newData, page2Data, page3Data, page4Data, page5Data, mostRequestedData, featuredData, risingStarsData]);

  // Merge all feed projects once to power stats + tag leader without duplicates
  const visibleFeedProjects = useMemo(() => {
    const unique = new Map<string, Itinerary>();
    const addProjects = (projects?: Itinerary[]) => {
      if (!projects) return;
      for (const project of projects) {
        if (!project?.id || unique.has(project.id)) continue;
        unique.set(project.id, project);
      }
    };
    // Include all sections for total count
    addProjects(hotData?.data);
    addProjects(topData?.data);
    addProjects(newData?.data);
    addProjects(page2Data?.data);
    addProjects(page3Data?.data);
    addProjects(page4Data?.data);
    addProjects(page5Data?.data);
    addProjects(featuredData?.data);
    addProjects(risingStarsData?.data);
    addProjects(mostRequestedData?.data);
    return Array.from(unique.values());
  }, [hotData?.data, topData?.data, newData?.data, page2Data?.data, page3Data?.data, page4Data?.data, page5Data?.data, featuredData?.data, risingStarsData?.data, mostRequestedData?.data]);

  // Compute leading tag from activity_tags (travel-focused)
  const leader = useMemo(() => {
    const all = visibleFeedProjects;
    const buckets: Record<string, number> = {};
    const push = (key: string) => {
      if (!key) return;
      buckets[key] = (buckets[key] || 0) + 1;
    };

    // Count activity tags from all itineraries
    for (const p of all) {
      if (Array.isArray((p as any).activity_tags) && (p as any).activity_tags.length) {
        for (const tag of (p as any).activity_tags as string[]) {
          push(tag);
        }
      }
    }

    // Find most common tag
    let label = 'Travel';
    let count = 0;
    for (const [k, v] of Object.entries(buckets)) {
      if (v > count) { label = k; count = v; }
    }

    const total = Object.values(buckets).reduce((a, b) => a + b, 0) || 1;
    const percent = (count / total) * 100;

    // Map tag to icon category
    const iconKey = label.toLowerCase().includes('trek') || label.toLowerCase().includes('mountain')
      ? 'adventure'
      : label.toLowerCase().includes('beach') || label.toLowerCase().includes('water')
        ? 'beach'
        : label.toLowerCase().includes('cultur') || label.toLowerCase().includes('herit')
          ? 'cultural'
          : label.toLowerCase().includes('nomad') || label.toLowerCase().includes('remote')
            ? 'digital'
            : label.toLowerCase().includes('photo')
              ? 'photography'
              : 'other';

    return { label, count, percent, icon: iconKey as any };
  }, [visibleFeedProjects]);

  // Removed old filter functions - now using real category-based data from backend

  return (
    <div className="min-h-screen overflow-hidden bg-gradient-to-b from-background via-background to-background/80">
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 overflow-hidden max-w-7xl relative">
        {/* Hero Header - Travel Focused */}
        <div className="mb-12 sm:mb-16">
          <div className="relative card-elevated p-6 sm:p-8 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-900/20 via-card to-accent/10 border border-primary/20">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-96 h-96 bg-primary rounded-full mix-blend-multiply filter blur-3xl"></div>
            </div>
            <div className="flex items-start gap-4 mb-4 relative z-10">
              <div className="badge-primary flex items-center justify-center h-12 w-12 flex-shrink-0 rounded-[15px] shadow-lg">
                <Sparkles className="h-6 w-6 text-black font-bold" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl sm:text-4xl font-black text-foreground mb-2">
                  Plan Your Perfect Adventure
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
                  Discover safety-verified itineraries from trusted travelers. Find your next journey, join fellow adventurers, and explore the world with confidence.
                </p>
                <div className="flex flex-wrap gap-3 mt-4">
                  <button className="badge badge-primary text-xs font-bold px-3 py-1.5">Plan This Trip</button>
                  <button className="badge badge-secondary text-xs font-bold px-3 py-1.5">Find Companions</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Carousels Section */}
        {isLoading ? (
          <div className="space-y-12 sm:space-y-16 pb-12">
            {/* Quick Section Nav Skeleton */}
            <nav className="feed-quick-nav -mt-6 animate-pulse">
              <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="h-8 w-24 bg-secondary rounded-full flex-shrink-0"></div>
                ))}
              </div>
            </nav>

            {/* Top Rated Carousel Skeleton */}
            <div className="flex justify-center">
              <div className="w-full sm:w-[760px] h-[380px]">
                <TopRatedCarouselSkeleton />
              </div>
            </div>

            {/* Stats + Leader skeleton */}
            <section>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-pulse">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="card-elevated p-6 space-y-3">
                    <div className="h-4 w-20 bg-secondary rounded"></div>
                    <div className="h-10 w-16 bg-secondary rounded"></div>
                    <div className="h-3 w-24 bg-secondary rounded"></div>
                  </div>
                ))}
              </div>

              {/* Leader Tag Card Skeleton */}
              <div className="flex justify-center animate-pulse">
                <div className="card-elevated p-6 w-full sm:w-[400px] h-[140px]">
                  <div className="space-y-3">
                    <div className="h-5 w-32 bg-secondary rounded"></div>
                    <div className="h-8 w-24 bg-secondary rounded"></div>
                    <div className="h-4 w-40 bg-secondary rounded"></div>
                  </div>
                </div>
              </div>
            </section>

            {/* Mini threads skeleton - first set */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
              {Array.from({ length: 2 }).map((_, idx) => (
                <div key={idx} className="card-elevated p-5 h-[100px] space-y-2">
                  <div className="h-5 w-40 bg-secondary rounded"></div>
                  <div className="h-4 w-full bg-secondary rounded"></div>
                  <div className="h-3 w-32 bg-secondary rounded"></div>
                </div>
              ))}
            </div>

            {/* Carousel skeletons - Trending */}
            <ProjectCardSkeletonGrid count={5} />

            {/* Mini threads skeleton - second set */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
              {Array.from({ length: 2 }).map((_, idx) => (
                <div key={idx} className="card-elevated p-5 h-[100px] space-y-2">
                  <div className="h-5 w-40 bg-secondary rounded"></div>
                  <div className="h-4 w-full bg-secondary rounded"></div>
                  <div className="h-3 w-32 bg-secondary rounded"></div>
                </div>
              ))}
            </div>

            {/* More carousels - Featured, Rising Stars, New Launches, etc */}
            <ProjectCardSkeletonGrid count={5} />
            <ProjectCardSkeletonGrid count={5} />
            <ProjectCardSkeletonGrid count={5} />

            {/* Hero Thread skeleton */}
            <div className="card-elevated p-5 h-[100px] animate-pulse space-y-2">
              <div className="h-5 w-40 bg-secondary rounded"></div>
              <div className="h-4 w-full bg-secondary rounded"></div>
              <div className="h-3 w-32 bg-secondary rounded"></div>
            </div>

            {/* More carousels */}
            <ProjectCardSkeletonGrid count={5} />
            <ProjectCardSkeletonGrid count={5} />
            <ProjectCardSkeletonGrid count={5} />
            <ProjectCardSkeletonGrid count={5} />
          </div>
        ) : (
          <div className="space-y-12 sm:space-y-16 pb-12">
            {/* Quick Section Nav - Travel Focused */}
            <nav aria-label="Quick sections" className="feed-quick-nav -mt-6">
              <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
                <a href="#top-rated" className="badge badge-dash badge-primary hover:opacity-90">Highest-Rated ({categorizedProjects.topScored.length})</a>
                {categorizedProjects.featured.length > 0 && <a href="#women-safe" className="badge badge-dash badge-accent hover:opacity-90">Women-Safe ({categorizedProjects.featured.length})</a>}
                <a href="#trending" className="badge badge-dash badge-secondary hover:opacity-90">Trending Destinations ({categorizedProjects.hot.length})</a>
                {categorizedProjects.risingStars.length > 0 && <a href="#hidden-gems" className="badge badge-dash badge-secondary hover:opacity-90">Hidden Gems ({categorizedProjects.risingStars.length})</a>}
                <a href="#new-launches" className="badge badge-dash badge-secondary hover:opacity-90">Latest Adventures ({categorizedProjects.newLaunches.length})</a>
              </div>
            </nav>
            {/* Highest-Rated Journeys Carousel */}
            {categorizedProjects.topScored.length > 0 && (
              <section id="top-rated" className="scroll-mt-24">
                <div className="mb-4">
                  <h2 className="text-2xl font-black text-foreground flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-primary" />
                    Highest-Rated Journeys
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">Most trusted experiences from verified travelers</p>
                </div>
                <LazyOnVisible placeholder={
                  <div className="flex justify-center">
                    <div className="w-full sm:w-[760px] h-[380px]">
                      <TopRatedCarouselSkeleton />
                    </div>
                  </div>
                }>
                  <Suspense fallback={
                    <div className="flex justify-center">
                      <div className="w-full sm:w-[760px] h-[380px]">
                        <TopRatedCarouselSkeleton />
                      </div>
                    </div>
                  }>
                    <TopRatedCarousel
                      projects={categorizedProjects.topScored}
                      categoryName="top-rated"
                    />
                  </Suspense>
                </LazyOnVisible>
              </section>
            )}

            {/* Stats + Illustration */}
            <section className="mt-2">
              <FeedStatCards
                projectsCount={visibleFeedProjects.length}
                buildersCount={(buildersForCount?.length || topBuilders?.length || 0)}
              />
              <div className="relative mt-6">
                <img
                  src="/assets/feed.png"
                  alt="Feed Overview"
                  className="hidden lg:block h-52 xl:h-64 2xl:h-72 select-none absolute left-0 bottom-0 translate-y-14"
                  loading="lazy"
                />
                <div className="flex justify-center">
                  <FeedLeaderTagCard label={leader.label} count={leader.count} percent={leader.percent} icon={leader.icon} />
                </div>
              </div>
            </section>

            

            {/* Mini-threads: quick bites between sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topBuilders[0] && (
                <FeedMiniThread
                  title={`Top Travel Creator: @${topBuilders[0].username}`}
                  subtitle={`${topBuilders[0].projects} itineraries • ${topBuilders[0].score} caravan score`}
                  href={`/u/${topBuilders[0].username}`}
                  badge="Featured"
                />
              )}
              {hotData?.data?.[0] && (
                <FeedMiniThread
                  title={`Hot Project: ${hotData.data[0].title}`}
                  subtitle={hotData.data[0].tagline}
                  href={`/project/${hotData.data[0].id}`}
                  badge="Trending"
                />
              )}
            </div>

            {/* Trending Destinations Carousel */}
            {categorizedProjects.hot.length > 0 && (
              <section id="trending" className="carousel-cinema scroll-mt-24">
                <div className="mb-4">
                  <h2 className="text-2xl font-black text-foreground flex items-center gap-2">
                    <TrendingUp className="h-6 w-6 text-accent" />
                    Trending Destinations
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">Popular adventures gaining momentum this week</p>
                </div>
                <LazyOnVisible placeholder={<ProjectCardSkeletonGrid count={5} />}>
                  <Suspense fallback={<ProjectCardSkeletonGrid count={5} />}>
                    <TopRatedCarousel projects={categorizedProjects.hot} categoryName="trending" />
                  </Suspense>
                </LazyOnVisible>
              </section>
            )}

            {/* Thread card between sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topBuilders[0] && (
                <FeedMiniThread
                  title={`@${topBuilders[0].username}`}
                  subtitle={`${topBuilders[0].projects} itineraries • ${topBuilders[0].score} caravan score`}
                  href={`/u/${topBuilders[0].username}`}
                  badge="Top Travel Creator"
                />
              )}
              {investorsList[0] && investorsList[0].user?.username && (
                <FeedMiniThread
                  title={`${investorsList[0].user.display_name || investorsList[0].user.username}`}
                  subtitle={(investorsList[0].industries || []).slice(0,2).join(', ')}
                  href={`/u/${investorsList[0].user.username}`}
                  badge="Open Investor"
                />
              )}
            </div>

            {/* Women-Safe Certified Carousel */}
            {categorizedProjects.womenSafe.length > 0 && (
              <section id="women-safe-featured" className="carousel-cinema scroll-mt-24">
                <div className="mb-4">
                  <h2 className="text-2xl font-black text-foreground flex items-center gap-2">
                    <Shield className="h-6 w-6 text-accent" />
                    Women-Safe Certified
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">Itineraries verified as women-safe and well-documented</p>
                </div>
                <LazyOnVisible placeholder={<ProjectCardSkeletonGrid count={5} />}>
                  <Suspense fallback={<ProjectCardSkeletonGrid count={5} />}>
                    <TopRatedCarousel projects={categorizedProjects.womenSafe} categoryName="women-safe" />
                  </Suspense>
                </LazyOnVisible>
              </section>
            )}

            {/* Hidden Gems Carousel - Off-the-beaten-path adventures */}
            {categorizedProjects.risingStars.length > 0 && (
              <section id="hidden-gems" className="carousel-cinema scroll-mt-24">
                <div className="mb-4">
                  <h2 className="text-2xl font-black text-foreground flex items-center gap-2">
                    <Flame className="h-6 w-6 text-orange-500" />
                    Hidden Gems
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">Discover lesser-known adventures with growing interest</p>
                </div>
                <LazyOnVisible placeholder={<ProjectCardSkeletonGrid count={5} />}>
                  <Suspense fallback={<ProjectCardSkeletonGrid count={5} />}>
                    <TopRatedCarousel projects={categorizedProjects.risingStars} categoryName="rising-stars" />
                  </Suspense>
                </LazyOnVisible>
              </section>
            )}

            {/* Latest Adventures Carousel */}
            {categorizedProjects.newLaunches.length > 0 && (
              <section id="new-launches" className="carousel-cinema scroll-mt-24">
                <div className="mb-4">
                  <h2 className="text-2xl font-black text-foreground flex items-center gap-2">
                    <Clock className="h-6 w-6 text-primary" />
                    Latest Adventures
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">Recently shared itineraries from the caravan</p>
                </div>
                <LazyOnVisible placeholder={<ProjectCardSkeletonGrid count={5} />}>
                  <Suspense fallback={<ProjectCardSkeletonGrid count={5} />}>
                    <TopRatedCarousel projects={categorizedProjects.newLaunches} categoryName="newest" />
                  </Suspense>
                </LazyOnVisible>
              </section>
            )}

            {/* Adventure & Trekking Itineraries */}
            {categorizedProjects.adventure.length > 0 && (
              <section id="adventure" className="carousel-cinema scroll-mt-24">
                <div className="mb-4">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <TrendingUp className="h-6 w-6 text-primary" />
                    Adventure & Trekking
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">Epic mountain adventures and challenging treks</p>
                </div>
                <LazyOnVisible placeholder={<ProjectCardSkeletonGrid count={5} />}>
                  <Suspense fallback={<ProjectCardSkeletonGrid count={5} />}>
                    <TopRatedCarousel projects={categorizedProjects.adventure} categoryName="adventure" />
                  </Suspense>
                </LazyOnVisible>
              </section>
            )}

            {/* Beach & Coastal Trips */}
            {categorizedProjects.beach.length > 0 && (
              <section id="beach" className="carousel-cinema scroll-mt-24">
                <div className="mb-4">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-primary" />
                    Beach & Coastal
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">Relaxing beach getaways and water adventures</p>
                </div>
                <LazyOnVisible placeholder={<ProjectCardSkeletonGrid count={5} />}>
                  <Suspense fallback={<ProjectCardSkeletonGrid count={5} />}>
                    <TopRatedCarousel projects={categorizedProjects.beach} categoryName="beach" />
                  </Suspense>
                </LazyOnVisible>
              </section>
            )}

            {/* Cultural & Heritage */}
            {categorizedProjects.cultural.length > 0 && (
              <section id="cultural" className="carousel-cinema scroll-mt-24">
                <div className="mb-4">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Zap className="h-6 w-6 text-primary" />
                    Cultural & Heritage
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">Immersive cultural experiences and historical sites</p>
                </div>
                <LazyOnVisible placeholder={<ProjectCardSkeletonGrid count={5} />}>
                  <Suspense fallback={<ProjectCardSkeletonGrid count={5} />}>
                    <TopRatedCarousel projects={categorizedProjects.cultural} categoryName="cultural" />
                  </Suspense>
                </LazyOnVisible>
              </section>
            )}

            {/* Digital Nomad Destinations */}
            {categorizedProjects.digitalNomad.length > 0 && (
              <section id="digital-nomad" className="carousel-cinema scroll-mt-24">
                <div className="mb-4">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Flame className="h-6 w-6 text-primary" />
                    Digital Nomad Hotspots
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">Work + travel destinations for remote workers</p>
                </div>
                <LazyOnVisible placeholder={<ProjectCardSkeletonGrid count={5} />}>
                  <Suspense fallback={<ProjectCardSkeletonGrid count={5} />}>
                    <TopRatedCarousel projects={categorizedProjects.digitalNomad} categoryName="digital-nomad" />
                  </Suspense>
                </LazyOnVisible>
              </section>
            )}

            {/* Women-Safe Certified */}
            {categorizedProjects.womenSafe.length > 0 && (
              <section id="women-safe" className="carousel-cinema scroll-mt-24">
                <div className="mb-4">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Shield className="h-6 w-6 text-primary" />
                    Women-Safe Certified
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">Verified safe itineraries for women travelers</p>
                </div>
                <LazyOnVisible placeholder={<ProjectCardSkeletonGrid count={5} />}>
                  <Suspense fallback={<ProjectCardSkeletonGrid count={5} />}>
                    <TopRatedCarousel projects={categorizedProjects.womenSafe} categoryName="women-safe" />
                  </Suspense>
                </LazyOnVisible>
              </section>
            )}

            {/* Another mini-thread */}
            {dashboard?.recentIntros?.length ? (
              <FeedMiniThread
                title={`New intro: ${(dashboard.recentIntros[0].investor?.display_name || dashboard.recentIntros[0].investor?.username) ?? 'Investor'} → ${(dashboard.recentIntros[0].builder?.display_name || dashboard.recentIntros[0].builder?.username) ?? 'Builder'}`}
                subtitle={dashboard.recentIntros[0].project?.title ? `on “${dashboard.recentIntros[0].project.title}”` : undefined}
                href={dashboard.recentIntros[0].project?.id ? `/project/${dashboard.recentIntros[0].project.id}` : undefined}
                badge="Connection"
              />
            ) : null}

            {/* Most Requested Intros Carousel */}
            {categorizedProjects.mostRequested.length > 0 && (
              <section id="most-requested" className="carousel-cinema scroll-mt-24">
                <LazyOnVisible placeholder={<ProjectCardSkeletonGrid count={5} />}>
                  <Suspense fallback={<ProjectCardSkeletonGrid count={5} />}>
                  </Suspense>
                </LazyOnVisible>
              </section>
            )}

            {/* Removed Top Investor card per request */}

            {/* Community Highlights: Top Travel Creators, Open Investors, Recent Connections */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top Travel Creators */}
              <div className="card-elevated p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-black">Top Travel Creators</h3>
                </div>
                <div className="space-y-3">
                  {topBuilders.slice(0,6).map((b: any, i: number) => (
                    <a key={b.id || i} href={`/u/${b.username}`} className="flex items-center gap-3 hover:opacity-90">
                      <div className="h-9 w-9 rounded-full bg-primary/20 border-2 border-black flex items-center justify-center text-xs font-black text-black">{i+1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground truncate">{b.username}</p>
                        <p className="text-xs text-muted-foreground truncate">{b.projects} itineraries • {b.score} score</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              {/* Open Investors */
              }
              <div className="card-elevated p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-black">Open Investors</h3>
                  <a href={investorsHref} className="badge badge-dash badge-primary hover:opacity-90">All</a>
                </div>
                <div className="space-y-2">
                  {investorsList.filter((i: any) => i.open_to_requests).slice(0,6).map((inv: any, idx: number) => (
                    <a key={inv.id || idx} href={`/u/${inv.user?.username}`} className="flex items-center gap-3 hover:opacity-90">
                      <div className="h-8 w-8 rounded-full bg-secondary border-2 border-black flex items-center justify-center text-xs font-black">{(inv.user?.username||'?')[0]?.toUpperCase() || '?'}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground truncate">{inv.user?.display_name || inv.user?.username}</p>
                        <p className="text-xs text-muted-foreground truncate">{(inv.industries||[]).slice(0,2).join(', ') || 'Investor'}</p>
                      </div>
                      <span className="badge badge-primary">Open</span>
                    </a>
                  ))}
                  {investorsList.filter((i:any)=>i.open_to_requests).length===0 && (
                    <p className="text-sm text-muted-foreground">No investors open to requests right now.</p>
                  )}
                </div>
              </div>

              {/* Recent Connections - NOW USING REAL DATA */}
              <div className="card-elevated p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-black">Recent Connections</h3>
                </div>
                <div className="space-y-3">
                  {recentConnectionsData?.data?.length ? (
                    (recentConnectionsData.data as any[]).slice(0,6).map((conn: any) => (
                      <a key={conn.id} href={`/project/${conn.project?.id}`} className="flex items-center gap-3 hover:opacity-90">
                        <div className="h-8 w-8 rounded-[10px] bg-primary/20 border-2 border-black flex items-center justify-center text-xs font-black">↗</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate"><span className="font-bold">{conn.investor?.display_name || conn.investor?.username}</span> connected with <span className="font-bold">{conn.builder?.display_name || conn.builder?.username}</span></p>
                          {conn.project?.title && (
                            <p className="text-xs text-muted-foreground truncate">on "{conn.project.title}"</p>
                          )}
                        </div>
                      </a>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No recent connections yet.</p>
                  )}
                </div>
              </div>
            </section>

            {/* Empty State */}
            {Object.values(categorizedProjects).every(cat => cat.length === 0) && (
              <div className="card-elevated py-20 text-center p-8 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20">
                <div className="space-y-4">
                  <div className="text-6xl">✈️</div>
                  <p className="text-2xl font-black text-foreground">Ready for your next adventure?</p>
                  <p className="text-base text-muted-foreground mb-6">
                    No itineraries yet. Be the first to share your travel journey with our caravan!
                  </p>
                  <button className="badge badge-primary text-sm font-bold px-6 py-2 hover:opacity-90">
                    Share Your Itinerary
                  </button>
                </div>
              </div>
            )}

            {/* Globe section removed per request */}
          </div>
        )}
      </div>
    </div>
  );
}

