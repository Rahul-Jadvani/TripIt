import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { safetyRatingsService } from '@/services/api';
import { toast } from 'sonner';

export function useSafetyRating(itineraryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rating: number) => {
      return safetyRatingsService.rate(itineraryId, rating);
    },

    // INSTANT optimistic update
    onMutate: async (rating: number) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['itinerary', itineraryId] });

      // Snapshot the previous value
      const previousItinerary = queryClient.getQueryData(['itinerary', itineraryId]);

      // Optimistically update itinerary detail
      queryClient.setQueryData(['itinerary', itineraryId], (old: any) => {
        if (!old?.data) return old;

        const currentRating = old.data.user_rating || old.data.userRating;
        const currentRatings = old.data.safety_ratings || [];

        let newUserRating = rating;
        let newRatings = [...currentRatings];

        // Same rating = remove
        if (currentRating === rating) {
          newUserRating = null;
          newRatings = currentRatings.filter((r: any) => r.user_id !== currentRating);
        }
        // Different rating = change
        else if (currentRating) {
          newRatings = currentRatings.filter((r: any) => r.user_id !== currentRating);
          newRatings.push({ user_id: 'current_user', rating });
        }
        // No rating = new
        else {
          newRatings.push({ user_id: 'current_user', rating });
        }

        return {
          ...old,
          data: {
            ...old.data,
            safety_ratings: newRatings,
            user_rating: newUserRating,
            userRating: newUserRating,
          }
        };
      });

      // ALSO update itineraries list cache
      queryClient.setQueriesData({ queryKey: ['itineraries'] }, (old: any) => {
        if (!old?.data) return old;

        const itineraries = old.data.map((itinerary: any) => {
          if (itinerary.id !== itineraryId) return itinerary;

          const currentRating = itinerary.user_rating || itinerary.userRating;
          const currentRatings = itinerary.safety_ratings || [];

          let newUserRating = rating;
          let newRatings = [...currentRatings];

          if (currentRating === rating) {
            newUserRating = null;
            newRatings = currentRatings.filter((r: any) => r.user_id !== currentRating);
          } else if (currentRating) {
            newRatings = currentRatings.filter((r: any) => r.user_id !== currentRating);
            newRatings.push({ user_id: 'current_user', rating });
          } else {
            newRatings.push({ user_id: 'current_user', rating });
          }

          return {
            ...itinerary,
            safety_ratings: newRatings,
            user_rating: newUserRating,
            userRating: newUserRating,
          };
        });

        return { ...old, data: itineraries };
      });

      return { previousItinerary };
    },

    // On success: Reconcile with server response
    onSuccess: (response) => {
      const ratingData = response?.data?.data;
      if (!ratingData) {
        return;
      }

      // Update itinerary detail cache with server truth
      queryClient.setQueryData(['itinerary', itineraryId], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            safety_ratings: ratingData.safety_ratings || [],
            user_rating: ratingData.user_rating,
            userRating: ratingData.user_rating,
          }
        };
      });

      // Update itineraries list cache with server truth
      queryClient.setQueriesData({ queryKey: ['itineraries'] }, (old: any) => {
        if (!old?.data) return old;

        const itineraries = old.data.map((itinerary: any) => {
          if (itinerary.id !== itineraryId) return itinerary;
          return {
            ...itinerary,
            safety_ratings: ratingData.safety_ratings || [],
            user_rating: ratingData.user_rating,
            userRating: ratingData.user_rating,
          };
        });

        return { ...old, data: itineraries };
      });
    },

    // On error: Rollback
    onError: (error: any, rating, context) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to rate itinerary';
      toast.error(errorMessage);

      // Rollback
      if (context?.previousItinerary) {
        queryClient.setQueryData(['itinerary', itineraryId], context.previousItinerary);
      }
    },
  });
}

export function useUserSafetyRatings() {
  return useQuery({
    queryKey: ['userSafetyRatings'],
    queryFn: async () => {
      const response = await safetyRatingsService.getUserRatings();
      return response.data?.data || [];
    },
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    refetchInterval: 1000 * 60,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    placeholderData: (previousData) => previousData,
  });
}

// Legacy exports for backward compatibility
export function useRateSafety(itineraryId: string) {
  const ratingMutation = useSafetyRating(itineraryId);
  return {
    ...ratingMutation,
    mutate: (rating: number) => ratingMutation.mutate(rating),
  };
}

export function useRemoveSafetyRating(itineraryId: string) {
  const ratingMutation = useSafetyRating(itineraryId);
  return ratingMutation;
}
