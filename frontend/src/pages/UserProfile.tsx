import { useParams, useNavigate, Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Shield, Award, Loader2, AlertCircle, Github, ExternalLink, MapPin, Briefcase, TrendingUp, Globe, Link as LinkIcon, MessageSquare, Send, Layers } from 'lucide-react';
import { useUserByUsername } from '@/hooks/useUser';
import { useUserProjects, useUserTaggedProjects } from '@/hooks/useProjects';
import { ItineraryCard } from '@/components/ItineraryCard';

// Simple skeleton component for loading states
const ProjectCardSkeletonGrid = ({ count = 5 }: { count?: number }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
    ))}
  </div>
);
import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

export default function UserProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const { data: user, isLoading: userLoading, error: userError } = useUserByUsername(username || '');
  const { data: projectsData, isLoading: projectsLoading } = useUserProjects(user?.id || '');
  const { data: taggedProjectsData, isLoading: taggedProjectsLoading } = useUserTaggedProjects(user?.id || '');

  // Fetch investor profile if user is an investor
  const { data: investorProfile } = useQuery({
    queryKey: ['investorProfile', user?.id],
    queryFn: async () => {
      const response = await adminService.getUserInvestorProfile(user!.id);
      return response.data.data;
    },
    enabled: !!user?.id && !!(user as any)?.isInvestor,
  });

  // Loading state
  if (userLoading) {
    return (
      <div className="bg-background min-h-screen">
        <div className="container mx-auto px-6 py-12">
          <div className="mx-auto max-w-5xl">
            <div className="card-elevated p-20 text-center flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (userError || !user) {
    return (
      <div className="bg-background min-h-screen">
        <div className="container mx-auto px-6 py-12">
          <div className="mx-auto max-w-5xl">
            <div className="card-elevated p-12 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-lg font-bold text-foreground mb-2">User not found</p>
              <p className="text-sm text-muted-foreground">This user doesn't exist or has been removed</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen overflow-hidden">
      <div className="container mx-auto px-6 py-12 overflow-hidden">
        <div className="mx-auto max-w-5xl w-full box-border">
          {/* Profile Header Card */}
          <div className="card-elevated p-8 mb-10">
            <div className="flex flex-col items-center gap-8 md:flex-row md:items-start">
              <Avatar className="h-32 w-32 border-4 border-primary flex-shrink-0">
                <AvatarImage src={user.avatar} alt={username} />
                <AvatarFallback className="text-4xl font-black bg-primary text-black">
                  {user.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 text-center md:text-left">
                <div className="mb-4 flex flex-col items-center gap-3 md:items-start md:flex-row flex-wrap">
                  <h1 className="text-3xl font-black text-foreground">
                    {user.displayName || user.username}
                  </h1>
                  {user.isAdmin && (
                    <Badge className="bg-destructive text-white">
                      <Award className="mr-1 h-3 w-3" />
                      Admin
                    </Badge>
                  )}
                  {(user as any)?.isInvestor && (
                    <Badge className="bg-primary text-black">
                      <Award className="mr-1 h-3 w-3" />
                      Investor
                    </Badge>
                  )}
                  {(user as any)?.isValidator && (
                    <Badge className="bg-blue-600 text-white">
                      <Shield className="mr-1 h-3 w-3" />
                      Validator
                    </Badge>
                  )}
                  {user.github_connected && user.github_username && (
                    <a
                      href={`https://github.com/${user.github_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/50 border border-border text-foreground hover:bg-secondary transition-smooth text-sm font-semibold"
                      title="View GitHub Profile"
                    >
                      <Github className="h-4 w-4" />
                      {user.github_username}
                    </a>
                  )}
                </div>
                <p className="mb-4 text-lg font-bold text-primary mb-3">@{user.username}</p>
                {user.bio && <p className="text-base text-foreground leading-relaxed">{user.bio}</p>}

                {/* Action Buttons - Show for all users when logged in and not viewing own profile */}
                {currentUser && currentUser.username !== user.username && (
                  <div className="flex items-center gap-2 mt-4">
                    <Button
                      onClick={() => navigate(`/messages?user=${user.id}`)}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Send Message
                    </Button>
                    <Button
                      onClick={() => navigate('/intros')}
                      size="sm"
                      className="btn-primary gap-2"
                    >
                      <Send className="h-4 w-4" />
                      Request Intro
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Section */}
            <div className="mt-8 grid grid-cols-3 gap-4 border-t-4 border-primary pt-8">
              <div className="text-center">
                <div className="text-4xl font-black text-primary mb-1">{user.projectCount}</div>
                <div className="text-sm font-bold text-muted-foreground">Projects</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-black text-primary mb-1">{user.karma}</div>
                <div className="text-sm font-bold text-muted-foreground">Karma</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-black text-primary mb-1">
                  {new Date(user.createdAt).getFullYear()}
                </div>
                <div className="text-sm font-bold text-muted-foreground">Joined</div>
              </div>
            </div>
          </div>

          {/* Investor Profile Section */}
          {(user as any)?.isInvestor && investorProfile && (
            <div className="mb-10 card-elevated p-8">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-black text-foreground">Investor Profile</h2>
                  <Badge className="bg-primary text-black">
                    <Award className="h-3 w-3 mr-1" />
                    Verified Investor
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Public investor profile information
                </p>
              </div>

              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {investorProfile.name && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Name</div>
                      <div className="text-sm font-medium">{investorProfile.name}</div>
                    </div>
                  )}
                  {investorProfile.investor_type && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Investor Type</div>
                      <div className="text-sm font-medium capitalize">{investorProfile.investor_type}</div>
                    </div>
                  )}
                  {investorProfile.location && (
                    <div>
                      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                        <MapPin className="h-3 w-3" />
                        Location
                      </div>
                      <div className="text-sm font-medium">{investorProfile.location}</div>
                    </div>
                  )}
                  {investorProfile.company_name && (
                    <div>
                      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                        <Briefcase className="h-3 w-3" />
                        Company
                      </div>
                      <div className="text-sm font-medium">{investorProfile.company_name}</div>
                    </div>
                  )}
                </div>

                {/* Investment Focus */}
                {(investorProfile.investment_stages?.length > 0 || investorProfile.industries?.length > 0) && (
                  <div>
                    <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-2">
                      <TrendingUp className="h-3 w-3" />
                      Investment Focus
                    </div>
                    <div className="space-y-2">
                      {investorProfile.investment_stages?.length > 0 && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Stages</div>
                          <div className="flex flex-wrap gap-1">
                            {investorProfile.investment_stages.map((stage: string) => (
                              <Badge key={stage} variant="secondary" className="text-xs">
                                {stage}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {investorProfile.industries?.length > 0 && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Industries</div>
                          <div className="flex flex-wrap gap-1">
                            {investorProfile.industries.map((industry: string) => (
                              <Badge key={industry} variant="secondary" className="text-xs">
                                {industry}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {investorProfile.geographic_focus?.length > 0 && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Geographic Focus</div>
                          <div className="flex flex-wrap gap-1">
                            {investorProfile.geographic_focus.map((region: string) => (
                              <Badge key={region} variant="secondary" className="text-xs">
                                {region}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Bio */}
                {investorProfile.bio && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">Bio</div>
                    <p className="text-sm text-foreground/90">{investorProfile.bio}</p>
                  </div>
                )}

                {/* Investment Thesis */}
                {investorProfile.investment_thesis && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">Investment Thesis</div>
                    <p className="text-sm text-foreground/90">{investorProfile.investment_thesis}</p>
                  </div>
                )}

                {/* Investment Details */}
                {(investorProfile.ticket_size_min || investorProfile.ticket_size_max || investorProfile.num_investments || investorProfile.fund_size) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(investorProfile.ticket_size_min || investorProfile.ticket_size_max) && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">Ticket Size</div>
                        <div className="text-sm font-medium">
                          {investorProfile.ticket_size_min && investorProfile.ticket_size_max
                            ? `$${investorProfile.ticket_size_min}K - $${investorProfile.ticket_size_max}K`
                            : investorProfile.ticket_size_min
                            ? `From $${investorProfile.ticket_size_min}K`
                            : `Up to $${investorProfile.ticket_size_max}K`}
                        </div>
                      </div>
                    )}
                    {investorProfile.num_investments && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">Number of Investments</div>
                        <div className="text-sm font-medium">{investorProfile.num_investments}</div>
                      </div>
                    )}
                    {investorProfile.fund_size && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">Fund Size</div>
                        <div className="text-sm font-medium">{investorProfile.fund_size}</div>
                      </div>
                    )}
                    {investorProfile.years_experience && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">Years of Experience</div>
                        <div className="text-sm font-medium">{investorProfile.years_experience}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Notable Investments */}
                {investorProfile.notable_investments && investorProfile.notable_investments.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-2">Notable Investments</div>
                    <div className="flex flex-wrap gap-2">
                      {investorProfile.notable_investments.map((investment: any, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {typeof investment === 'string'
                            ? investment
                            : `${investment.company || 'Company'}${investment.stage ? ` (${investment.stage})` : ''}${investment.year ? ` - ${investment.year}` : ''}`
                          }
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Portfolio Highlights */}
                {investorProfile.portfolio_highlights && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">Portfolio Highlights</div>
                    <p className="text-sm text-foreground/90">{investorProfile.portfolio_highlights}</p>
                  </div>
                )}

                {/* Value Adds */}
                {investorProfile.value_adds && investorProfile.value_adds.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-2">Value Adds</div>
                    <div className="flex flex-wrap gap-2">
                      {investorProfile.value_adds.map((valueAdd: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {valueAdd}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Expertise Areas */}
                {investorProfile.expertise_areas && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">Expertise Areas</div>
                    <p className="text-sm text-foreground/90">{investorProfile.expertise_areas}</p>
                  </div>
                )}

                {/* Links */}
                {(investorProfile.linkedin_url || investorProfile.website_url || investorProfile.twitter_url) && (
                  <div>
                    <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-2">
                      <LinkIcon className="h-3 w-3" />
                      Links
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {investorProfile.linkedin_url && (
                        <a
                          href={investorProfile.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          LinkedIn
                          <Globe className="h-3 w-3" />
                        </a>
                      )}
                      {investorProfile.website_url && (
                        <a
                          href={investorProfile.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          Website
                          <Globe className="h-3 w-3" />
                        </a>
                      )}
                      {investorProfile.twitter_url && (
                        <a
                          href={investorProfile.twitter_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          Twitter
                          <Globe className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tabs Section */}
          <Tabs defaultValue="projects">
            <TabsList className="inline-flex h-auto rounded-[15px] bg-secondary border-4 border-black p-1 mb-8">
              <TabsTrigger
                value="projects"
                className="rounded-md px-4 py-2 text-sm font-bold transition-quick data-[state=active]:bg-primary data-[state=active]:text-black"
              >
                Projects ({projectsData?.data?.length || 0})
              </TabsTrigger>
              <TabsTrigger
                value="tagged"
                className="rounded-md px-4 py-2 text-sm font-bold transition-quick data-[state=active]:bg-primary data-[state=active]:text-black"
              >
                Tagged ({taggedProjectsData?.data?.length || 0})
              </TabsTrigger>
              <TabsTrigger
                value="owned-chains"
                className="rounded-md px-4 py-2 text-sm font-bold transition-quick data-[state=active]:bg-primary data-[state=active]:text-black"
              >
                Owned layerz ({ownedChainsData?.chains?.length || 0})
              </TabsTrigger>
              <TabsTrigger
                value="following-chains"
                className="rounded-md px-4 py-2 text-sm font-bold transition-quick data-[state=active]:bg-primary data-[state=active]:text-black"
              >
                Following layerz ({followingChainsData?.chains?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="projects">
              {projectsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div key={idx} className="h-[520px] bg-secondary rounded-lg animate-pulse"></div>
                  ))}
                </div>
              ) : projectsData?.data && projectsData.data.length > 0 ? (
                <div className="space-y-4">
                  {projectsData.data.map((project: any) => (
                    <ItineraryCard key={project.id} itinerary={project} />
                  ))}
                </div>
              ) : (
                <div className="card-elevated p-12 text-center">
                  <div className="space-y-3">
                    <p className="text-lg font-bold text-foreground">No projects yet</p>
                    <p className="text-sm text-muted-foreground">
                      Check back soon to see {user.displayName || user.username}'s projects
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="tagged">
              {taggedProjectsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div key={idx} className="h-[520px] bg-secondary rounded-lg animate-pulse"></div>
                  ))}
                </div>
              ) : taggedProjectsData?.data && taggedProjectsData.data.length > 0 ? (
                <div className="space-y-4">
                  {taggedProjectsData.data.map((project: any) => (
                    <ItineraryCard key={project.id} itinerary={project} />
                  ))}
                </div>
              ) : (
                <div className="card-elevated p-12 text-center">
                  <div className="space-y-3">
                    <p className="text-lg font-bold text-foreground">No tagged projects yet</p>
                    <p className="text-sm text-muted-foreground">
                      {user.displayName || user.username} hasn't been tagged as a crew member in any projects yet
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="owned-chains">
              {ownedChainsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="card-elevated p-6 animate-pulse">
                      <div className="flex items-start gap-4">
                        <div className="h-16 w-16 rounded-full bg-secondary flex-shrink-0"></div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="h-6 w-32 bg-secondary rounded"></div>
                          <div className="h-4 w-full bg-secondary rounded"></div>
                          <div className="h-4 w-5/6 bg-secondary rounded"></div>
                          <div className="flex items-center gap-4 text-xs mt-3">
                            <div className="h-3 w-16 bg-secondary rounded"></div>
                            <div className="h-3 w-16 bg-secondary rounded"></div>
                            <div className="h-3 w-16 bg-secondary rounded"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : ownedChainsData?.chains && ownedChainsData.chains.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ownedChainsData.chains.map((chain: any) => (
                    <Link
                      key={chain.id}
                      to={`/layerz/${chain.slug}`}
                      className="card-elevated p-6 hover:border-primary transition-all"
                    >
                      <div className="flex items-start gap-4">
                        <Avatar className="h-16 w-16 border-2 border-border">
                          {chain.logo_url ? (
                            <AvatarImage src={chain.logo_url} alt={chain.name} />
                          ) : (
                            <AvatarFallback className="bg-primary/20 text-primary font-bold text-xl">
                              {chain.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-lg truncate">{chain.name}</h3>
                            {chain.is_featured && (
                              <Badge variant="default" className="gap-1">
                                <Award className="h-3 w-3" />
                                Featured
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {chain.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{chain.project_count} projects</span>
                            <span>{chain.follower_count} followers</span>
                            <span>{chain.view_count} views</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="card-elevated p-12 text-center">
                  <div className="space-y-3">
                    <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-bold text-foreground">No layerz created yet</p>
                    <p className="text-sm text-muted-foreground">
                      {user.displayName || user.username} hasn't created any layerz yet
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="following-chains">
              {followingChainsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="card-elevated p-6 animate-pulse">
                      <div className="flex items-start gap-4">
                        <div className="h-16 w-16 rounded-full bg-secondary flex-shrink-0"></div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="h-6 w-32 bg-secondary rounded"></div>
                          <div className="h-4 w-full bg-secondary rounded"></div>
                          <div className="h-4 w-5/6 bg-secondary rounded"></div>
                          <div className="flex items-center gap-4 text-xs mt-3">
                            <div className="h-3 w-16 bg-secondary rounded"></div>
                            <div className="h-3 w-16 bg-secondary rounded"></div>
                            <div className="h-3 w-16 bg-secondary rounded"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : followingChainsData?.chains && followingChainsData.chains.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {followingChainsData.chains.map((chain: any) => (
                    <Link
                      key={chain.id}
                      to={`/layerz/${chain.slug}`}
                      className="card-elevated p-6 hover:border-primary transition-all"
                    >
                      <div className="flex items-start gap-4">
                        <Avatar className="h-16 w-16 border-2 border-border">
                          {chain.logo_url ? (
                            <AvatarImage src={chain.logo_url} alt={chain.name} />
                          ) : (
                            <AvatarFallback className="bg-primary/20 text-primary font-bold text-xl">
                              {chain.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-lg truncate">{chain.name}</h3>
                            {chain.is_featured && (
                              <Badge variant="default" className="gap-1">
                                <Award className="h-3 w-3" />
                                Featured
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {chain.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{chain.project_count} projects</span>
                            <span>{chain.follower_count} followers</span>
                            <span>{chain.view_count} views</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="card-elevated p-12 text-center">
                  <div className="space-y-3">
                    <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-bold text-foreground">Not following any layerz</p>
                    <p className="text-sm text-muted-foreground">
                      {user.displayName || user.username} hasn't followed any layerz yet
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
