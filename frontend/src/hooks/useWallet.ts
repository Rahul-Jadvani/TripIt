import { useMutation, useQueryClient } from '@tanstack/react-query';
import { walletService, usersService } from '@/services/api';
import { toast } from 'sonner';

export function useVerifyCert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (walletAddress: string) => walletService.verifyCert(walletAddress),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      if (data.data.verified) {
        toast.success('🎉 Verified Builder! +10 proof score');
      } else {
        toast.info('No 0xCerts found for this wallet');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Verification failed');
    },
  });
}

export function useConnectWallet(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (walletAddress: string) =>
      walletService.connectWallet(userId, walletAddress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      toast.success('Wallet connected!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to connect wallet');
    },
  });
}

export function useUpdateProfile(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => usersService.update(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      toast.success('Profile updated!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    },
  });
}
