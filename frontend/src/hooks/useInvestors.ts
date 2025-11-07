import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/api';

export function usePublicInvestors() {
  return useQuery({
    queryKey: ['investors', 'public'],
    queryFn: async () => {
      const response = await adminService.getPublicInvestors();
      const rd = response?.data;
      const payload = rd?.data ?? rd;
      // Normalize common shapes: [], { investors: [] }
      if (Array.isArray(payload)) return payload;
      if (payload && Array.isArray(payload.investors)) return payload.investors;
      return [] as any[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - investors don't change often
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    placeholderData: (previousData) => previousData,
  });
}
