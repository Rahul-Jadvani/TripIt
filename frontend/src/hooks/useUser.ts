import { useQuery } from '@tanstack/react-query';
import { usersService } from '@/services/api';

function transformUser(backendUser: any) {
  return {
    id: backendUser.id,
    username: backendUser.username,
    email: backendUser.email || '',
    displayName: backendUser.display_name,
    avatar: backendUser.avatar_url,
    bio: backendUser.bio,
    isVerified: backendUser.email_verified || false,
    isAdmin: backendUser.is_admin || false,
    is_investor: backendUser.is_investor || false,
    isInvestor: backendUser.is_investor || false,
    is_validator: backendUser.is_validator || false,
    isValidator: backendUser.is_validator || false,
    walletAddress: backendUser.wallet_address,
    full_wallet_address: backendUser.full_wallet_address,
    github_connected: backendUser.github_connected || false,
    github_username: backendUser.github_username || '',
    has_oxcert: backendUser.has_oxcert || false,
    hasOxcert: backendUser.has_oxcert || false,
    oxcert_tx_hash: backendUser.oxcert_tx_hash,
    oxcert_token_id: backendUser.oxcert_token_id,
    oxcert_metadata: backendUser.oxcert_metadata,
    karma: backendUser.karma || 0,
    projectCount: backendUser.project_count || 0,
    createdAt: backendUser.created_at,
    updatedAt: backendUser.updated_at || backendUser.created_at,
  };
}

export function useUserByUsername(username: string) {
  return useQuery({
    queryKey: ['user', username],
    queryFn: async () => {
      const response = await usersService.getByUsername(username);
      return transformUser(response.data.data);
    },
    enabled: !!username,
    staleTime: 1000 * 60 * 5, // User data stays fresh for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
    refetchInterval: false, // NO polling - Socket.IO handles invalidation
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: 'always', // Always check for fresh data
    placeholderData: (previousData) => previousData, // Keep old data visible
  });
}
