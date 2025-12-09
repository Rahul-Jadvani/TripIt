import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { savedItinerariesService } from '@/services/api';
import { toast } from 'sonner';

// Transform backend itinerary data to frontend format
function transformItinerary(backendItinerary: any) {
  return {
    id: backendItinerary.id,
    title: backendItinerary.title,
    tagline: backendItinerary.tagline || '',
    description: backendItinerary.description,
    destination: backendItinerary.destination || '',
    activity_tags: backendItinerary.activity_tags || [],
    travel_companions: backendItinerary.travel_companions || [],
    travel_credibility_score: backendItinerary.travel_credibility_score || {},
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
      avatar_url: backendItinerary.creator.avatar_url,
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
    badges: backendItinerary.badges || [],
    safetyRatingCount: backendItinerary.safety_rating_count || 0,
    travelIntelCount: backendItinerary.travel_intel_count || 0,
    viewCount: backendItinerary.view_count || 0,
    isFeatured: backendItinerary.is_featured || false,
    createdAt: backendItinerary.created_at,
    updatedAt: backendItinerary.updated_at,
  };
}

// Get user's saved itineraries
export function useSavedItineraries(page: number = 1, perPage: number = 20) {
  return useQuery({
    queryKey: ['saved-itineraries', page, perPage],
    queryFn: async () => {
      const response = await savedItinerariesService.getMySavedItineraries(page, perPage);
      // Transform the itineraries data
      return {
        ...response.data,
        data: response.data.data?.map(transformItinerary) || [],
      };
    },
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Check if a specific itinerary is saved
export function useCheckIfSavedItinerary(itineraryId: string) {
  return useQuery({
    queryKey: ['saved-check-itinerary', itineraryId],
    queryFn: async () => {
      const response = await savedItinerariesService.checkIfSavedItinerary(itineraryId);
      return response.data.data.saved;
    },
    enabled: !!itineraryId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

// Save itinerary mutation
export function useSaveItinerary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itineraryId: string) => {
      const response = await savedItinerariesService.saveItinerary(itineraryId);
      return response.data;
    },
    onSuccess: (_, itineraryId) => {
      // Invalidate saved itineraries list
      queryClient.invalidateQueries({ queryKey: ['saved-itineraries'] });
      // Invalidate specific itinerary check
      queryClient.invalidateQueries({ queryKey: ['saved-check-itinerary', itineraryId] });
      toast.success('Saved to bookmarks!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save itinerary');
    },
  });
}

// Unsave itinerary mutation
export function useUnsaveItinerary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itineraryId: string) => {
      const response = await savedItinerariesService.unsaveItinerary(itineraryId);
      return response.data;
    },
    onSuccess: (_, itineraryId) => {
      // Invalidate saved itineraries list
      queryClient.invalidateQueries({ queryKey: ['saved-itineraries'] });
      // Invalidate specific itinerary check
      queryClient.invalidateQueries({ queryKey: ['saved-check-itinerary', itineraryId] });
      toast.success('Removed from saved');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to unsave itinerary');
    },
  });
}
