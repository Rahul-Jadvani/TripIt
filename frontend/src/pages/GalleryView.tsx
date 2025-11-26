import { useParams } from 'react-router-dom';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useProjects } from '@/hooks/useProjects';
import { CoffeeLoader } from '@/components/CoffeeLoader';
import { Project } from '@/types';
import { ProjectCard } from '@/components/ProjectCard';
import { GallerySkeletonGrid } from '@/components/ProjectCardSkeleton';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useInfiniteScroll } from '@/hooks/useLazyLoad';

const CARDS_PER_PAGE = 12; // Load 12 cards per scroll

const GalleryView = () => {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [displayedProjects, setDisplayedProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const scrollObserverTarget = useRef<HTMLDivElement>(null);

  // Fetch all projects based on category
  const { data: hotData, isLoading: hotLoading } = useProjects('trending', 1);
  const { data: topData, isLoading: topLoading } = useProjects('top-rated', 1);
  const { data: newData, isLoading: newLoading } = useProjects('newest', 1);
  const isAnyLoading = hotLoading || topLoading || newLoading;

  // Redirect legacy/alias categories to canonical ones
  useEffect(() => {
    if (!category) return;
    const aliasMap: Record<string, string> = {
      top: 'top-scored',
      newest: 'new-launches',
      new: 'new-launches',
      projects: 'all',
      allprojects: 'all',
      trending: 'hot',
    };
    const normalized = aliasMap[category];
    if (normalized) {
      navigate(`/gallery/${normalized}`, { replace: true });
    }
  }, [category, navigate]);

  // Filter projects based on category
  useEffect(() => {
    // Wait until at least one dataset has been fetched; avoid flashing empty state
    if (isAnyLoading && !hotData && !topData && !newData) {
      setLoading(true);
      return;
    }

    setLoading(true);
    const allProjectsList = [...(hotData?.data || []), ...(topData?.data || []), ...(newData?.data || [])];

    // Deduplicate projects by ID to avoid showing the same project multiple times
    const seenIds = new Set<string>();
    const deduplicatedList = allProjectsList.filter(project => {
      if (seenIds.has(project.id)) {
        return false;
      }
      seenIds.add(project.id);
      return true;
    });

    let filtered: Project[] = [];

    switch (category) {
      case 'hot':
        filtered = (hotData?.data || []).slice(0, 100);
        break;
      case 'top-scored':
        filtered = (topData?.data || []).slice(0, 100);
        break;
      case 'new-launches':
        filtered = (newData?.data || []).slice(0, 100);
        break;
      case 'ai-smart-contracts':
        filtered = deduplicatedList
          .filter(p =>
            p.techStack?.some(tech =>
              ['AI', 'Machine Learning', 'Smart Contract', 'Blockchain'].some(tag =>
                tech.toLowerCase().includes(tag.toLowerCase())
              )
            )
          )
          .slice(0, 100);
        break;
      case 'most-requested':
        filtered = deduplicatedList
          .sort((a, b) => (b.commentCount || 0) - (a.commentCount || 0))
          .slice(0, 100);
        break;
      default:
        filtered = deduplicatedList.slice(0, 100);
    }

    setAllProjects(filtered);
    // Display first batch of projects
    setDisplayedProjects(filtered.slice(0, CARDS_PER_PAGE));
    setHasMore(filtered.length > CARDS_PER_PAGE);
    setLoading(false);
  }, [category, hotData, topData, newData, isAnyLoading]);

  // Load more projects when user scrolls to bottom
  const loadMoreProjects = useCallback(() => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    // Simulate network delay for better UX
    setTimeout(() => {
      const currentLength = displayedProjects.length;
      const nextBatch = allProjects.slice(currentLength, currentLength + CARDS_PER_PAGE);

      setDisplayedProjects(prev => [...prev, ...nextBatch]);
      setHasMore(currentLength + CARDS_PER_PAGE < allProjects.length);
      setIsLoadingMore(false);
    }, 300);
  }, [displayedProjects.length, allProjects, isLoadingMore, hasMore]);

  // Setup infinite scroll observer
  useEffect(() => {
    if (!scrollObserverTarget.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoadingMore && hasMore) {
          loadMoreProjects();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '500px',
      }
    );

    observer.observe(scrollObserverTarget.current);

    return () => {
      if (scrollObserverTarget.current) {
        observer.unobserve(scrollObserverTarget.current);
      }
    };
  }, [loadMoreProjects, isLoadingMore, hasMore]);

  const getCategoryTitle = () => {
    const titleMap: Record<string, string> = {
      all: 'All Projects',
      hot: 'Hot Projects',
      'top-scored': 'Top Scored Projects',
      'new-launches': 'New Launches',
      'ai-smart-contracts': 'AI & Smart Contracts',
      'most-requested': 'Most Requested Intros',
    };
    return titleMap[category || ''] || 'All Projects';
  };

  return (
    <main className="w-full bg-background min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border/40">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/feed')}
            className="flex items-center justify-center h-10 w-10 rounded-lg hover:bg-secondary transition-colors"
            title="Back to feed"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{getCategoryTitle()}</h1>
            <p className="text-sm text-muted-foreground">{loading ? 'Loading...' : displayedProjects.length + ' projects'}</p>
          </div>
        </div>
      </div>

      {/* Gallery Grid or Loading State */}
      <div className="container mx-auto px-4 sm:px-6 py-12 max-w-7xl">
        {loading ? (
          // Show brand loader while initial data is coming in
          <div className="flex items-center justify-center min-h-[300px]"><CoffeeLoader message="Brewing projects…" /></div>
        ) : displayedProjects.length === 0 && !isAnyLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="text-3xl mb-4">📭</div>
              <div className="text-xl font-bold text-foreground mb-2">No projects found</div>
              <div className="text-muted-foreground">This category doesn't have any projects yet</div>
            </div>
          </div>
        ) : (
          <>
            {/* Project Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
              {displayedProjects.map((project) => (
                <div key={project.id} className="h-[600px] min-w-0">
                  <ProjectCard project={project} />
                </div>
              ))}
            </div>

            {/* Loading indicator for infinite scroll */}
            {isLoadingMore && (
              <div className="flex justify-center mt-12 pb-8">
                <GallerySkeletonGrid count={4} />
              </div>
            )}

            {/* Infinite scroll observer target */}
            {hasMore && (
              <div
                ref={scrollObserverTarget}
                className="h-10 flex items-center justify-center mt-12"
              >
                <div className="text-sm text-muted-foreground">Scroll for more projects...</div>
              </div>
            )}

            {/* End of list message */}
            {!hasMore && displayedProjects.length > 0 && (
              <div className="flex justify-center mt-12 pb-8">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    You've reached the end of {getCategoryTitle()}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
};

export default GalleryView;
