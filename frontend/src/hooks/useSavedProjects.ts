import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { savedProjectsService } from '@/services/api';
import { toast } from 'sonner';

// Transform backend project data to frontend format
function transformProject(backendProject: any) {
  return {
    id: backendProject.id,
    title: backendProject.title,
    tagline: backendProject.tagline || '',
    description: backendProject.description,
    projectStory: backendProject.project_story,
    inspiration: backendProject.inspiration,
    pitchDeckUrl: backendProject.pitch_deck_url,
    marketComparison: backendProject.market_comparison,
    noveltyFactor: backendProject.novelty_factor,
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
      avatar_url: backendProject.creator.avatar_url,
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
      validation: backendProject.validation_score || 0,
      quality: backendProject.quality_score || 0,
    },
    score_breakdown: backendProject.score_breakdown,
    scoreBreakdown: backendProject.score_breakdown,
    badges: backendProject.badges || [],
    voteCount: (backendProject.upvotes || 0) - (backendProject.downvotes || 0),
    commentCount: backendProject.comment_count || 0,
    viewCount: backendProject.view_count || 0,
    userVote: backendProject.user_vote || null,
    user_vote: backendProject.user_vote || null,
    isFeatured: backendProject.is_featured || false,
    createdAt: backendProject.created_at,
    updatedAt: backendProject.updated_at,
  };
}

// Get user's saved projects
export function useSavedProjects(page: number = 1, perPage: number = 20) {
  return useQuery({
    queryKey: ['saved-projects', page, perPage],
    queryFn: async () => {
      const response = await savedProjectsService.getMySavedProjects(page, perPage);
      // Transform the projects data
      return {
        ...response.data,
        data: response.data.data?.map(transformProject) || [],
      };
    },
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Check if a specific project is saved
export function useCheckIfSaved(projectId: string) {
  return useQuery({
    queryKey: ['saved-check', projectId],
    queryFn: async () => {
      const response = await savedProjectsService.checkIfSaved(projectId);
      return response.data.data.saved;
    },
    enabled: !!projectId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

// Save project mutation
export function useSaveProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const response = await savedProjectsService.saveProject(projectId);
      return response.data;
    },
    onSuccess: (_, projectId) => {
      // Invalidate saved projects list
      queryClient.invalidateQueries({ queryKey: ['saved-projects'] });
      // Invalidate specific project check
      queryClient.invalidateQueries({ queryKey: ['saved-check', projectId] });
      toast.success('Saved to bookmarks!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save project');
    },
  });
}

// Unsave project mutation
export function useUnsaveProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const response = await savedProjectsService.unsaveProject(projectId);
      return response.data;
    },
    onSuccess: (_, projectId) => {
      // Invalidate saved projects list
      queryClient.invalidateQueries({ queryKey: ['saved-projects'] });
      // Invalidate specific project check
      queryClient.invalidateQueries({ queryKey: ['saved-check', projectId] });
      toast.success('Removed from saved');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to unsave project');
    },
  });
}
