import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { itinerariesService } from '@/services/api';
import { toast } from 'sonner';

// Transform backend itinerary data to frontend format
export function transformItinerary(backendItinerary: any) {
  return {
    id: backendItinerary.id,
    title: backendItinerary.title,
    tagline: backendItinerary.tagline || '',
    description: backendItinerary.description,
    destination: backendItinerary.destination || '',
    activity_tags: (backendItinerary.activity_tags || []).map((t: any) => {
      if (!t) return '';
      if (typeof t === 'string') return t;
      if (typeof t === 'object') return t.name || t.label || JSON.stringify(t);
      return String(t);
    }),
    travel_companions: backendItinerary.travel_companions || [],
    travel_credibility_score: {
      total: backendItinerary.travel_credibility_score?.total || 0,
      verification: backendItinerary.travel_credibility_score?.verification || 0,
      community: backendItinerary.travel_credibility_score?.community || 0,
      onchain: backendItinerary.travel_credibility_score?.onchain || 0,
      validation: backendItinerary.travel_credibility_score?.validation || 0,
      quality: backendItinerary.travel_credibility_score?.quality || 0,
    },
    start_date: backendItinerary.start_date,
    end_date: backendItinerary.end_date,
    difficulty_level: backendItinerary.difficulty_level,
    route_map_url: backendItinerary.route_map_url,
    route_gpx_data: backendItinerary.route_gpx_data,
    creator: backendItinerary.creator ? {
      id: backendItinerary.creator.id,
      username: backendItinerary.creator.username,
      email: backendItinerary.creator.email || '',
      displayName: backendItinerary.creator.display_name,
      avatar: backendItinerary.creator.avatar_url,
      bio: backendItinerary.creator.bio,
      isVerified: backendItinerary.creator.email_verified || false,
      email_verified: backendItinerary.creator.email_verified || false,
      isAdmin: backendItinerary.creator.is_admin || false,
      walletAddress: backendItinerary.creator.wallet_address,
      wallet_address: backendItinerary.creator.wallet_address,
      full_wallet_address: backendItinerary.creator.full_wallet_address,
      github_connected: backendItinerary.creator.github_connected || false,
      github_username: backendItinerary.creator.github_username || '',
      has_oxcert: backendItinerary.creator.has_oxcert || false,
      hasOxcert: backendItinerary.creator.has_oxcert || false,
      oxcert_tx_hash: backendItinerary.creator.oxcert_tx_hash,
      oxcert_token_id: backendItinerary.creator.oxcert_token_id,
      oxcert_metadata: backendItinerary.creator.oxcert_metadata,
      createdAt: backendItinerary.creator.created_at,
      updatedAt: backendItinerary.creator.updated_at || backendItinerary.creator.created_at,
    } : {
      id: backendItinerary.user_id,
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
    safetyRatings: backendItinerary.safety_ratings || [],
    safety_ratings: backendItinerary.safety_ratings || [],
    travelIntel: backendItinerary.travel_intel || [],
    travel_intel: backendItinerary.travel_intel || [],
    badges: (backendItinerary.badges || []).map((b: any) => {
      if (!b) return { type: '' };
      if (typeof b === 'string') return { type: b };
      if (typeof b === 'object') {
        const derivedType =
          b.type ||
          b.badge_type ||
          b.badgeType ||
          b.name ||
          b.label ||
          b.value ||
          b.code ||
          '';
        return { ...b, type: derivedType };
      }
      return { type: String(b) };
    }),
    safetyRatingCount: backendItinerary.safety_rating_count || 0,
    safety_rating_count: backendItinerary.safety_rating_count || 0,
    travelIntelCount: backendItinerary.travel_intel_count || 0,
    travel_intel_count: backendItinerary.travel_intel_count || 0,
    viewCount: backendItinerary.view_count || 0,
    isFeatured: backendItinerary.is_featured || false,
    createdAt: backendItinerary.created_at,
    updatedAt: backendItinerary.updated_at,
  };
}

export function useItineraries(sort: string = 'hot', page: number = 1, includeDetailed: boolean = false) {
  return useQuery({
    queryKey: ['itineraries', sort, page, includeDetailed],
    queryFn: async () => {
      const response = await itinerariesService.getAll(sort, page, includeDetailed);

      // Transform the itineraries data
      return {
        ...response.data,
        data: response.data.data?.map(transformItinerary) || [],
      };
    },
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });
}

export function useItineraryById(id: string) {
  return useQuery({
    queryKey: ['itinerary', id],
    queryFn: async () => {
      const response = await itinerariesService.getById(id);

      return {
        ...response.data,
        data: response.data.data ? transformItinerary(response.data.data) : null,
      };
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    refetchOnMount: true,
    refetchInterval: (query) => {
      const itinerary = query.state.data?.data;
      const scoringStatus = itinerary?.scoringStatus;

      if (scoringStatus === 'pending' || scoringStatus === 'processing' || scoringStatus === 'retrying') {
        return 5000;
      }

      return false;
    },
    refetchOnWindowFocus: 'stale',
    refetchOnReconnect: 'stale',
  });
}

export function useUserItineraries(userId: string) {
  return useQuery({
    queryKey: ['user-itineraries', userId],
    queryFn: async () => {
      const response = await itinerariesService.getByUser(userId);

      return {
        ...response.data,
        data: response.data.data?.map(transformItinerary) || [],
      };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    refetchInterval: 1000 * 60 * 3,
    refetchOnWindowFocus: 'stale',
    refetchOnReconnect: 'stale',
    placeholderData: (previousData) => previousData,
  });
}

export function useCreateItinerary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => {
      console.log('Creating itinerary with data:', data);
      return itinerariesService.create(data);
    },
    onSuccess: (response) => {
      console.log('Itinerary created successfully:', response);
      queryClient.invalidateQueries({ queryKey: ['itineraries'] });
      queryClient.invalidateQueries({ queryKey: ['user-itineraries'] });
      toast.success('Itinerary published successfully!');
    },
    onError: (error: any) => {
      console.error('Itinerary creation error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to publish itinerary';
      toast.error(errorMessage);
    },
  });
}

export function useUpdateItinerary(itineraryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => itinerariesService.update(itineraryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itinerary', itineraryId] });
      queryClient.invalidateQueries({ queryKey: ['itineraries'] });
      toast.success('Itinerary updated successfully!');
    },
    onError: () => {
      toast.error('Failed to update itinerary');
    },
  });
}

export function useDeleteItinerary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itineraryId: string) => itinerariesService.delete(itineraryId),
    onSuccess: (_data, itineraryId) => {
      queryClient.invalidateQueries({ queryKey: ['itineraries'] });
      if (itineraryId) {
        queryClient.invalidateQueries({ queryKey: ['itinerary', itineraryId] });
      }
      queryClient.invalidateQueries({ queryKey: ['user-itineraries'] });
      toast.success('Itinerary deleted successfully!');
    },
    onError: () => {
      toast.error('Failed to delete itinerary');
    },
  });
}
