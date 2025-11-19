import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsService } from '@/services/api';
import { toast } from 'sonner';

// Transform backend project data to frontend format
export function transformProject(backendProject: any) {
  return {
    id: backendProject.id,
    title: backendProject.title,
    tagline: backendProject.tagline || '',
    description: backendProject.description,
    projectStory: backendProject.project_story,
    project_story: backendProject.project_story,
    inspiration: backendProject.inspiration,
    pitchDeckUrl: backendProject.pitch_deck_url,
    pitch_deck_url: backendProject.pitch_deck_url,
    marketComparison: backendProject.market_comparison,
    market_comparison: backendProject.market_comparison,
    noveltyFactor: backendProject.novelty_factor,
    novelty_factor: backendProject.novelty_factor,
    categories: backendProject.categories || [],
    demoUrl: backendProject.demo_url,
    githubUrl: backendProject.github_url,
    hackathonName: backendProject.hackathon_name || '',
    hackathonDate: backendProject.hackathon_date || '',
    hackathons: backendProject.hackathons || [],
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
      validation: backendProject.validation_score || 0,
      quality: backendProject.quality_score || 0,
    },
    // AI Scoring fields
    scoring_status: backendProject.scoring_status,
    scoringStatus: backendProject.scoring_status,
    score_breakdown: backendProject.score_breakdown,
    scoreBreakdown: backendProject.score_breakdown,
    scoring_retry_count: backendProject.scoring_retry_count || 0,
    scoringRetryCount: backendProject.scoring_retry_count || 0,
    last_scored_at: backendProject.last_scored_at,
    lastScoredAt: backendProject.last_scored_at,
    scoring_error: backendProject.scoring_error,
    scoringError: backendProject.scoring_error,
    badges: backendProject.badges || [],
    // Voting fields - pass through ALL needed fields
    upvotes: backendProject.upvotes || 0,
    downvotes: backendProject.downvotes || 0,
    voteCount: (backendProject.upvotes || 0) - (backendProject.downvotes || 0),
    commentCount: backendProject.comment_count || 0,
    viewCount: backendProject.view_count || 0,
    userVote: backendProject.user_vote || null,
    user_vote: backendProject.user_vote || null,
    isFeatured: backendProject.is_featured || false,
    chains: backendProject.chains || [],
    chainCount: backendProject.chain_count || 0,
    createdAt: backendProject.created_at,
    updatedAt: backendProject.updated_at,
  };
}

export function useProjects(sort: string = 'hot', page: number = 1) {
  return useQuery({
    queryKey: ['projects', sort, page],
    queryFn: async () => {
      const response = await projectsService.getAll(sort, page);

      // Transform the projects data
      return {
        ...response.data,
        data: response.data.data?.map(transformProject) || [],
      };
    },
    // Instagram-style caching: Short stale time, long cache retention
    staleTime: 1000 * 60 * 1, // 1 min - marks data as "stale" but still usable (votes change frequently)
    gcTime: 1000 * 60 * 30,   // 30 min - keeps in memory for instant navigation

    // Real-time refetch strategy
    refetchInterval: false, // NO polling - rely on Socket.IO invalidation
    refetchOnWindowFocus: true, // Refresh when user returns (catches updates)
    refetchOnReconnect: true,   // Refresh after internet reconnects
    refetchOnMount: 'always',   // Always check for fresh data on mount

    // Keep old data visible during background refetch (NO loading spinners!)
    placeholderData: (previousData) => previousData,
  });
}

export function useProjectById(id: string) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const response = await projectsService.getById(id);

      // Transform the single project data
      return {
        ...response.data,
        data: response.data.data ? transformProject(response.data.data) : null,
      };
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 2, // Keep fresh for 2 minutes
    gcTime: 1000 * 60 * 15, // Keep in cache for 15 minutes

    // Only refetch on mount if data is stale
    refetchOnMount: true,
    // Conditional polling for AI scoring only
    refetchInterval: (query) => {
      const project = query.state.data?.data;
      const scoringStatus = project?.scoring_status || project?.scoringStatus;

      // Fast polling (5s) when AI is analyzing the project
      if (scoringStatus === 'pending' || scoringStatus === 'processing' || scoringStatus === 'retrying') {
        return 5000; // 5 seconds
      }

      // No polling otherwise (rely on optimistic updates for votes)
      return false;
    },
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useUserProjects(userId: string) {
  return useQuery({
    queryKey: ['user-projects', userId],
    queryFn: async () => {
      const response = await projectsService.getByUser(userId);

      // Transform the projects data
      return {
        ...response.data,
        data: response.data.data?.map(transformProject) || [],
      };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 3, // Consider data fresh for 3 minutes
    gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes

    // Background refetch for user projects
    refetchInterval: 1000 * 60 * 2, // Refresh every 2 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    placeholderData: (previousData) => previousData,
  });
}

export function useUserTaggedProjects(userId: string) {
  return useQuery({
    queryKey: ['user-tagged-projects', userId],
    queryFn: async () => {
      const response = await projectsService.getTaggedProjects(userId);

      // Transform the projects data
      return {
        ...response.data,
        data: response.data.data?.map(transformProject) || [],
      };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 3, // Consider data fresh for 3 minutes
    gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes

    // Background refetch for tagged projects
    refetchInterval: 1000 * 60 * 2, // Refresh every 2 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    placeholderData: (previousData) => previousData,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => {
      console.log('Creating project with data:', data);
      return projectsService.create(data);
    },
    onSuccess: (response) => {
      console.log('Project created successfully:', response);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['user-projects'] });
      toast.success('Project published successfully!');
    },
    onError: (error: any) => {
      console.error('Project creation error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to publish project';
      toast.error(errorMessage);
    },
  });
}

export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => projectsService.update(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project updated successfully!');
    },
    onError: () => {
      toast.error('Failed to update project');
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => projectsService.delete(projectId),
    onSuccess: (_data, projectId) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      }
      queryClient.invalidateQueries({ queryKey: ['user-projects'] });
      toast.success('Project deleted successfully!');
    },
    onError: () => {
      toast.error('Failed to delete project');
    },
  });
}

export function useRescoreProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => {
      return projectsService.rescoreProject(projectId);
    },
    onSuccess: (_data, projectId) => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('AI scoring has been queued. Your project will be re-analyzed in ~30-60 seconds.');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to rescore project';
      toast.error(errorMessage);
    },
  });
}
