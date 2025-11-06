import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Building2, MapPin, DollarSign, Target, Users, Twitter, Linkedin, Globe, Filter, MessageSquare, Send } from 'lucide-react';
import { InvestorCardSkeletonGrid } from '@/components/InvestorCardSkeleton';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

const getBackendUrl = (): string => {
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
  const isDev = currentHost.includes('localhost') || currentHost.includes('127.0.0.1');
  return isDev ? 'http://localhost:5000' : 'https://discovery-platform.onrender.com';
};

const INDUSTRIES = [
  'AI/ML',
  'Web3/Blockchain',
  'FinTech',
  'HealthTech',
  'EdTech',
  'E-Commerce',
  'SaaS',
  'DevTools',
  'IoT',
  'Gaming',
  'Social',
  'Other'
];

const INVESTMENT_STAGES = [
  'Pre-seed',
  'Seed',
  'Series A',
  'Series B',
  'Series B+',
  'Growth'
];

interface Investor {
  id: string;
  investor_type: string;
  name?: string;
  company_name?: string;
  position_title?: string;
  location?: string;
  years_experience?: string;
  investment_stages?: string[];
  industries?: string[];
  ticket_size_min?: number;
  ticket_size_max?: number;
  geographic_focus?: string[];
  bio?: string;
  investment_thesis?: string;
  num_investments?: string;
  notable_investments?: Array<{ company: string; stage: string; year: string }>;
  value_adds?: string[];
  expertise_areas?: string;
  is_public: boolean;
  open_to_requests: boolean;
  twitter_url?: string;
  linkedin_url?: string;
  website_url?: string;
  calendar_link?: string;
  fund_size?: string;
  user?: {
    username: string;
    email: string;
  };
}

export default function Investors() {
  const navigate = useNavigate();
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [investorTypeFilter, setInvestorTypeFilter] = useState<string>('all');
  const [openToRequestsOnly, setOpenToRequestsOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchInvestors();
  }, []);

  const fetchInvestors = async () => {
    setLoading(true);
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/investor-requests/public`);
      const data = await response.json();

      if (data.status === 'success') {
        setInvestors(data.data.investors || []);
      }
    } catch (error) {
      console.error('Failed to fetch investors:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvestors = useMemo(() => {
    return investors.filter(investor => {
      // Search by name, company, or bio
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          investor.user?.username.toLowerCase().includes(query) ||
          investor.company_name?.toLowerCase().includes(query) ||
          investor.bio?.toLowerCase().includes(query) ||
          investor.position_title?.toLowerCase().includes(query);

        if (!matchesSearch) return false;
      }

      // Filter by investor type
      if (investorTypeFilter !== 'all' && investor.investor_type !== investorTypeFilter) {
        return false;
      }

      // Filter by open to requests
      if (openToRequestsOnly && !investor.open_to_requests) {
        return false;
      }

      // Filter by industries
      if (selectedIndustries.length > 0) {
        const hasMatchingIndustry = selectedIndustries.some(industry =>
          investor.industries?.includes(industry)
        );
        if (!hasMatchingIndustry) return false;
      }

      // Filter by investment stages
      if (selectedStages.length > 0) {
        const hasMatchingStage = selectedStages.some(stage =>
          investor.investment_stages?.includes(stage)
        );
        if (!hasMatchingStage) return false;
      }

      return true;
    });
  }, [investors, searchQuery, investorTypeFilter, openToRequestsOnly, selectedIndustries, selectedStages]);

  const toggleIndustry = (industry: string) => {
    if (selectedIndustries.includes(industry)) {
      setSelectedIndustries(selectedIndustries.filter(i => i !== industry));
    } else {
      setSelectedIndustries([...selectedIndustries, industry]);
    }
  };

  const toggleStage = (stage: string) => {
    if (selectedStages.includes(stage)) {
      setSelectedStages(selectedStages.filter(s => s !== stage));
    } else {
      setSelectedStages([...selectedStages, stage]);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-20 px-4 pb-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/20 to-accent/20 border-2 border-primary/50 rounded-full mb-4 shadow-lg">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-xs font-black text-primary tracking-wide">INVESTOR DIRECTORY</span>
          </div>
          <h1 className="text-4xl font-black mb-4">Discover Investors</h1>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Connect with investors who are actively looking for builders like you
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, company, or expertise..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-secondary flex items-center gap-2 ${showFilters ? 'bg-primary/10' : ''}`}
            >
              <Filter className="h-4 w-4" />
              Filters
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <Card>
              <CardContent className="pt-6 space-y-6">
                {/* Quick Filters */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setInvestorTypeFilter('all')}
                    className={`px-3 py-1 rounded-full border-2 text-sm font-medium transition-all ${
                      investorTypeFilter === 'all'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    All Types
                  </button>
                  <button
                    onClick={() => setInvestorTypeFilter('individual')}
                    className={`px-3 py-1 rounded-full border-2 text-sm font-medium transition-all ${
                      investorTypeFilter === 'individual'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    Individuals
                  </button>
                  <button
                    onClick={() => setInvestorTypeFilter('organization')}
                    className={`px-3 py-1 rounded-full border-2 text-sm font-medium transition-all ${
                      investorTypeFilter === 'organization'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    VCs/Funds
                  </button>
                  <label className="flex items-center gap-2 px-3 py-1 rounded-full border-2 border-border hover:border-primary/50 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={openToRequestsOnly}
                      onChange={(e) => setOpenToRequestsOnly(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">Open to Requests</span>
                  </label>
                </div>

                {/* Industry Filter */}
                <div>
                  <Label className="text-sm font-bold mb-2 block">Industries</Label>
                  <div className="flex flex-wrap gap-2">
                    {INDUSTRIES.map(industry => (
                      <button
                        key={industry}
                        onClick={() => toggleIndustry(industry)}
                        className={`px-3 py-1 rounded-full border-2 text-xs font-medium transition-all ${
                          selectedIndustries.includes(industry)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        {industry}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stage Filter */}
                <div>
                  <Label className="text-sm font-bold mb-2 block">Investment Stages</Label>
                  <div className="flex flex-wrap gap-2">
                    {INVESTMENT_STAGES.map(stage => (
                      <button
                        key={stage}
                        onClick={() => toggleStage(stage)}
                        className={`px-3 py-1 rounded-full border-2 text-xs font-medium transition-all ${
                          selectedStages.includes(stage)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        {stage}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results Count */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Showing {filteredInvestors.length} of {investors.length} investors
            </div>
            {(selectedIndustries.length > 0 || selectedStages.length > 0 || investorTypeFilter !== 'all' || openToRequestsOnly) && (
              <button
                onClick={() => {
                  setSelectedIndustries([]);
                  setSelectedStages([]);
                  setInvestorTypeFilter('all');
                  setOpenToRequestsOnly(false);
                }}
                className="text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Investors Grid */}
        {loading ? (
          <InvestorCardSkeletonGrid count={6} />
        ) : filteredInvestors.length === 0 ? (
          <Card>
            <CardContent className="py-20 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                {investors.length === 0
                  ? 'No investors in the directory yet. Be the first!'
                  : 'No investors match your filters. Try adjusting your search.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {filteredInvestors.map((investor) => (
              <Card
                key={investor.id}
                className="card-interactive hover:shadow-lg transition-all rounded-xl border border-border/60 bg-card/80"
              >
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-bold">{investor.name || investor.user?.username}</h3>
                        {investor.open_to_requests && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase cursor-default select-none"
                            aria-label="Open to Requests"
                          >
                            Open to Requests
                          </span>
                        )}
                      </div>
                      {investor.position_title && (
                        <p className="text-sm text-muted-foreground">{investor.position_title}</p>
                      )}
                      {investor.company_name && (
                        <p className="text-sm font-medium flex items-center gap-1 mt-1">
                          <Building2 className="h-3 w-3" />
                          {investor.company_name}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-[11px] px-2 py-0.5 rounded-full">
                      {investor.investor_type === 'individual' ? 'Individual' : 'Fund'}
                    </Badge>
                  </div>

                  {/* Bio */}
                  {investor.bio && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {investor.bio}
                    </p>
                  )}

                  {/* Key Info Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                    {investor.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span>{investor.location}</span>
                      </div>
                    )}
                    {(investor.ticket_size_min || investor.ticket_size_max) && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-muted-foreground" />
                        <span>
                          ${(investor.ticket_size_min || 0) / 1000}k-${(investor.ticket_size_max || 0) / 1000}k
                        </span>
                      </div>
                    )}
                    {investor.num_investments && (
                      <div className="flex items-center gap-1">
                        <Target className="h-3 w-3 text-muted-foreground" />
                        <span>{investor.num_investments} investments</span>
                      </div>
                    )}
                    {investor.years_experience && (
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span>{investor.years_experience} years</span>
                      </div>
                    )}
                  </div>

                  {/* Investment Focus */}
                  {investor.investment_stages && investor.investment_stages.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-bold text-muted-foreground mb-1">Stages:</p>
                      <div className="flex flex-wrap gap-1">
                        {investor.investment_stages.slice(0, 3).map(stage => (
                          <Badge key={stage} variant="secondary" className="text-xs">
                            {stage}
                          </Badge>
                        ))}
                        {investor.investment_stages.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{investor.investment_stages.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {investor.industries && investor.industries.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-bold text-muted-foreground mb-1">Industries:</p>
                      <div className="flex flex-wrap gap-1">
                        {investor.industries.slice(0, 4).map(industry => (
                          <Badge key={industry} variant="secondary" className="text-xs">
                            {industry}
                          </Badge>
                        ))}
                        {investor.industries.length > 4 && (
                          <Badge variant="secondary" className="text-xs">
                            +{investor.industries.length - 4}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Value Adds */}
                  {investor.value_adds && investor.value_adds.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-bold text-muted-foreground mb-1">Can Help With:</p>
                      <div className="flex flex-wrap gap-1">
                        {investor.value_adds.slice(0, 3).map(value => (
                          <Badge key={value} variant="outline" className="text-xs">
                            {value}
                          </Badge>
                        ))}
                        {investor.value_adds.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{investor.value_adds.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Links and Actions */}
                  <div className="flex gap-2 pt-4 border-t border-border/40 flex-wrap items-center">
                    {/* Social Links */}
                    {investor.linkedin_url && (
                      <a
                        href={investor.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary text-xs px-3 py-1 h-8 flex items-center gap-1 rounded-full"
                      >
                        <Linkedin className="h-3 w-3" />
                        LinkedIn
                      </a>
                    )}
                    {investor.twitter_url && (
                      <a
                        href={investor.twitter_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary text-xs px-3 py-1 h-8 flex items-center gap-1 rounded-full"
                      >
                        <Twitter className="h-3 w-3" />
                        Twitter
                      </a>
                    )}
                    {investor.website_url && (
                      <a
                        href={investor.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary text-xs px-3 py-1 h-8 flex items-center gap-1 rounded-full"
                      >
                        <Globe className="h-3 w-3" />
                        Website
                      </a>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 ml-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/u/${investor.user?.username}`)}
                        className="text-xs px-3 py-1 h-8 rounded-full"
                      >
                        View Profile
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => navigate('/intros')}
                        className="text-xs px-3 py-1 h-8 gap-1 rounded-full"
                      >
                        <Send className="h-3 w-3" />
                        Request Intro
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
