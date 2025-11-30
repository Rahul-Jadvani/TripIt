import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { adminService, itinerariesService, introsService, savedItinerariesService } from '@/services/api';
import { transformItinerary } from '@/hooks/useItineraries';
import { matchItinerariesToInvestor } from '@/utils/investorMatching';
import { ItineraryCard } from '@/components/ProjectCard';
import { ItineraryCardSkeletonGrid } from '@/components/ItineraryCardSkeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  Bookmark,
  MessageSquare,
  BarChart3,
  Settings,
  Filter,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Briefcase,
  Globe,
  Calendar,
  Building2,
  Target,
  Loader2,
  AlertCircle,
  Crown,
  Sparkles
} from 'lucide-react';

interface FilterOptions {
  search: string;
  industries: string[];
  stages: string[];
  sort: string;
}

export default function InvestorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    industries: [],
    stages: [],
    sort: 'trending'
  });
  const [showFilters, setShowFilters] = useState(false);

  // Fetch investor profile
  const { data: investorProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['myInvestorProfile'],
    queryFn: async () => {
      const response = await adminService.getMyInvestorProfile();
      return response.data.data;
    },
    enabled: !!user,
  });

  // Fetch matched itinerarys from backend (primary source of truth)
  const { data: matcheditinerarysData, isLoading: matchedLoading } = useQuery({
    queryKey: ['investorMatches', user?.id],
    queryFn: async () => {
      try {
        const response = await itinerariesService.getInvestorMatches(1, 50, 20);
        const payload = response.data || {};
        const transformeditinerarys = Array.isArray(payload.data)
          ? payload.data.map(transformItinerary)
          : [];
        return {
          ...payload,
          data: transformeditinerarys,
        };
      } catch (error) {
        // Fallback: if endpoint not available, return empty gracefully
        console.error('Error fetching investor matches:', error);
        return {
          status: 'success',
          message: 'Fallback: using general feed',
          data: [],
          pagination: { total: 0, page: 1, per_page: 50, total_pages: 0 }
        };
      }
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  // Fetch saved itinerarys
  const { data: saveditinerarys, isLoading: savedLoading } = useQuery({
    queryKey: ['saveditinerarys'],
    queryFn: async () => {
      const response = await savedItinerariesService.getMySavedItineraries(1, 50);
      const payload = response.data || {};
      return Array.isArray(payload.data)
        ? payload.data.map(transformitinerary)
        : [];
    },
    enabled: !!user,
  });

  // Fetch intro requests
  const { data: sentIntros } = useQuery({
    queryKey: ['sentIntros'],
    queryFn: async () => {
      const response = await introsService.getSent();
      return response.data.data;
    },
    enabled: !!user,
  });

  const { data: receivedIntros } = useQuery({
    queryKey: ['receivedIntros'],
    queryFn: async () => {
      const response = await introsService.getReceived();
      return response.data.data;
    },
    enabled: !!user,
  });

  // Check if user is approved investor
  if (!(user as any)?.is_investor && !(user as any)?.isInvestor) {
    return (
      <div className="min-h-screen bg-background pt-20 px-4 pb-12">
        <div className="max-w-3xl mx-auto">
          <div className="card-elevated p-12 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-lg font-bold text-foreground mb-2">Access Denied</p>
            <p className="text-sm text-muted-foreground mb-6">
              You need to be an approved investor to access this dashboard.
            </p>
            <Button onClick={() => navigate('/investor-plans')}>
              Apply to Become an Investor
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const stats = {
    saveditinerarys: saveditinerarys?.length || 0,
    introsSent: sentIntros?.length || 0,
    introsReceived: receivedIntros?.length || 0,
    itinerarysViewed: 0, // We can add tracking for this later
  };

  // Smart matching: Use backend-computed matches (enhanced scoring algorithm)
  const matcheditinerarys = useMemo(() => {
    // Backend already returns matched and scored itinerarys
    if (!matcheditinerarysData?.data) return [];
    
    // Data is already scored and filtered by backend - just use it as-is
    return matcheditinerarysData.data;
  }, [matcheditinerarysData]);

  // Apply manual filters on top of backend-matched itinerarys (search, industry chips)
  const filtereditinerarys = useMemo(() => {
    let itinerarys = matcheditinerarys;

    // Apply search filter
    if (filters.search) {
      itinerarys = itinerarys.filter((itinerary: any) =>
        itinerary.title.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Apply industry filter
    if (filters.industries.length > 0) {
      itinerarys = itinerarys.filter((itinerary: any) =>
        itinerary.categories?.some((cat: string) =>
          filters.industries.includes(cat)
        )
      );
    }

    return itinerarys;
  }, [matcheditinerarys, filters]);

  return (
    <div className="min-h-screen bg-background pt-20 px-4 pb-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-black text-foreground mb-2">
                Investor Dashboard
              </h1>
              <p className="text-muted-foreground">
                Discover and connect with innovative itinerarys
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/investor-plans')}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Manage Profile
            </Button>
          </div>

          {/* Investor Profile Summary */}
          {investorProfile && (
            <div className="card-elevated p-6 mb-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-xl font-black text-foreground">
                      {investorProfile.name}
                    </h2>
                    <Badge className="bg-primary text-black">
                      {investorProfile.investor_type}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {investorProfile.location && (
                      <div className="flex items-center gap-2 text-sm">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span>{investorProfile.location}</span>
                      </div>
                    )}
                    {investorProfile.company_name && (
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{investorProfile.company_name}</span>
                      </div>
                    )}
                    {investorProfile.investment_stages && (
                      <div className="flex items-center gap-2 text-sm">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <span>{investorProfile.investment_stages.join(', ')}</span>
                      </div>
                    )}
                  </div>

                  {/* Plan Type with Upgrade Option */}
                  {investorProfile.plan_type && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-muted-foreground">Current Plan:</span>
                          <Badge className="bg-primary text-black capitalize">
                            {investorProfile.plan_type}
                          </Badge>
                        </div>
                        <Button
                          disabled
                          className="opacity-50 cursor-not-allowed bg-gradient-to-r from-orange-500/20 to-amber-500/20 border-2 border-orange-600/30 text-muted-foreground"
                          size="sm"
                        >
                          <Crown className="h-4 w-4 mr-2" />
                          Upgrade
                          <Sparkles className="h-3 w-3 ml-2" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="card-elevated p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-muted-foreground">Saved itinerarys</div>
              <Bookmark className="h-4 w-4 text-primary" />
            </div>
            <div className="text-3xl font-black text-foreground">{stats.saveditinerarys}</div>
          </div>

          <div className="card-elevated p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-muted-foreground">Intros Sent</div>
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
            <div className="text-3xl font-black text-foreground">{stats.introsSent}</div>
          </div>

          <div className="card-elevated p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-muted-foreground">Intros Received</div>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="text-3xl font-black text-foreground">{stats.introsReceived}</div>
          </div>

          <div className="card-elevated p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-muted-foreground">Active Connections</div>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div className="text-3xl font-black text-foreground">
              {(sentIntros?.filter((i: any) => i.status === 'accepted').length || 0) +
               (receivedIntros?.filter((i: any) => i.status === 'accepted').length || 0)}
            </div>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="inline-flex h-auto rounded-[15px] bg-secondary border-4 border-black p-1 mb-8">
            <TabsTrigger
              value="overview"
              className="rounded-md px-4 py-2 text-sm font-bold transition-quick data-[state=active]:bg-primary data-[state=active]:text-black"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="discover"
              className="rounded-md px-4 py-2 text-sm font-bold transition-quick data-[state=active]:bg-primary data-[state=active]:text-black"
            >
              <Search className="h-4 w-4 mr-2" />
              Discover itinerarys
            </TabsTrigger>
            <TabsTrigger
              value="saved"
              className="rounded-md px-4 py-2 text-sm font-bold transition-quick data-[state=active]:bg-primary data-[state=active]:text-black"
            >
              <Bookmark className="h-4 w-4 mr-2" />
              Saved ({stats.saveditinerarys})
            </TabsTrigger>
            <TabsTrigger
              value="intros"
              className="rounded-md px-4 py-2 text-sm font-bold transition-quick data-[state=active]:bg-primary data-[state=active]:text-black"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Intro Requests
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="space-y-6">
              {/* Investment Focus */}
              {investorProfile && (
                <div className="card-elevated p-6">
                  <h3 className="text-xl font-black text-foreground mb-4">Your Investment Focus</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {investorProfile.investment_stages && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-2">Investment Stages</div>
                        <div className="flex flex-wrap gap-2">
                          {investorProfile.investment_stages.map((stage: string) => (
                            <Badge key={stage} variant="secondary">{stage}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {investorProfile.industries && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-2">Industries</div>
                        <div className="flex flex-wrap gap-2">
                          {investorProfile.industries.map((industry: string) => (
                            <Badge key={industry} variant="secondary">{industry}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {investorProfile.geographic_focus && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-2">Geographic Focus</div>
                        <div className="flex flex-wrap gap-2">
                          {investorProfile.geographic_focus.map((region: string) => (
                            <Badge key={region} variant="secondary">{region}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Matching itinerarys */}
              <div className="card-elevated p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-black text-foreground">
                    itinerarys Matching Your Criteria
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('discover')}
                  >
                    View All
                  </Button>
                </div>
                {matchedLoading ? (
                  <ItineraryCardSkeletonGrid count={3} />
                ) : filtereditinerarys.length > 0 ? (
                  <div className="space-y-4">
                    {filtereditinerarys.slice(0, 3).map((itinerary: any) => (
                      <ItineraryCard key={itinerary.id} itinerary={itinerary} />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No itinerarys match your criteria yet.
                  </p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Discover itinerarys Tab */}
          <TabsContent value="discover">
            <div className="space-y-6">
              {/* Search and Filters */}
              <div className="card-elevated p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search itinerarys..."
                        className="w-full pl-10 pr-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:outline-none"
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="gap-2"
                  >
                    <Filter className="h-4 w-4" />
                    Filters
                  </Button>
                </div>

                {showFilters && (
                  <div className="mt-4 pt-4 border-t-2 border-border">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">
                          Sort By
                        </label>
                        <select
                          className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground"
                          value={filters.sort}
                          onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
                        >
                          <option value="trending">Trending</option>
                          <option value="newest">Newest</option>
                          <option value="top-rated">Top Rated</option>
                          <option value="hot">Hot</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* itinerarys List */}
              {matchedLoading ? (
                <ItineraryCardSkeletonGrid count={6} />
              ) : filtereditinerarys.length > 0 ? (
                <div className="space-y-4">
                  {filtereditinerarys.map((itinerary: any) => (
                    <ItineraryCard key={itinerary.id} itinerary={itinerary} />
                  ))}
                </div>
              ) : (
                <div className="card-elevated p-12 text-center">
                  <p className="text-lg font-bold text-foreground mb-2">No itinerarys found</p>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your search or filters
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Saved itinerarys Tab */}
          <TabsContent value="saved">
            {savedLoading ? (
              <ItineraryCardSkeletonGrid count={3} />
            ) : saveditinerarys && saveditinerarys.length > 0 ? (
              <div className="space-y-4">
                {saveditinerarys.map((item: any) => {
                  // Handle both nested (item.itinerary) and direct itinerary structures
                  const itinerary = item.itinerary || item;
                  if (!itinerary || !itinerary.id) return null;
                  return <ItineraryCard key={itinerary.id} itinerary={itinerary} />;
                })}
              </div>
            ) : (
              <div className="card-elevated p-12 text-center">
                <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-bold text-foreground mb-2">No saved itinerarys yet</p>
                <p className="text-sm text-muted-foreground mb-6">
                  Start saving itinerarys you're interested in
                </p>
                <Button onClick={() => setActiveTab('discover')}>
                  Discover itinerarys
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Intro Requests Tab */}
          <TabsContent value="intros">
            <div className="space-y-6">
              {/* Sent Requests */}
              <div className="card-elevated p-6">
                <h3 className="text-xl font-black text-foreground mb-4">
                  Sent Requests ({sentIntros?.length || 0})
                </h3>
                {sentIntros && sentIntros.length > 0 ? (
                  <div className="space-y-3">
                    {sentIntros.map((intro: any) => (
                      <div key={intro.id} className="p-4 bg-secondary/50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <p className="font-bold text-foreground">
                                {intro.builder_username}
                              </p>
                              <Badge variant={
                                intro.status === 'accepted' ? 'default' :
                                intro.status === 'pending' ? 'secondary' : 'outline'
                              }>
                                {intro.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {intro.message}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Sent on {new Date(intro.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No intro requests sent yet
                  </p>
                )}
              </div>

              {/* Received Requests */}
              <div className="card-elevated p-6">
                <h3 className="text-xl font-black text-foreground mb-4">
                  Received Requests ({receivedIntros?.length || 0})
                </h3>
                {receivedIntros && receivedIntros.length > 0 ? (
                  <div className="space-y-3">
                    {receivedIntros.map((intro: any) => (
                      <div key={intro.id} className="p-4 bg-secondary/50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <p className="font-bold text-foreground">
                                From: {intro.investor_username || 'Builder'}
                              </p>
                              <Badge variant={
                                intro.status === 'accepted' ? 'default' :
                                intro.status === 'pending' ? 'secondary' : 'outline'
                              }>
                                {intro.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {intro.message}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Received on {new Date(intro.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No intro requests received yet
                  </p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}


