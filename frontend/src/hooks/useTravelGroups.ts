import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

export interface TravelGroupFilters {
  search?: string;
  destination?: string;
  type?: 'interest_based' | 'destination_based' | 'activity_based' | 'women_only';
  activity?: string[];
  women_safe?: boolean;
  has_availability?: boolean;
  sort?: 'newest' | 'popular' | 'starting_soon';
}

export interface TravelGroup {
  id: string;
  name: string;
  description: string;
  destination: string;
  start_date: string;
  end_date: string;
  group_type: string;
  max_members: number;
  current_members_count: number;
  activity_tags: string[];
  is_women_only: boolean;
  require_identity_verification: boolean;
  created_by_traveler_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  members?: TravelGroupMember[];
  is_member?: boolean;
  user_role?: 'organizer' | 'moderator' | 'member' | null;
}

export interface TravelGroupMember {
  id: string;
  group_id: string;
  traveler_id: string;
  role: 'organizer' | 'moderator' | 'member';
  join_status: 'pending' | 'accepted' | 'rejected';
  joined_date: string;
  left_date?: string;
  is_active: boolean;
  traveler?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    traveler_reputation_score: number;
  };
}

export interface CreateTravelGroupData {
  name: string;
  description: string;
  destination: string;
  start_date: string;
  end_date: string;
  group_type?: 'interest_based' | 'destination_based' | 'activity_based' | 'women_only';
  max_members?: number;
  activity_tags?: string[];
  is_women_only?: boolean;
  require_identity_verification?: boolean;
}

export interface UpdateTravelGroupData {
  name?: string;
  description?: string;
  destination?: string;
  start_date?: string;
  end_date?: string;
  activity_tags?: string[];
  max_members?: number;
  is_women_only?: boolean;
  group_type?: string;
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * List all travel groups with filtering and pagination
 * @param filters - Optional filters for groups
 * @param page - Page number (default: 1)
 * @returns Query with groups data, loading state, and error
 */
export function useTravelGroups(filters?: TravelGroupFilters, page: number = 1) {
  return useQuery({
    queryKey: ['travel-groups', filters, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      if (filters?.destination) params.append('destination', filters.destination);
      if (filters?.type) params.append('type', filters.type);
      if (filters?.activity) {
        filters.activity.forEach(activity => params.append('activity', activity));
      }
      if (filters?.women_safe !== undefined) params.append('women_safe', String(filters.women_safe));
      if (filters?.has_availability !== undefined) params.append('has_availability', String(filters.has_availability));
      if (filters?.sort) params.append('sort', filters.sort);
      params.append('page', String(page));

      const response = await api.get(`/travel-groups?${params.toString()}`);
      return response.data;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes - groups don't change frequently
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Infinite scroll version of travel groups list
 * @param filters - Optional filters for groups
 * @returns Infinite query with groups data and fetchNextPage
 */
export function useInfiniteTravelGroups(filters?: TravelGroupFilters) {
  return useInfiniteQuery({
    queryKey: ['travel-groups-infinite', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      if (filters?.destination) params.append('destination', filters.destination);
      if (filters?.type) params.append('type', filters.type);
      if (filters?.activity) {
        filters.activity.forEach(activity => params.append('activity', activity));
      }
      if (filters?.women_safe !== undefined) params.append('women_safe', String(filters.women_safe));
      if (filters?.has_availability !== undefined) params.append('has_availability', String(filters.has_availability));
      if (filters?.sort) params.append('sort', filters.sort);
      params.append('page', String(pageParam));

      const response = await api.get(`/travel-groups?${params.toString()}`);
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      const { page, total_pages } = lastPage.data.pagination;
      return page < total_pages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  });
}

/**
 * Get single travel group with full details including members
 * @param groupId - Group ID
 * @returns Query with group data, loading state, and error
 */
export function useTravelGroup(groupId: string) {
  return useQuery({
    queryKey: ['travel-group', groupId],
    queryFn: async () => {
      const response = await api.get(`/travel-groups/${groupId}`);
      return response.data.data;
    },
    enabled: !!groupId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: 'stale',
    refetchOnReconnect: 'stale',
  });
}

/**
 * Get members of a travel group
 * @param groupId - Group ID
 * @param page - Page number (default: 1)
 * @returns Query with members data, loading state, and error
 */
export function useTravelGroupMembers(groupId: string, page: number = 1) {
  return useQuery({
    queryKey: ['travel-group-members', groupId, page],
    queryFn: async () => {
      const response = await api.get(`/travel-groups/${groupId}/members?page=${page}`);
      return response.data;
    },
    enabled: !!groupId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Get personalized group matches based on user preferences
 * @param page - Page number (default: 1)
 * @returns Query with matched groups, loading state, and error
 */
export function useMatchingTravelGroups(page: number = 1) {
  return useQuery({
    queryKey: ['travel-groups-matching', page],
    queryFn: async () => {
      const response = await api.get(`/travel-groups/matching?page=${page}`);
      return response.data;
    },
    staleTime: 1000 * 60 * 15, // 15 minutes - matches change slowly
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new travel group
 * @returns Mutation with create function and loading state
 */
export function useCreateTravelGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTravelGroupData) => {
      const response = await api.post('/travel-groups', data);
      return response.data;
    },
    onSuccess: (response) => {
      // Invalidate all travel groups queries
      queryClient.invalidateQueries({ queryKey: ['travel-groups'] });
      queryClient.invalidateQueries({ queryKey: ['travel-groups-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['travel-groups-matching'] });

      toast.success('Travel group created successfully!');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create travel group';
      toast.error(errorMessage);
    },
  });
}

/**
 * Update an existing travel group
 * @param groupId - Group ID to update
 * @returns Mutation with update function and loading state
 */
export function useUpdateTravelGroup(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateTravelGroupData) => {
      const response = await api.put(`/travel-groups/${groupId}`, data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate specific group and lists
      queryClient.invalidateQueries({ queryKey: ['travel-group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['travel-groups'] });
      queryClient.invalidateQueries({ queryKey: ['travel-groups-infinite'] });

      toast.success('Travel group updated successfully!');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update travel group';
      toast.error(errorMessage);
    },
  });
}

/**
 * Delete a travel group (soft delete)
 * @returns Mutation with delete function and loading state
 */
export function useDeleteTravelGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      const response = await api.delete(`/travel-groups/${groupId}`);
      return response.data;
    },
    onSuccess: (_data, groupId) => {
      // Invalidate all group queries
      queryClient.invalidateQueries({ queryKey: ['travel-groups'] });
      queryClient.invalidateQueries({ queryKey: ['travel-groups-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['travel-group', groupId] });

      toast.success('Travel group deleted successfully!');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete travel group';
      toast.error(errorMessage);
    },
  });
}

/**
 * Join a travel group
 * @returns Mutation with join function and loading state
 */
export function useJoinTravelGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      const response = await api.post(`/travel-groups/${groupId}/join`);
      return response.data;
    },
    // Optimistic update
    onMutate: async (groupId: string) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['travel-group', groupId] });

      // Snapshot previous value
      const previousGroup = queryClient.getQueryData(['travel-group', groupId]);

      // Optimistically update group
      queryClient.setQueryData(['travel-group', groupId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          is_member: true,
          user_role: 'member',
          current_members_count: (old.current_members_count || 0) + 1,
        };
      });

      return { previousGroup };
    },
    onSuccess: (_data, groupId) => {
      // Invalidate to get fresh data from server
      queryClient.invalidateQueries({ queryKey: ['travel-group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['travel-group-members', groupId] });
      queryClient.invalidateQueries({ queryKey: ['travel-groups'] });
      queryClient.invalidateQueries({ queryKey: ['travel-groups-matching'] });

      toast.success('Successfully joined the travel group!');
    },
    onError: (error: any, groupId, context) => {
      // Rollback optimistic update
      if (context?.previousGroup) {
        queryClient.setQueryData(['travel-group', groupId], context.previousGroup);
      }

      const errorMessage = error.response?.data?.message || error.message || 'Failed to join travel group';
      toast.error(errorMessage);
    },
  });
}

/**
 * Leave a travel group
 * @returns Mutation with leave function and loading state
 */
export function useLeaveTravelGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      const response = await api.post(`/travel-groups/${groupId}/leave`);
      return response.data;
    },
    // Optimistic update
    onMutate: async (groupId: string) => {
      await queryClient.cancelQueries({ queryKey: ['travel-group', groupId] });

      const previousGroup = queryClient.getQueryData(['travel-group', groupId]);

      queryClient.setQueryData(['travel-group', groupId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          is_member: false,
          user_role: null,
          current_members_count: Math.max(0, (old.current_members_count || 0) - 1),
        };
      });

      return { previousGroup };
    },
    onSuccess: (_data, groupId) => {
      queryClient.invalidateQueries({ queryKey: ['travel-group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['travel-group-members', groupId] });
      queryClient.invalidateQueries({ queryKey: ['travel-groups'] });
      queryClient.invalidateQueries({ queryKey: ['travel-groups-matching'] });

      toast.success('Successfully left the travel group');
    },
    onError: (error: any, groupId, context) => {
      if (context?.previousGroup) {
        queryClient.setQueryData(['travel-group', groupId], context.previousGroup);
      }

      const errorMessage = error.response?.data?.message || error.message || 'Failed to leave travel group';
      toast.error(errorMessage);
    },
  });
}

/**
 * Invite a traveler to join a group
 * @param groupId - Group ID
 * @returns Mutation with invite function and loading state
 */
export function useInviteToTravelGroup(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (travelerId: string) => {
      const response = await api.post(`/travel-groups/${groupId}/invite`, {
        traveler_id: travelerId,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-group-members', groupId] });
      toast.success('Invitation sent successfully!');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send invitation';
      toast.error(errorMessage);
    },
  });
}
