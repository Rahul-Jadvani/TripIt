import { useState, useMemo, useCallback } from 'react';
import { useProjects } from '@/hooks/useProjects';
import { useAuth } from '@/context/AuthContext';
import { ProjectCard } from '@/components/ProjectCard';
import { ProjectCardSkeletonGrid } from '@/components/ProjectCardSkeleton';
import {
  ChevronDown,
  ChevronUp,
  Filter,
  X,
  TrendingUp,
  Award,
  Zap,
  Code,
  Layers,
  Calendar,
  Users,
  MessageSquare,
  Eye,
  Star,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

interface FilterState {
  search: string;
  categories: string[];
  badges: string[];
  sortBy: 'featured' | 'trending' | 'recent' | 'votes' | 'comments' | 'views';
  minScore: number;
  hasDemo: boolean;
  hasGithub: boolean;
  minTeamSize: number;
  featured: boolean;
  scoring: 'all' | 'completed' | 'pending';
  techStack: string[];
  dateRange: 'all' | 'week' | 'month' | 'quarter' | 'year';
  minVotes: number;
  minComments: number;
  minViews: number;
}

const CATEGORIES = [
  'AI/ML',
  'Web3',
  'DeFi',
  'NFT',
  'Gaming',
  'Social',
  'Fintech',
  'DAO',
  'Infrastructure',
  'Metaverse',
  'ZK Proofs',
  'Oracle',
  'Bridge',
  'Governance',
  'Supply Chain',
  'Healthcare',
  'Education',
  'Energy',
];

const normalizeBadgeValue = (value: unknown): string => {
  if (value === undefined || value === null) return '';
  return String(value).trim().toLowerCase();
};

const formatBadgeLabel = (raw: string): string => {
  if (!raw) return '';
  return raw
    .trim()
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const extractBadgeValue = (badge: any): string => {
  if (!badge) return '';
  if (typeof badge === 'string') return badge;

  const candidates = [
    badge.type,
    badge.badgeType,
    badge.badge_type,
    badge.name,
    badge.label,
    badge.value,
    badge.code,
  ];

  const valid = candidates.find((val) => {
    if (val === undefined || val === null) return false;
    const str = String(val).trim();
    return str.length > 0;
  });

  return valid ? String(valid) : '';
};

const getProjectBadgeEntries = (project: any): any[] => {
  const entries: any[] = [];

  const collect = (source: any) => {
    if (!source) return;

    if (Array.isArray(source)) {
      entries.push(...source);
      return;
    }

    if (Array.isArray(source.badges)) {
      entries.push(...source.badges);
    }
  };

  collect(project.badges);
  collect(project.validation_badges);
  collect(project.validationBadges);
  collect(project.badge_stats);
  collect(project.badgeStats);
  collect(project.validationStatus);
  collect(project.validation_status);
  collect(project.scoreBreakdown?.validation);
  collect(project.score_breakdown?.validation);
  collect(project.scoreBreakdown);
  collect(project.score_breakdown);

  return entries;
};

const projectHasBadge = (project: any, badgeFilter: string): boolean => {
  const normalizedFilter = normalizeBadgeValue(badgeFilter);
  if (!normalizedFilter) return false;

  const projectBadges = getProjectBadgeEntries(project);
  return projectBadges.some(
    (badge: any) =>
      normalizeBadgeValue(extractBadgeValue(badge)) === normalizedFilter
  );
};

// Derive available categories and badges from loaded projects so filters reflect actual data
// This helps avoid showing category filters that match no projects


const TECH_STACKS = [
  'Solidity',
  'Rust',
  'JavaScript',
  'TypeScript',
  'Python',
  'Go',
  'React',
  'Vue',
  'Next.js',
  'Web3.js',
  'Ethers.js',
  'Cairo',
  'Vyper',
  'Hardhat',
  'Foundry',
];

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'trending', label: 'Trending' },
  { value: 'recent', label: 'Most Recent' },
  { value: 'votes', label: 'Most Voted' },
  { value: 'comments', label: 'Most Discussed' },
  { value: 'views', label: 'Most Viewed' },
];

const FilterSection = ({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) => (
  <div className="border-b-2 border-black">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors font-bold text-sm"
    >
      <span>{title}</span>
      {expanded ? (
        <ChevronUp className="h-4 w-4" />
      ) : (
        <ChevronDown className="h-4 w-4" />
      )}
    </button>
    {expanded && <div className="px-4 pb-4 space-y-3 border-t-2 border-black">{children}</div>}
  </div>
);

export default function Gallery() {
  const { user } = useAuth();
  const { data: projectsData, isLoading } = useProjects('hot', 1, true);
  const projects = projectsData?.data || [];

  // Dynamically compute available categories and badges from the projects payload
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p: any) => {
      (p.categories || []).forEach((c: string) => {
        if (c) set.add(String(c));
      });
    });
    return Array.from(set).sort();
  }, [projects]);

  const availableBadges = useMemo(() => {
    const badgeMap = new Map<string, string>();

    projects.forEach((p: any) => {
      getProjectBadgeEntries(p).forEach((badge: any) => {
        const rawValue = extractBadgeValue(badge);
        const normalized = normalizeBadgeValue(rawValue);
        if (!normalized) return;

        if (!badgeMap.has(normalized)) {
          const labelSource = rawValue || normalized;
          badgeMap.set(normalized, formatBadgeLabel(labelSource));
        }
      });
    });

    return Array.from(badgeMap.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [projects]);

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    categories: [],
    badges: [],
    sortBy: 'featured',
    minScore: 0,
    hasDemo: false,
    hasGithub: false,
    minTeamSize: 0,
    featured: false,
    scoring: 'all',
    techStack: [],
    dateRange: 'all',
    minVotes: 0,
    minComments: 0,
    minViews: 0,
  });

  const [expandedSections, setExpandedSections] = useState({
    search: true,
    sort: true,
    categories: true,
    badges: false,
    quality: false,
    engagement: false,
    content: false,
    tech: false,
    team: false,
    date: false,
  });

  const toggleSection = useCallback((section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  const toggleFilter = useCallback(
    (filterType: string, value: string) => {
      const normalizedValue =
        filterType === 'badges' ? normalizeBadgeValue(value) : value;

      setFilters((prev) => {
        const current = prev[filterType as keyof FilterState] as string[];
        return {
          ...prev,
          [filterType]: current.includes(normalizedValue)
            ? current.filter((v) => v !== normalizedValue)
            : [...current, normalizedValue],
        };
      });
    },
    []
  );

  const handleRangeChange = useCallback((field: string, value: number) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      search: '',
      categories: [],
      badges: [],
      sortBy: 'featured',
      minScore: 0,
      hasDemo: false,
      hasGithub: false,
      minTeamSize: 0,
      featured: false,
      scoring: 'all',
      techStack: [],
      dateRange: 'all',
      minVotes: 0,
      minComments: 0,
      minViews: 0,
    });
  }, []);

  const filteredProjects = useMemo(() => {
    let result = [...projects];

    // Search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (p: any) =>
          p.title?.toLowerCase().includes(searchLower) ||
          p.tagline?.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower)
      );
    }

    // Categories
    if (filters.categories.length > 0) {
      result = result.filter((p: any) => {
        const projectCats = (p.categories || []).map((c: string) => c.toLowerCase());
        return filters.categories.some((cat) =>
          projectCats.some((pcat: string) => pcat.includes(cat.toLowerCase()))
        );
      });
    }

    // Badges
    if (filters.badges.length > 0) {
      result = result.filter((p: any) =>
        filters.badges.some((badge) => projectHasBadge(p, badge))
      );
    }

    // Quality (Proof Score)
    if (filters.minScore > 0) {
      result = result.filter(
        (p: any) => (p.proofScore?.total || 0) >= filters.minScore
      );
    }

    // Demo & Github
    if (filters.hasDemo) {
      result = result.filter((p: any) => p.demoUrl || p.demo_url);
    }
    if (filters.hasGithub) {
      result = result.filter((p: any) => p.githubUrl || p.github_url);
    }

    // Team size
    if (filters.minTeamSize > 0) {
      result = result.filter(
        (p: any) => (p.teamMembers?.length || p.team_members?.length || 0) >= filters.minTeamSize
      );
    }

    // Featured only
    if (filters.featured) {
      result = result.filter((p: any) => p.isFeatured || p.is_featured);
    }

    // Scoring status
    if (filters.scoring !== 'all') {
      result = result.filter((p: any) => p.scoring_status === filters.scoring || p.scoringStatus === filters.scoring);
    }

    // Tech stack
    if (filters.techStack.length > 0) {
      result = result.filter((p: any) => {
        const tech = (p.techStack || p.tech_stack || []).map((t: string) => t.toLowerCase());
        return filters.techStack.some((t) =>
          tech.some((pt: string) => pt.includes(t.toLowerCase()))
        );
      });
    }

    // Date range
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const createdAt = (p: any) => new Date(p.created_at || p.createdAt);
      const daysDiff = (date: Date) =>
        (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);

      const ranges: Record<string, number> = {
        week: 7,
        month: 30,
        quarter: 90,
        year: 365,
      };

      result = result.filter((p: any) => {
        const diff = daysDiff(createdAt(p));
        return diff <= ranges[filters.dateRange];
      });
    }

    // Engagement metrics
    if (filters.minVotes > 0) {
      result = result.filter((p: any) => (p.voteCount || p.vote_count || 0) >= filters.minVotes);
    }
    if (filters.minComments > 0) {
      result = result.filter((p: any) => (p.commentCount || p.comment_count || 0) >= filters.minComments);
    }
    if (filters.minViews > 0) {
      result = result.filter((p: any) => (p.viewCount || p.view_count || 0) >= filters.minViews);
    }

    // Sorting
    const sortFunctions: Record<string, (a: any, b: any) => number> = {
      featured: (a, b) => (b.isFeatured ? 1 : -1) || ((b.voteCount || 0) - (a.voteCount || 0)),
      trending: (a, b) => {
        const aScore = (a.voteCount || 0) + (a.commentCount || 0) * 0.5;
        const bScore = (b.voteCount || 0) + (b.commentCount || 0) * 0.5;
        return bScore - aScore;
      },
      recent: (a, b) =>
        new Date(b.created_at || b.createdAt).getTime() -
        new Date(a.created_at || a.createdAt).getTime(),
      votes: (a, b) => (b.voteCount || 0) - (a.voteCount || 0),
      comments: (a, b) => (b.commentCount || 0) - (a.commentCount || 0),
      views: (a, b) => (b.viewCount || 0) - (a.viewCount || 0),
    };

    result.sort(sortFunctions[filters.sortBy] || sortFunctions.featured);

    return result;
  }, [projects, filters]);

  const activeFilterCount = useMemo(() => {
    return (
      (filters.search ? 1 : 0) +
      filters.categories.length +
      filters.badges.length +
      filters.techStack.length +
      (filters.minScore > 0 ? 1 : 0) +
      (filters.hasDemo ? 1 : 0) +
      (filters.hasGithub ? 1 : 0) +
      (filters.featured ? 1 : 0) +
      (filters.minTeamSize > 0 ? 1 : 0) +
      (filters.minVotes > 0 ? 1 : 0) +
      (filters.minComments > 0 ? 1 : 0) +
      (filters.minViews > 0 ? 1 : 0) +
      (filters.dateRange !== 'all' ? 1 : 0) +
      (filters.scoring !== 'all' ? 1 : 0)
    );
  }, [filters]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-black mb-2" style={{ fontFamily: '"Comic Relief", system-ui' }}>
            Explore
          </h1>
          <p className="text-muted-foreground text-lg">
            Featured projects from the ecosystem
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
          {/* Sidebar Filters */}
          <div className="space-y-0 border-4 border-black rounded-2xl overflow-hidden bg-black text-white shadow-[8px_8px_0_0_#000]">
            {/* Filter Header */}
            <div className="bg-secondary/60 p-4 border-b-4 border-black flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                <span className="font-bold">Filters</span>
              </div>
              {activeFilterCount > 0 && (
                <Badge variant="default" className="bg-primary text-black">
                  {activeFilterCount}
                </Badge>
              )}
            </div>

            {/* Clear Filters Button */}
            {activeFilterCount > 0 && (
              <button
                onClick={handleClearFilters}
                className="w-full px-4 py-2 text-sm font-bold text-destructive hover:bg-destructive/10 transition-colors border-b-2 border-black flex items-center justify-center gap-2"
              >
                <X className="h-4 w-4" />
                Clear All
              </button>
            )}

            {/* Search Filter */}
            <FilterSection
              title="Search"
              expanded={expandedSections.search}
              onToggle={() => toggleSection('search')}
            >
              <Input
                placeholder="Search projects..."
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                className="border-2 border-black rounded-lg"
              />
            </FilterSection>

            {/* Sort Filter */}
            <FilterSection
              title="Sort By"
              expanded={expandedSections.sort}
              onToggle={() => toggleSection('sort')}
            >
              <div className="space-y-2">
                {SORT_OPTIONS.map((option) => (
                  <label key={option.value} className="flex items-center gap-3 cursor-pointer hover:bg-secondary/30 p-2 rounded transition-colors">
                    <input
                      type="radio"
                      name="sort"
                      value={option.value}
                      checked={filters.sortBy === option.value}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          sortBy: e.target.value as typeof filters.sortBy,
                        }))
                      }
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className="text-sm font-medium">{option.label}</span>
                  </label>
                ))}
              </div>
            </FilterSection>

            {/* Categories Filter */}
            <FilterSection
              title={`Categories (${availableCategories.length})`}
              expanded={expandedSections.categories}
              onToggle={() => toggleSection('categories')}
            >
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableCategories.length > 0 ? (
                  availableCategories.map((cat) => (
                    <label key={cat} className="flex items-center gap-3 cursor-pointer hover:bg-secondary/30 p-2 rounded transition-colors">
                      <Checkbox
                        checked={filters.categories.includes(cat)}
                        onCheckedChange={() => toggleFilter('categories', cat)}
                      />
                      <span className="text-sm font-medium">{cat}</span>
                    </label>
                  ))
                ) : (
                  <div className="p-2 text-sm text-muted-foreground">No categories available</div>
                )}
              </div>
            </FilterSection>

            {/* Badge Filter */}
            <FilterSection
              title={`Badges (${availableBadges.length})`}
              expanded={expandedSections.badges}
              onToggle={() => toggleSection('badges')}
            >
              <div className="space-y-2">
                {availableBadges.length > 0 ? (
                  availableBadges.map((badge) => (
                    <label key={badge.value} className="flex items-center gap-3 cursor-pointer hover:bg-secondary/30 p-2 rounded transition-colors">
                      <Checkbox
                        checked={filters.badges.includes(badge.value)}
                        onCheckedChange={() => toggleFilter('badges', badge.value)}
                      />
                      <Award className="h-4 w-4" />
                      <span className="text-sm font-medium">{badge.label}</span>
                    </label>
                  ))
                ) : (
                  <div className="p-2 text-sm text-muted-foreground">No badges available</div>
                )}
              </div>
            </FilterSection>

            {/* Quality Metrics */}
            <FilterSection
              title="Quality Metrics"
              expanded={expandedSections.quality}
              onToggle={() => toggleSection('quality')}
            >
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold mb-2 block flex items-center gap-2">
                    <Award className="h-3 w-3" />
                    Min Proof Score: {filters.minScore}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={filters.minScore}
                    onChange={(e) => handleRangeChange('minScore', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                <label className="flex items-center gap-3 cursor-pointer hover:bg-secondary/30 p-2 rounded transition-colors">
                  <Checkbox
                    checked={filters.hasDemo}
                    onCheckedChange={(checked) =>
                      setFilters((prev) => ({ ...prev, hasDemo: checked as boolean }))
                    }
                  />
                  <span className="text-sm font-medium">Has Demo</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer hover:bg-secondary/30 p-2 rounded transition-colors">
                  <Checkbox
                    checked={filters.hasGithub}
                    onCheckedChange={(checked) =>
                      setFilters((prev) => ({ ...prev, hasGithub: checked as boolean }))
                    }
                  />
                  <span className="text-sm font-medium">Has GitHub</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer hover:bg-secondary/30 p-2 rounded transition-colors">
                  <Checkbox
                    checked={filters.featured}
                    onCheckedChange={(checked) =>
                      setFilters((prev) => ({ ...prev, featured: Boolean(checked) }))
                    }
                  />
                  <Star className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium">Only Featured Projects</span>
                </label>
              </div>
            </FilterSection>

            {/* Engagement Metrics */}
            <FilterSection
              title="Engagement"
              expanded={expandedSections.engagement}
              onToggle={() => toggleSection('engagement')}
            >
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold mb-2 block flex items-center gap-2">
                    <TrendingUp className="h-3 w-3" />
                    Min Votes: {filters.minVotes}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    step="10"
                    value={filters.minVotes}
                    onChange={(e) => handleRangeChange('minVotes', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold mb-2 block flex items-center gap-2">
                    <MessageSquare className="h-3 w-3" />
                    Min Comments: {filters.minComments}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="500"
                    step="5"
                    value={filters.minComments}
                    onChange={(e) => handleRangeChange('minComments', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold mb-2 block flex items-center gap-2">
                    <Eye className="h-3 w-3" />
                    Min Views: {filters.minViews}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="5000"
                    step="50"
                    value={filters.minViews}
                    onChange={(e) => handleRangeChange('minViews', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </FilterSection>

            {/* Tech Stack Filter */}
            <FilterSection
              title={`Tech Stack (${filters.techStack.length})`}
              expanded={expandedSections.tech}
              onToggle={() => toggleSection('tech')}
            >
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {TECH_STACKS.map((tech) => (
                  <label key={tech} className="flex items-center gap-3 cursor-pointer hover:bg-secondary/30 p-2 rounded transition-colors">
                    <Checkbox
                      checked={filters.techStack.includes(tech)}
                      onCheckedChange={() => toggleFilter('techStack', tech)}
                    />
                    <Code className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm font-medium">{tech}</span>
                  </label>
                ))}
              </div>
            </FilterSection>

            {/* Team Filter */}
            <FilterSection
              title="Team"
              expanded={expandedSections.team}
              onToggle={() => toggleSection('team')}
            >
              <div>
                <label className="text-xs font-bold mb-2 block flex items-center gap-2">
                  <Users className="h-3 w-3" />
                  Min Team Size: {filters.minTeamSize}
                </label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={filters.minTeamSize}
                  onChange={(e) => handleRangeChange('minTeamSize', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </FilterSection>

            {/* Date Range Filter */}
            <FilterSection
              title="Date Range"
              expanded={expandedSections.date}
              onToggle={() => toggleSection('date')}
            >
              <div className="space-y-2">
                {[
                  { value: 'all', label: 'All Time' },
                  { value: 'week', label: 'Past Week' },
                  { value: 'month', label: 'Past Month' },
                  { value: 'quarter', label: 'Past 3 Months' },
                  { value: 'year', label: 'Past Year' },
                ].map((option) => (
                  <label key={option.value} className="flex items-center gap-3 cursor-pointer hover:bg-secondary/30 p-2 rounded transition-colors">
                    <input
                      type="radio"
                      name="dateRange"
                      value={option.value}
                      checked={filters.dateRange === option.value}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          dateRange: e.target.value as typeof filters.dateRange,
                        }))
                      }
                      className="w-4 h-4 cursor-pointer"
                    />
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm font-medium">{option.label}</span>
                  </label>
                ))}
              </div>
            </FilterSection>
          </div>

          {/* Projects Grid */}
          <div>
            {/* Results Info */}
            <div className="mb-6 p-4 bg-secondary/30 border-2 border-black rounded-lg">
              <p className="font-bold">
                Showing <span className="text-primary">{filteredProjects.length}</span> projects
                {activeFilterCount > 0 && ` (${activeFilterCount} active filters)`}
              </p>
            </div>

            {/* Projects Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 12 }).map((_, idx) => (
                  <div key={idx} className="h-[600px] bg-secondary rounded-lg animate-pulse"></div>
                ))}
              </div>
            ) : filteredProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((project: any) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 border-4 border-black rounded-2xl bg-secondary/20">
                <Filter className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-bold mb-2">No projects found</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Try adjusting your filters to find more projects.
                </p>
                {activeFilterCount > 0 && (
                  <Button
                    onClick={handleClearFilters}
                    variant="secondary"
                    className="mt-4"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
