import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '@/services/api';
import { toast } from 'sonner';

// ==================== QUERY HOOKS ====================

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const response = await adminService.getStats();
      return response.data.data;
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    placeholderData: (previousData) => previousData,
  });
}

export function useAdminUsers(params: { search?: string; role?: string; perPage?: number } = {}) {
  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: async () => {
      const response = await adminService.getUsers(params);
      return response.data.data;
    },
    staleTime: 1000 * 60 * 3,
    gcTime: 1000 * 60 * 30,
    placeholderData: (previousData) => previousData,
  });
}

export function useAdminValidators() {
  return useQuery({
    queryKey: ['admin', 'validators'],
    queryFn: async () => {
      const response = await adminService.getValidators();
      return response.data.data;
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    placeholderData: (previousData) => previousData,
  });
}

export function useAdminProjects(params: { search?: string; perPage?: number } = {}) {
  return useQuery({
    queryKey: ['admin', 'projects', params],
    queryFn: async () => {
      const response = await adminService.getProjects(params);
      return response.data.data;
    },
    staleTime: 1000 * 60 * 3,
    gcTime: 1000 * 60 * 30,
    placeholderData: (previousData) => previousData,
  });
}

export function useAdminInvestorRequests() {
  return useQuery({
    queryKey: ['admin', 'investor-requests'],
    queryFn: async () => {
      const response = await adminService.getInvestorRequests();
      return response.data.data;
    },
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 30,
    placeholderData: (previousData) => previousData,
  });
}

// ==================== MUTATION HOOKS ====================

export function useToggleUserAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => adminService.toggleUserAdmin(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      toast.success('User admin status updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update user');
    },
  });
}

export function useToggleUserActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => adminService.toggleUserActive(userId),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      toast.success(response.data.message || 'User status updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update user');
    },
  });
}

export function useAddValidator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (email: string) => adminService.addValidator(email),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'validators'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      if (response.data.status === 'pending') {
        toast.error(response.data.message);
      } else {
        toast.success(response.data.message || 'Validator added');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add validator');
    },
  });
}

export function useRemoveValidator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (validatorId: string) => adminService.removeValidator(validatorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'validators'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      toast.success('Validator removed');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to remove validator');
    },
  });
}

export function useUpdateValidatorPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ validatorId, permissions }: { validatorId: string; permissions: any }) =>
      adminService.updateValidatorPermissions(validatorId, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'validators'] });
      toast.success('Permissions updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update permissions');
    },
  });
}

export function useToggleProjectFeatured() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => adminService.toggleProjectFeatured(projectId),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'projects'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] }); // Also invalidate public project cache
      toast.success(response.data.message || 'Project updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update project');
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => adminService.deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'projects'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] }); // Also invalidate public project cache
      toast.success('Project deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete project');
    },
  });
}

export function useAwardCustomBadge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      project_id: string;
      badge_type: string;
      custom_name: string;
      custom_image?: string;
      points: number;
      rationale: string;
    }) => adminService.awardCustomBadge(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] }); // Invalidate project cache
      toast.success('Custom badge awarded');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to award badge');
    },
  });
}

export function useApproveInvestorRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => adminService.approveInvestorRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'investor-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      toast.success('Investor request approved');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to approve request');
    },
  });
}

export function useRejectInvestorRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => adminService.rejectInvestorRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'investor-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      toast.success('Investor request rejected');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reject request');
    },
  });
}
