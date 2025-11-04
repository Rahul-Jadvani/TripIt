/**
 * Admin API Service
 * Endpoints for admin operations including chain moderation
 */
import api from './api';

export const adminApi = {
  // ============================================================================
  // CHAIN MODERATION
  // ============================================================================

  /**
   * Get all chains with moderation status
   */
  getChains: (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    status?: 'active' | 'banned' | 'suspended' | '';
  }) => {
    return api.get('/admin/chains', { params });
  },

  /**
   * Ban a chain permanently
   */
  banChain: (slug: string, reason?: string) => {
    return api.post(`/admin/chains/${slug}/ban`, { reason });
  },

  /**
   * Suspend a chain temporarily
   */
  suspendChain: (slug: string, data: { reason?: string; duration_days?: number }) => {
    return api.post(`/admin/chains/${slug}/suspend`, data);
  },

  /**
   * Unban or unsuspend a chain
   */
  unbanChain: (slug: string, reason?: string) => {
    return api.post(`/admin/chains/${slug}/unban`, { reason });
  },

  /**
   * Delete a chain permanently
   */
  deleteChain: (slug: string, reason?: string) => {
    return api.delete(`/admin/chains/${slug}`, { data: { reason } });
  },

  /**
   * Feature or unfeature a chain
   */
  toggleChainFeatured: (slug: string) => {
    return api.post(`/admin/chains/${slug}/feature`);
  },

  /**
   * Get chain moderation logs
   */
  getModerationLogs: (params?: {
    page?: number;
    per_page?: number;
    chain_id?: string;
    action?: string;
    admin_id?: string;
  }) => {
    return api.get('/admin/chains/moderation-logs', { params });
  },

  /**
   * Get moderation logs for a specific chain
   */
  getChainLogs: (slug: string) => {
    return api.get(`/admin/chains/${slug}/logs`);
  },

  // ============================================================================
  // PLATFORM STATS
  // ============================================================================

  /**
   * Get platform statistics
   */
  getStats: () => {
    return api.get('/admin/stats');
  },
};
