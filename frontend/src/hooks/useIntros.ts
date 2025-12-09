import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { introsService } from '@/services/api';
import { toast } from 'sonner';

// Get backend URL
const getBackendUrl = (): string => {
  return 'https://tripit-xgvr.onrender.com';
};

export function useReceivedIntros() {
  return useQuery({
    queryKey: ['intros', 'received'],
    queryFn: () => introsService.getReceived(),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    placeholderData: (previousData) => previousData,
  });
}

// Intro requests (different from intros)
export function useReceivedIntroRequests() {
  return useQuery({
    queryKey: ['intro-requests', 'received'],
    queryFn: async () => {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/intros/received`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (data.status === 'success') {
        return data.data;
      }
      throw new Error(data.message || 'Failed to fetch intro requests');
    },
    staleTime: 0, // Always refetch to ensure fresh data
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
    refetchOnMount: true, // Always refetch on mount to get latest data
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

export function useSentIntroRequests() {
  return useQuery({
    queryKey: ['intro-requests', 'sent'],
    queryFn: async () => {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/intros/sent`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (data.status === 'success') {
        return data.data;
      }
      throw new Error(data.message || 'Failed to fetch sent intro requests');
    },
    staleTime: 0, // Always refetch to ensure fresh data
    gcTime: 1000 * 60 * 5,
    refetchOnMount: true, // Always refetch on mount to get latest data
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

export function useSentIntros() {
  return useQuery({
    queryKey: ['intros', 'sent'],
    queryFn: () => introsService.getSent(),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    placeholderData: (previousData) => previousData,
  });
}

export function useCreateIntro() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => introsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intros', 'sent'] });
      toast.success('Intro request sent!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to send intro request');
    },
  });
}

export function useAcceptIntro() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => introsService.accept(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intros', 'received'] });
      toast.success('Intro request accepted!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to accept intro');
    },
  });
}

export function useDeclineIntro() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => introsService.decline(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intros', 'received'] });
      toast.success('Intro request declined');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to decline intro');
    },
  });
}

// Intro request mutations
export function useAcceptIntroRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/intros/${requestId}/accept`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (data.status !== 'success') {
        throw new Error(data.message || 'Failed to accept request');
      }
      return data;
    },
    onMutate: async (requestId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['intro-requests', 'received'] });

      // Snapshot previous data
      const previousData = queryClient.getQueryData(['intro-requests', 'received']);

      // Optimistically update the UI - remove the accepted intro immediately
      queryClient.setQueryData(
        ['intro-requests', 'received'],
        (old: any = []) => old.filter((req: any) => req.id !== requestId)
      );

      // Also update the intro requests count
      queryClient.setQueryData(
        ['intro-requests', 'count'],
        (old: any = { pending_count: 0 }) => ({
          pending_count: Math.max(0, (old?.pending_count || 0) - 1),
        })
      );

      return { previousData };
    },
    onSuccess: () => {
      // Invalidate intro requests to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['intro-requests', 'received'] });
      queryClient.invalidateQueries({ queryKey: ['intro-requests', 'sent'] });

      // CRITICAL: Invalidate conversations so new conversation appears immediately
      queryClient.invalidateQueries({ queryKey: ['messages', 'conversations'] });

      // Invalidate counts
      queryClient.invalidateQueries({ queryKey: ['intro-requests', 'count'] });

      toast.success('Intro request accepted! Check your messages.');
    },
    onError: (error: any, requestId: string, context: any) => {
      // Rollback to previous data
      if (context?.previousData) {
        queryClient.setQueryData(['intro-requests', 'received'], context.previousData);
      }
      toast.error(error.message || 'Failed to accept intro request');
    },
  });
}

export function useDeclineIntroRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/intros/${requestId}/decline`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (data.status !== 'success') {
        throw new Error(data.message || 'Failed to decline request');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intro-requests', 'received'] });
      queryClient.invalidateQueries({ queryKey: ['intro-requests', 'sent'] });
      toast.success('Intro request declined');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to decline intro request');
    },
  });
}
