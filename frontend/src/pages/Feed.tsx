import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
// Lazy load heavy carousels (named exports -> map to default)
const ProjectCarousel = lazy(() =>
  import('@/components/ProjectCarousel').then((m) => ({ default: m.ProjectCarousel }))
);
const TopRatedCarousel = lazy(() =>
  import('@/components/TopRatedCarousel').then((m) => ({ default: m.TopRatedCarousel }))
);
import { ProjectCardSkeletonGrid, TopRatedCarouselSkeleton } from '@/components/ProjectCardSkeleton';
import { Flame, Clock, TrendingUp, Zap, Sparkles, MessageCircle } from 'lucide-react';
import { useProjects, transformProject } from '@/hooks/useProjects';
import { useBuildersLeaderboard } from '@/hooks/useLeaderboard';
import { usePublicInvestors } from '@/hooks/useInvestors';
import { useDashboardStats } from '@/hooks/useStats';
import { useMostRequestedProjects, useRecentConnections, useFeaturedProjects, useRisingStars, useCategoryProjects } from '@/hooks/useFeed';
import { useAuth } from '@/context/AuthContext';
import { projectsService } from '@/services/api';
import { Project } from '@/types';
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
  const { data: hotData, isLoading: hotLoading } = useProjects('trending', 1);
  const { data: topData, isLoading: topLoading } = useProjects('top-rated', 1);
  const { data: newData, isLoading: newLoading } = useProjects('newest', 1);
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

  // Dynamic category sections - you can add more categories here
  const { data: defiData } = useCategoryProjects('DeFi', 30);
  const { data: aiData } = useCategoryProjects('AI/ML', 30);
  const { data: gamingData } = useCategoryProjects('Gaming', 30);
  const { data: saasData } = useCategoryProjects('SaaS', 30);

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
            queryKey: ['projects', sort, 3],
            queryFn: async () => {
              const response = await projectsService.getAll(sort, 3);
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

  // Categorize projects
  const categorizedProjects = useMemo(() => {
    return {
      hot: (hotData?.data || []).slice(0, 30),
      topScored: (topData?.data || []).slice(0, 30),
      featured: (featuredData?.data || []).slice(0, 30),
      risingStars: (risingStarsData?.data || []).slice(0, 30),
      newLaunches: (newData?.data || []).slice(0, 30),
      defi: (defiData?.data || []).slice(0, 30),
      aiMl: (aiData?.data || []).slice(0, 30),
      gaming: (gamingData?.data || []).slice(0, 30),
      saas: (saasData?.data || []).slice(0, 30),
      mostRequested: (mostRequestedData?.data || []).slice(0, 30),
    };
  }, [hotData, topData, newData, mostRequestedData, featuredData, risingStarsData, defiData, aiData, gamingData, saasData]);

  // Merge all feed projects once to power stats + tag leader without duplicates
  const visibleFeedProjects = useMemo(() => {
    const unique = new Map<string, Project>();
    const addProjects = (projects?: Project[]) => {
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
    addProjects(featuredData?.data);
    addProjects(risingStarsData?.data);
    addProjects(defiData?.data);
    addProjects(aiData?.data);
    addProjects(gamingData?.data);
    addProjects(saasData?.data);
    addProjects(mostRequestedData?.data);
    return Array.from(unique.values());
  }, [hotData?.data, topData?.data, newData?.data, featuredData?.data, risingStarsData?.data, defiData?.data, aiData?.data, gamingData?.data, saasData?.data, mostRequestedData?.data]);

  // Compute leading tag/category today from all visible datasets
  const leader = useMemo(() => {
    const all = visibleFeedProjects;
    const buckets: Record<string, number> = {};
    const push = (key: string) => {
      if (!key) return;
      buckets[key] = (buckets[key] || 0) + 1;
    };
    for (const p of all) {
      // Prefer categories if present
      if (Array.isArray((p as any).categories) && (p as any).categories.length) {
        for (const c of (p as any).categories as string[]) push(c);
      } else if (Array.isArray((p as any).techStack)) {
        // Fallback heuristic from tech
        const ts = (p as any).techStack.map((t: string) => t.toLowerCase());
        if (ts.some((t: string) => t.includes('blockchain') || t.includes('solidity') || t.includes('web3'))) push('Web3/Blockchain');
        if (ts.some((t: string) => t.includes('ai') || t.includes('machine'))) push('AI/ML');
        if (ts.some((t: string) => t.includes('python') || t.includes('node'))) push('SaaS');
      }
    }
    let label = 'Other';
    let count = 0;
    for (const [k, v] of Object.entries(buckets)) {
      if (v > count) { label = k; count = v; }
    }
    const total = Object.values(buckets).reduce((a, b) => a + b, 0) || 1;
    const percent = (count / total) * 100;
    const iconKey = label.toLowerCase().includes('block')
      ? 'blockchain'
      : label.toLowerCase().includes('ai')
        ? 'ai'
        : label.toLowerCase().includes('game')
          ? 'gaming'
          : label.toLowerCase().includes('fin')
            ? 'fintech'
            : label.toLowerCase().includes('saas')
              ? 'saas'
              : 'other';
    return { label, count, percent, icon: iconKey as any };
  }, [visibleFeedProjects]);

  // Removed old filter functions - now using real category-based data from backend

  return (
    <div className="min-h-screen overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 overflow-hidden max-w-7xl relative">
        {/* Hero Header */}
        <div className="mb-12 sm:mb-16">
          <div className="relative card-elevated p-6 sm:p-8 rounded-2xl overflow-hidden">
            <div className="flex items-start gap-4 mb-4">
              <div className="badge-primary flex items-center justify-center h-12 w-12 flex-shrink-0 rounded-[15px] shadow-lg">
                <Zap className="h-6 w-6 text-black font-bold" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl sm:text-4xl font-black text-foreground mb-2">
                  Discover Projects
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
                  Explore amazing hackathon projects with proof-weighted credibility. Find innovative builders, track their growth, and connect.
                </p>
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
            {/* Quick Section Nav */}
            <nav aria-label="Quick sections" className="feed-quick-nav -mt-6">
              <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
                <a href="#top-rated" className="badge badge-dash badge-secondary hover:opacity-90">Top Rated ({categorizedProjects.topScored.length})</a>
                {categorizedProjects.featured.length > 0 && <a href="#featured" className="badge badge-dash badge-primary hover:opacity-90">Featured ({categorizedProjects.featured.length})</a>}
                <a href="#trending" className="badge badge-dash badge-secondary hover:opacity-90">Trending ({categorizedProjects.hot.length})</a>
                {categorizedProjects.risingStars.length > 0 && <a href="#rising-stars" className="badge badge-dash badge-accent hover:opacity-90">Rising Stars ({categorizedProjects.risingStars.length})</a>}
                <a href="#new-launches" className="badge badge-dash badge-secondary hover:opacity-90">New Launches ({categorizedProjects.newLaunches.length})</a>
                {categorizedProjects.defi.length > 0 && <a href="#defi" className="badge badge-dash badge-secondary hover:opacity-90">DeFi ({categorizedProjects.defi.length})</a>}
                {categorizedProjects.aiMl.length > 0 && <a href="#ai-ml" className="badge badge-dash badge-secondary hover:opacity-90">AI/ML ({categorizedProjects.aiMl.length})</a>}
                {categorizedProjects.gaming.length > 0 && <a href="#gaming" className="badge badge-dash badge-secondary hover:opacity-90">Gaming ({categorizedProjects.gaming.length})</a>}
                {categorizedProjects.saas.length > 0 && <a href="#saas" className="badge badge-dash badge-secondary hover:opacity-90">SaaS ({categorizedProjects.saas.length})</a>}
                {categorizedProjects.mostRequested.length > 0 && <a href="#most-requested" className="badge badge-dash badge-secondary hover:opacity-90">Most Requested ({categorizedProjects.mostRequested.length})</a>}
              </div>
            </nav>
            {/* Top Rated Projects Carousel - Featured first */}
            {categorizedProjects.topScored.length > 0 && (
              <section id="top-rated" className="scroll-mt-24">
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
                  title={`Builder of the Week: @${topBuilders[0].username}`}
                  subtitle={`${topBuilders[0].projects} projects • ${topBuilders[0].score} karma`}
                  href={`/u/${topBuilders[0].username}`}
                  badge="Spotlight"
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

            {/* Trending Carousel */}
            {categorizedProjects.hot.length > 0 && (
              <section id="trending" className="carousel-cinema scroll-mt-24">
                <LazyOnVisible placeholder={<ProjectCardSkeletonGrid count={5} />}> 
                  <Suspense fallback={<ProjectCardSkeletonGrid count={5} />}>
                    <ProjectCarousel
                      projects={categorizedProjects.hot}
                      categoryTitle="Trending"
                      categoryName="trending"
                      categoryIcon={<Sparkles className="h-5 w-5" />}
                      autoplay={true}
                    />
                  </Suspense>
                </LazyOnVisible>
              </section>
            )}

            {/* Thread card between sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topBuilders[0] && (
                <FeedMiniThread
                  title={`@${topBuilders[0].username}`}
                  subtitle={`${topBuilders[0].projects} projects • ${topBuilders[0].score} karma`}
                  href={`/u/${topBuilders[0].username}`}
                  badge="Top Builder"
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

            {/* Featured Projects Carousel */}
            {categorizedProjects.featured.length > 0 && (
              <section id="featured" className="carousel-cinema scroll-mt-24">
                <LazyOnVisible placeholder={<ProjectCardSkeletonGrid count={5} />}>
                  <Suspense fallback={<ProjectCardSkeletonGrid count={5} />}>
                    <ProjectCarousel
                      projects={categorizedProjects.featured}
                      categoryTitle="Featured Projects"
                      categoryName="featured"
                      categoryIcon={<Sparkles className="h-5 w-5" />}
                      autoplay={true}
                    />
                  </Suspense>
                </LazyOnVisible>
              </section>
            )}

            {/* Rising Stars Carousel - New projects with high engagement */}
            {categorizedProjects.risingStars.length > 0 && (
              <section id="rising-stars" className="carousel-cinema scroll-mt-24">
                <LazyOnVisible placeholder={<ProjectCardSkeletonGrid count={5} />}>
                  <Suspense fallback={<ProjectCardSkeletonGrid count={5} />}>
                    <ProjectCarousel
                      projects={categorizedProjects.risingStars}
                      categoryTitle="Rising Stars"
                      categoryName="rising-stars"
                      categoryIcon={<TrendingUp className="h-5 w-5" />}
                      autoplay={true}
                    />
                  </Suspense>
                </LazyOnVisible>
              </section>
            )}

            {/* New Launches Carousel */}
            {categorizedProjects.newLaunches.length > 0 && (
              <section id="new-launches" className="carousel-cinema scroll-mt-24">
                <LazyOnVisible placeholder={<ProjectCardSkeletonGrid count={5} />}>
                  <Suspense fallback={<ProjectCardSkeletonGrid count={5} />}>
                    <ProjectCarousel
                      projects={categorizedProjects.newLaunches}
                      categoryTitle="New Launches"
                      categoryName="new-launches"
                      categoryIcon={<Clock className="h-5 w-5" />}
                      autoplay={true}
                    />
                  </Suspense>
                </LazyOnVisible>
              </section>
            )}

            {/* DeFi Projects Carousel */}
            {categorizedProjects.defi.length > 0 && (
              <section id="defi" className="carousel-cinema scroll-mt-24">
                <LazyOnVisible placeholder={<ProjectCardSkeletonGrid count={5} />}>
                  <Suspense fallback={<ProjectCardSkeletonGrid count={5} />}>
                    <ProjectCarousel
                      projects={categorizedProjects.defi}
                      categoryTitle="DeFi"
                      categoryName="defi"
                      categoryIcon={<Sparkles className="h-5 w-5" />}
                      autoplay={true}
                    />
                  </Suspense>
                </LazyOnVisible>
              </section>
            )}

            {/* DeFi Hero Thread */}
            {categorizedProjects.defi?.[0] && (
              <FeedMiniThread
                title={`Top DeFi Project: ${categorizedProjects.defi[0].title}`}
                subtitle={`by @${categorizedProjects.defi[0].author?.username || 'Builder'}`}
                href={`/project/${categorizedProjects.defi[0].id}`}
                badge="DeFi"
              />
            )}

            {/* AI/ML Projects Carousel */}
            {categorizedProjects.aiMl.length > 0 && (
              <section id="ai-ml" className="carousel-cinema scroll-mt-24">
                <LazyOnVisible placeholder={<ProjectCardSkeletonGrid count={5} />}>
                  <Suspense fallback={<ProjectCardSkeletonGrid count={5} />}>
                    <ProjectCarousel
                      projects={categorizedProjects.aiMl}
                      categoryTitle="AI/ML"
                      categoryName="ai-ml"
                      categoryIcon={<Sparkles className="h-5 w-5" />}
                      autoplay={true}
                    />
                  </Suspense>
                </LazyOnVisible>
              </section>
            )}

            {/* AI/ML Hero Thread */}
            {categorizedProjects.aiMl?.[0] && (
              <FeedMiniThread
                title={`Top AI Project: ${categorizedProjects.aiMl[0].title}`}
                subtitle={`Score: ${categorizedProjects.aiMl[0].proofScore?.total || 0} • ${categorizedProjects.aiMl[0].voteCount || 0} votes`}
                href={`/project/${categorizedProjects.aiMl[0].id}`}
                badge="AI"
              />
            )}

            {/* Gaming Projects Carousel */}
            {categorizedProjects.gaming.length > 0 && (
              <section id="gaming" className="carousel-cinema scroll-mt-24">
                <LazyOnVisible placeholder={<ProjectCardSkeletonGrid count={5} />}>
                  <Suspense fallback={<ProjectCardSkeletonGrid count={5} />}>
                    <ProjectCarousel
                      projects={categorizedProjects.gaming}
                      categoryTitle="Gaming"
                      categoryName="gaming"
                      categoryIcon={<Sparkles className="h-5 w-5" />}
                      autoplay={true}
                    />
                  </Suspense>
                </LazyOnVisible>
              </section>
            )}

            {/* Gaming Hero Thread */}
            {categorizedProjects.gaming?.[0] && (
              <FeedMiniThread
                title={`Trending Game: ${categorizedProjects.gaming[0].title}`}
                subtitle={`${categorizedProjects.gaming[0].voteCount || 0} votes • ${categorizedProjects.gaming[0].viewCount || 0} views`}
                href={`/project/${categorizedProjects.gaming[0].id}`}
                badge="Gaming"
              />
            )}

            {/* SaaS Projects Carousel */}
            {categorizedProjects.saas.length > 0 && (
              <section id="saas" className="carousel-cinema scroll-mt-24">
                <LazyOnVisible placeholder={<ProjectCardSkeletonGrid count={5} />}>
                  <Suspense fallback={<ProjectCardSkeletonGrid count={5} />}>
                    <ProjectCarousel
                      projects={categorizedProjects.saas}
                      categoryTitle="SaaS"
                      categoryName="saas"
                      categoryIcon={<Sparkles className="h-5 w-5" />}
                      autoplay={true}
                    />
                  </Suspense>
                </LazyOnVisible>
              </section>
            )}

            {/* SaaS Hero Thread */}
            {categorizedProjects.saas?.[0] && (
              <FeedMiniThread
                title={`Top SaaS: ${categorizedProjects.saas[0].title}`}
                subtitle={categorizedProjects.saas[0].tagline || 'Innovative SaaS solution'}
                href={`/project/${categorizedProjects.saas[0].id}`}
                badge="SaaS"
              />
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
                    <ProjectCarousel
                      projects={categorizedProjects.mostRequested}
                      categoryTitle="Most Requested Intros"
                      categoryName="most-requested"
                      categoryIcon={<MessageCircle className="h-5 w-5" />}
                      autoplay={true}
                    />
                  </Suspense>
                </LazyOnVisible>
              </section>
            )}

            {/* Removed Top Investor card per request */}

            {/* Community Highlights: Top Builders, Open Investors, Recent Connections */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top Builders */}
              <div className="card-elevated p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-black">Top Builders</h3>
                </div>
                <div className="space-y-3">
                  {topBuilders.slice(0,6).map((b: any, i: number) => (
                    <a key={b.id || i} href={`/u/${b.username}`} className="flex items-center gap-3 hover:opacity-90">
                      <div className="h-9 w-9 rounded-full bg-primary/20 border-2 border-black flex items-center justify-center text-xs font-black text-black">{i+1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground truncate">{b.username}</p>
                        <p className="text-xs text-muted-foreground truncate">{b.projects} projects • {b.score} karma</p>
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
              <div className="card-elevated py-20 text-center p-8 rounded-2xl">
                <div className="space-y-4">
                  <div className="text-6xl">🚀</div>
                  <p className="text-2xl font-black text-foreground">No projects found</p>
                  <p className="text-base text-muted-foreground">
                    Be the first to publish your amazing hackathon project!
                  </p>
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
