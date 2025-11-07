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
import { useProjects } from '@/hooks/useProjects';
import { useAuth } from '@/context/AuthContext';
import { projectsService } from '@/services/api';
import { Project } from '@/types';

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

  // Prefetch additional pages for carousel infinite scroll + progressive deeper pages
  useEffect(() => {
    // Only prefetch after primary data loads
    if (!hotLoading && !topLoading) {
      const prefetchPages = async () => {
        // Prefetch pages 2-3 for all categories
        for (const sort of ['trending', 'top-rated', 'newest']) {
          for (let page = 2; page <= 3; page++) {
            queryClient.prefetchQuery({
              queryKey: ['projects', sort, page],
              queryFn: async () => {
                const response = await projectsService.getAll(sort, page);
                return {
                  ...response.data,
                  data: response.data.data || [],
                };
              },
              staleTime: 1000 * 60 * 5,
            });
          }
        }
      };

      prefetchPages();
    }
  }, [hotLoading, topLoading, queryClient]);

  // Progressive loading: Show page when trending & top-rated are loaded
  const isLoading = hotLoading || topLoading;

  // Categorize projects
  const categorizedProjects = useMemo(() => {
    const allProjects = [...(hotData?.data || [])];

    return {
      hot: (hotData?.data || []).slice(0, 20),
      topScored: (topData?.data || []).slice(0, 10),
      newLaunches: (newData?.data || []).slice(0, 20),
      aiSmartContracts: filterByTechTags(allProjects, ['AI', 'Machine Learning', 'Smart Contract', 'Blockchain']),
      mostRequested: filterByIntroRequests(allProjects),
    };
  }, [hotData, topData, newData]);

  // Filter projects by tech tags
  function filterByTechTags(projects: Project[], tags: string[]): Project[] {
    return projects
      .filter(p =>
        p.techStack?.some(tech =>
          tags.some(tag => tech.toLowerCase().includes(tag.toLowerCase()))
        )
      )
      .slice(0, 20);
  }

  // Filter projects by most intro requests (using commentCount as proxy)
  function filterByIntroRequests(projects: Project[]): Project[] {
    return [...projects]
      .sort((a, b) => (b.commentCount || 0) - (a.commentCount || 0))
      .slice(0, 20);
  }

  return (
    <div className="min-h-screen overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 overflow-hidden max-w-7xl">
        {/* Hero Header */}
        <div className="mb-12 sm:mb-16">
          <div className="card-elevated p-6 sm:p-8 rounded-2xl">
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
          <div className="space-y-16">
            {/* Top Rated Carousel Skeleton */}
            <div className="flex justify-center">
              <div className="w-full sm:w-[600px] h-[320px]">
                <TopRatedCarouselSkeleton />
              </div>
            </div>
            {/* Other carousel skeletons */}
            <ProjectCardSkeletonGrid count={5} />
            <ProjectCardSkeletonGrid count={5} />
            <ProjectCardSkeletonGrid count={5} />
          </div>
        ) : (
          <div className="space-y-12 sm:space-y-16 pb-12">
            {/* Top Rated Projects Carousel - Featured at the top with enhanced styling */}
            {categorizedProjects.topScored.length > 0 && (
              <section>
                <LazyOnVisible placeholder={
                  <div className="flex justify-center">
                    <div className="w-full sm:w-[600px] h-[320px]">
                      <TopRatedCarouselSkeleton />
                    </div>
                  </div>
                }>
                  <Suspense fallback={
                    <div className="flex justify-center">
                      <div className="w-full sm:w-[600px] h-[320px]">
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

            {/* Trending Carousel */}
            {categorizedProjects.hot.length > 0 && (
              <section className="carousel-cinema">
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

            {/* New Launches Carousel */}
            {categorizedProjects.newLaunches.length > 0 && (
              <section className="carousel-cinema">
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

            {/* AI & Smart Contracts Carousel */}
            {categorizedProjects.aiSmartContracts.length > 0 && (
              <section className="carousel-cinema">
                <LazyOnVisible placeholder={<ProjectCardSkeletonGrid count={5} />}>
                  <Suspense fallback={<ProjectCardSkeletonGrid count={5} />}>
                    <ProjectCarousel
                      projects={categorizedProjects.aiSmartContracts}
                      categoryTitle="AI & Smart Contracts"
                      categoryName="ai-smart-contracts"
                      categoryIcon={<Sparkles className="h-5 w-5" />}
                      autoplay={true}
                      enableTagFiltering={true}
                    />
                  </Suspense>
                </LazyOnVisible>
              </section>
            )}

            {/* Most Requested Intros Carousel */}
            {categorizedProjects.mostRequested.length > 0 && (
              <section className="carousel-cinema">
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
          </div>
        )}
      </div>
    </div>
  );
}
