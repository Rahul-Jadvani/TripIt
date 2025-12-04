import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import type { Community } from '@/types';

export function useItineraryCaravans(itineraryId: string | undefined) {
  return useQuery({
    queryKey: ['itinerary-caravans', itineraryId],
    queryFn: async (): Promise<Community[]> => {
      if (!itineraryId) return [];

      try {
        // Fetch all chain_projects that have this itinerary
        const response = await api.get(`/itineraries/${itineraryId}/chains`);

        if (response.data?.data?.chains) {
          return response.data.data.chains;
        }

        return [];
      } catch (error) {
        console.error('Error fetching itinerary caravans:', error);
        return [];
      }
    },
    enabled: !!itineraryId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
