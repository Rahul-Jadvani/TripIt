import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search as SearchIcon, Loader2 } from 'lucide-react';
import { ItineraryCard } from '@/components/ItineraryCard';

// Simple skeleton component for loading states
const ProjectCardSkeletonGrid = ({ count = 5 }: { count?: number }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
    ))}
  </div>
);
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import { useSearch } from '@/hooks/useSearch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Helper function to get the backend URL
const getBackendUrl = (): string => {
  return 'https://tripit-xgvr.onrender.com';
};

// Transform backend Itinerary data to frontend format (same as useItineraries hook)
function transformProject(backendProject: any) {
  return {
    id: backendProject.id,
    title: backendProject.title,
    tagline: backendProject.tagline || '',
    description: backendProject.description,
    demoUrl: backendProject.demo_url,
    githubUrl: backendProject.github_url,
    hackathonName: backendProject.hackathon_name || '',
    hackathonDate: backendProject.hackathon_date || '',
    techStack: backendProject.tech_stack || [],
    teamMembers: backendProject.team_members || [],
    team_members: backendProject.team_members || [],
    screenshots: backendProject.screenshots?.map((s: any) => s.url) || [],
    authorId: backendProject.user_id,
    author: backendProject.creator ? {
      id: backendProject.creator.id,
      username: backendProject.creator.username,
      email: backendProject.creator.email || '',
      displayName: backendProject.creator.display_name,
      avatar: backendProject.creator.avatar_url,
      bio: backendProject.creator.bio,
      isVerified: backendProject.creator.email_verified || false,
      email_verified: backendProject.creator.email_verified || false,
      isAdmin: backendProject.creator.is_admin || false,
      walletAddress: backendProject.creator.wallet_address,
      wallet_address: backendProject.creator.wallet_address,
      full_wallet_address: backendProject.creator.full_wallet_address,
      github_connected: backendProject.creator.github_connected || false,
      github_username: backendProject.creator.github_username || '',
      has_oxcert: backendProject.creator.has_oxcert || false,
      hasOxcert: backendProject.creator.has_oxcert || false,
      oxcert_tx_hash: backendProject.creator.oxcert_tx_hash,
      oxcert_token_id: backendProject.creator.oxcert_token_id,
      oxcert_metadata: backendProject.creator.oxcert_metadata,
      createdAt: backendProject.creator.created_at,
      updatedAt: backendProject.creator.updated_at || backendProject.creator.created_at,
    } : {
      id: backendProject.user_id,
      username: 'Unknown',
      email: '',
      isVerified: false,
      email_verified: false,
      isAdmin: false,
      github_connected: false,
      github_username: '',
      has_oxcert: false,
      createdAt: '',
      updatedAt: '',
    },
  proofScore: {
    total: backendProject.proof_score || 0,
    verification: backendProject.verification_score || 0,
    community: backendProject.community_score || 0,
    onchain: backendProject.onchain_score || 0,
    validation: backendProject.validation_score || 0,
    quality: backendProject.quality_score || 0,
  },
  onchain_score: backendProject.onchain_score || 0,
  onchainScore: backendProject.onchain_score || 0,
  score_breakdown: backendProject.score_breakdown,
  scoreBreakdown: backendProject.score_breakdown,
    badges: backendProject.badges || [],
    voteCount: (backendProject.upvotes || 0) - (backendProject.downvotes || 0),
    commentCount: backendProject.comment_count || 0,
    userVote: backendProject.user_vote || null,
    user_vote: backendProject.user_vote || null,
    isFeatured: backendProject.is_featured || false,
    createdAt: backendProject.created_at,
    updatedAt: backendProject.updated_at,
  };
}

interface SearchResults {
  Itineraries: any[];
  users: any[];
}

export default function Search() {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'all' | 'Itineraries' | 'users'>('all');

  // Instagram-style search: Debounce query + React Query caching
  const debouncedQuery = useDebounce(query, 300); // 300ms delay
  const { data, isLoading } = useSearch(debouncedQuery);

  // Extract results (with defaults)
  const results = data || { Itineraries: [], users: [], total: 0 };
  const loading = isLoading;

  return (
    <div className="min-h-screen overflow-hidden">
      <div className="container mx-auto px-6 py-12 overflow-hidden">
        <div className="mx-auto max-w-5xl w-full box-border">
          {/* Header section */}
          <div className="mb-10 card-elevated p-8">
            <h1 className="text-3xl font-black text-foreground mb-2">Search</h1>
            <p className="text-sm text-muted-foreground">
              Find itineraries, travel creators, and fellow travelers on TripIt
            </p>
          </div>

          {/* Search Input + Tabs */}
          <div className="mb-10 card-elevated p-6">
            <div className="relative mb-4">
              <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search itineraries, creators, destinations..."
                className="pl-12 text-base rounded-[12px] border-4 border-black shadow-[6px_6px_0_0_#000] h-12"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
                <TabsList className="inline-flex h-auto rounded-[15px] bg-secondary border-4 border-black p-1">
                  <TabsTrigger value="all" className="px-3 py-2 text-sm font-bold data-[state=active]:bg-primary data-[state=active]:text-black">All</TabsTrigger>
                  <TabsTrigger value="Itineraries" className="px-3 py-2 text-sm font-bold data-[state=active]:bg-primary data-[state=active]:text-black">Itineraries ({results.Itineraries?.length || 0})</TabsTrigger>
                  <TabsTrigger value="users" className="px-3 py-2 text-sm font-bold data-[state=active]:bg-primary data-[state=active]:text-black">Builders ({results.users?.length || 0})</TabsTrigger>
                </TabsList>
              </Tabs>
              {query && (
                <span className="text-xs text-muted-foreground">{results.total ?? (results.Itineraries?.length || 0) + (results.users?.length || 0)} results</span>
              )}
            </div>
            {!query && (
              <div className="mt-4">
                <div className="text-xs font-black text-muted-foreground mb-2">Explore by Travel Style</div>
                <div className="flex flex-wrap gap-2">
                  {['Solo Travel', 'Adventure', 'Cultural', 'Food & Wine', 'Photography', 'Budget'].map((t) => (
                    <button
                      key={t}
                      onClick={() => { setQuery(t); setTab('Itineraries'); }}
                      className="inline-flex items-center px-3 py-1.5 rounded-[12px] bg-secondary border-2 border-black text-xs font-bold shadow-[3px_3px_0_0_#000] hover:shadow-[4px_4px_0_0_#000] hover:-translate-y-0.5 transition-transform"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Loading State */}
          {loading && query && (
            <div className="space-y-8">
              {/* Itineraries Section Skeleton */}
              <div>
                <div className="h-7 w-32 bg-secondary rounded mb-4"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="h-[520px] bg-secondary rounded-lg"></div>
                  ))}
                </div>
              </div>

              {/* Users Section Skeleton */}
              <div>
                <div className="h-7 w-32 bg-secondary rounded mb-4"></div>
                <div className="grid gap-4">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div key={idx} className="card-elevated p-4 flex items-center gap-4 h-20"></div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Results or Empty State */}
          {!loading && !query && (
            <div className="card-elevated p-12 text-center">
              <div className="space-y-4">
                <div className="mx-auto h-14 w-14 rounded-[12px] border-4 border-black bg-secondary grid place-items-center shadow-[6px_6px_0_0_#000]"><SearchIcon className="h-7 w-7 text-foreground" /></div>
                <p className="text-lg font-bold text-foreground">Start your search</p>
                <p className="text-sm text-muted-foreground">
                  Find amazing itineraries, discover travel creators, or connect with fellow travelers
                </p>
              </div>
            </div>
          )}

          {!loading && results && (
            <div className="space-y-8">
              {/* Itineraries Results */}
              {(tab === 'all' || tab === 'Itineraries') && results.Itineraries && results.Itineraries.length > 0 && (
                <div>
                  <h2 className="text-xl font-black mb-4">
                    Itineraries ({results.Itineraries.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {results.Itineraries.map((project) => (
                      <ItineraryCard key={project.id} project={project} />
                    ))}
                  </div>
                </div>
              )}

              {/* Users Results */}
              {(tab === 'all' || tab === 'users') && results.users && results.users.length > 0 && (
                <div>
                  <h2 className="text-xl font-black mb-4">
                    Travel Creators ({results.users.length})
                  </h2>
                  <div className="grid gap-4">
                    {results.users.map((user) => (
                      <Link
                        key={user.id}
                        to={`/u/${user.username}`}
                        className="card-elevated p-4 flex items-center gap-4 hover:shadow-lg transition-shadow rounded-xl"
                      >
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={user.avatar_url} alt={user.username} />
                          <AvatarFallback className="bg-primary text-black font-bold">
                            {user.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold text-foreground">{user.display_name || user.username}</p>
                          <p className="text-sm text-muted-foreground">@{user.username}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* No Results */}
              {query && (!results.Itineraries || results.Itineraries.length === 0) &&
                (!results.users || results.users.length === 0) && (
                  <div className="card-elevated p-12 text-center">
                    <div className="space-y-4">
                      <p className="text-lg font-bold text-foreground">No results for \"{query}\"</p>
                      <p className="text-sm text-muted-foreground">
                        Try different keywords or browse recent Itineraries
                      </p>
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}










