import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/api';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Search,
  MapPin,
  Briefcase,
  TrendingUp,
  Building2,
  Globe,
  Linkedin,
  Twitter,
  ExternalLink,
  Loader2,
  Users,
  Filter,
  Award
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function InvestorDirectory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<string>('');

  // Fetch public investors
  const { data: investors, isLoading } = useQuery({
    queryKey: ['publicInvestors'],
    queryFn: async () => {
      const response = await adminService.getPublicInvestors();
      return response.data.data;
    },
  });

  // Extract unique industries and stages for filters
  const allIndustries = investors
    ? Array.from(new Set(investors.flatMap((inv: any) => inv.industries || [])))
    : [];
  const allStages = investors
    ? Array.from(new Set(investors.flatMap((inv: any) => inv.investment_stages || [])))
    : [];

  // Filter investors
  const filteredInvestors = investors?.filter((investor: any) => {
    const matchesSearch = !searchQuery ||
      investor.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      investor.user?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      investor.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      investor.bio?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesIndustry = !selectedIndustry ||
      investor.industries?.includes(selectedIndustry);

    const matchesStage = !selectedStage ||
      investor.investment_stages?.includes(selectedStage);

    return matchesSearch && matchesIndustry && matchesStage;
  });

  return (
    <div className="min-h-screen bg-background pt-20 px-4 pb-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Users className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-black text-foreground">Investor Directory</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Connect with verified investors looking for innovative projects
          </p>
        </div>

        {/* Search and Filters */}
        <div className="card-elevated p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search investors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Industry Filter */}
            <div>
              <select
                value={selectedIndustry}
                onChange={(e) => setSelectedIndustry(e.target.value)}
                className="w-full h-10 px-3 rounded-md border-3 border-black bg-background text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All Industries</option>
                {allIndustries.map((industry: any) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </div>

            {/* Stage Filter */}
            <div>
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="w-full h-10 px-3 rounded-md border-3 border-black bg-background text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All Stages</option>
                {allStages.map((stage: any) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filters */}
          {(searchQuery || selectedIndustry || selectedStage) && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Active filters:</span>
                {searchQuery && (
                  <Badge variant="secondary" className="gap-1">
                    Search: {searchQuery}
                    <button onClick={() => setSearchQuery('')} className="ml-1 hover:text-destructive">×</button>
                  </Badge>
                )}
                {selectedIndustry && (
                  <Badge variant="secondary" className="gap-1">
                    {selectedIndustry}
                    <button onClick={() => setSelectedIndustry('')} className="ml-1 hover:text-destructive">×</button>
                  </Badge>
                )}
                {selectedStage && (
                  <Badge variant="secondary" className="gap-1">
                    {selectedStage}
                    <button onClick={() => setSelectedStage('')} className="ml-1 hover:text-destructive">×</button>
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        {!isLoading && filteredInvestors && (
          <div className="mb-4">
            <p className="text-sm font-medium text-muted-foreground">
              Showing {filteredInvestors.length} investor{filteredInvestors.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="card-elevated p-20 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading investors...</p>
          </div>
        )}

        {/* Investor Grid */}
        {!isLoading && filteredInvestors && filteredInvestors.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInvestors.map((investor: any) => (
              <Link
                key={investor.id}
                to={`/u/${investor.user?.username}`}
                className="card-elevated p-6 hover:shadow-lg transition-all hover:scale-[1.02]"
              >
                {/* Header */}
                <div className="flex items-start gap-4 mb-4">
                  <Avatar className="h-16 w-16 border-3 border-primary flex-shrink-0">
                    <AvatarImage src={investor.user?.avatar_url} alt={investor.name} />
                    <AvatarFallback className="text-lg font-black bg-primary text-black">
                      {investor.name?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-black text-foreground truncate mb-1">
                      {investor.name}
                    </h3>
                    <p className="text-sm text-primary font-bold">@{investor.user?.username}</p>
                    <Badge className="mt-2 bg-primary text-black text-xs capitalize">
                      <Award className="h-3 w-3 mr-1" />
                      {investor.investor_type}
                    </Badge>
                  </div>
                </div>

                {/* Bio */}
                {investor.bio && (
                  <p className="text-sm text-foreground/80 mb-4 line-clamp-2">
                    {investor.bio}
                  </p>
                )}

                {/* Details */}
                <div className="space-y-2 mb-4">
                  {investor.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-foreground/80 truncate">{investor.location}</span>
                    </div>
                  )}
                  {investor.company_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-foreground/80 truncate">{investor.company_name}</span>
                    </div>
                  )}
                </div>

                {/* Investment Focus */}
                {investor.investment_stages && investor.investment_stages.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1.5">
                      <TrendingUp className="h-3 w-3" />
                      Investment Stages
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {investor.investment_stages.slice(0, 3).map((stage: string) => (
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

                {/* Industries */}
                {investor.industries && investor.industries.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1.5">
                      <Briefcase className="h-3 w-3" />
                      Industries
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {investor.industries.slice(0, 3).map((industry: string) => (
                        <Badge key={industry} variant="secondary" className="text-xs">
                          {industry}
                        </Badge>
                      ))}
                      {investor.industries.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{investor.industries.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Social Links */}
                <div className="flex items-center gap-3 pt-3 border-t border-border">
                  {investor.linkedin_url && (
                    <a
                      href={investor.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title="LinkedIn"
                    >
                      <Linkedin className="h-4 w-4" />
                    </a>
                  )}
                  {investor.twitter_url && (
                    <a
                      href={investor.twitter_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title="Twitter"
                    >
                      <Twitter className="h-4 w-4" />
                    </a>
                  )}
                  {investor.website_url && (
                    <a
                      href={investor.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title="Website"
                    >
                      <Globe className="h-4 w-4" />
                    </a>
                  )}
                  <div className="ml-auto">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredInvestors && filteredInvestors.length === 0 && (
          <div className="card-elevated p-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-bold text-foreground mb-2">No investors found</p>
            <p className="text-sm text-muted-foreground">
              {searchQuery || selectedIndustry || selectedStage
                ? 'Try adjusting your filters'
                : 'Check back soon for verified investors'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
