import { useQuery } from '@tanstack/react-query';
import { searchService } from '@/services/api';

// Transform backend project data (same as useProjects)
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
    screenshots: backendProject.screenshots?.map((s: any) => s.url) || [],
    authorId: backendProject.user_id,
    author: backendProject.creator ? {
      id: backendProject.creator.id,
      username: backendProject.creator.username,
      displayName: backendProject.creator.display_name,
      avatar: backendProject.creator.avatar_url,
      bio: backendProject.creator.bio,
      isVerified: backendProject.creator.email_verified || false,
      walletAddress: backendProject.creator.wallet_address,
      has_oxcert: backendProject.creator.has_oxcert || false,
    } : {
      id: backendProject.user_id,
      username: 'Unknown',
      isVerified: false,
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
    isFeatured: backendProject.is_featured || false,
    createdAt: backendProject.created_at,
    updatedAt: backendProject.updated_at,
  };
}

// Transform backend user data
function transformUser(backendUser: any) {
  return {
    id: backendUser.id,
    username: backendUser.username,
    displayName: backendUser.display_name,
    avatar: backendUser.avatar_url,
    bio: backendUser.bio,
    isVerified: backendUser.email_verified || false,
    walletAddress: backendUser.wallet_address,
    has_oxcert: backendUser.has_oxcert || false,
    karma: backendUser.karma || 0,
    createdAt: backendUser.created_at,
  };
}

export function useSearch(query: string, type?: string) {
  return useQuery({
    queryKey: ['search', query, type || 'all'],
    queryFn: async () => {
      const response = await searchService.search(query, type);

      // Transform results - support both 'projects' and 'itineraries' keys
      const itineraries = (response.data.data?.itineraries || response.data.data?.projects || []).map(transformProject);
      const users = response.data.data?.users?.map(transformUser) || [];

      return {
        Itineraries: itineraries,
        projects: itineraries, // Backwards compatibility
        users,
        total: itineraries.length + users.length,
      };
    },
    // Only search if query is at least 2 characters
    enabled: query.length >= 2,

    // Caching strategy for search results
    staleTime: 1000 * 60 * 10, // 10 min - search results stay fresh
    gcTime: 1000 * 60 * 30,    // 30 min - keep in cache for fast repeat searches

    // Don't refetch automatically for search
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,

    // Keep old results visible while searching
    placeholderData: (previousData) => previousData,
  });
}
