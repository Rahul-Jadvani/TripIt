import api from './api';
import type {
  Chain,
  ChainFilters,
  ChainStats,
  ChainProjectRequest,
  Project,
  User,
  PaginatedResponse,
} from '../types';

// ============================================================================
// CHAIN CRUD
// ============================================================================

export interface CreateChainData {
  name: string;
  description: string;
  banner_url?: string;
  logo_url?: string;
  categories?: string[];
  rules?: string;
  social_links?: {
    twitter?: string;
    website?: string;
    discord?: string;
  };
  is_public?: boolean;
  requires_approval?: boolean;
}

export const chainApi = {
  // Create a new chain
  async createChain(data: CreateChainData): Promise<{ data: { chain: Chain } }> {
    const response = await api.post('/chains', data);
    return response.data;
  },

  // Get all chains with filters
  async getChains(filters?: ChainFilters): Promise<{
    data: {
      chains: Chain[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    };
  }> {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.sort) params.append('sort', filters.sort);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.visibility) params.append('visibility', filters.visibility);
    if (filters?.featured !== undefined) params.append('featured', filters.featured.toString());
    if (filters?.creator_id) params.append('creator_id', filters.creator_id);

    const response = await api.get(`/chains?${params.toString()}`);
    return response.data;
  },

  // Get chain by slug
  async getChain(slug: string): Promise<{
    data: {
      chain: Chain;
      stats: ChainStats;
    };
  }> {
    const response = await api.get(`/chains/${slug}`);
    return response.data;
  },

  // Update chain
  async updateChain(slug: string, data: Partial<CreateChainData>): Promise<{ data: { chain: Chain } }> {
    const response = await api.put(`/chains/${slug}`, data);
    return response.data;
  },

  // Delete chain
  async deleteChain(slug: string): Promise<{ data: null }> {
    const response = await api.delete(`/chains/${slug}`);
    return response.data;
  },

  // ============================================================================
  // CHAIN-PROJECT ASSOCIATION
  // ============================================================================

  // Add project to chain
  async addProjectToChain(
    slug: string,
    data: {
      project_id: string;
      message?: string;
    }
  ): Promise<{ data: any }> {
    const response = await api.post(`/chains/${slug}/projects`, data);
    return response.data;
  },

  // Remove project from chain
  async removeProjectFromChain(slug: string, projectId: string): Promise<{ data: null }> {
    const response = await api.delete(`/chains/${slug}/projects/${projectId}`);
    return response.data;
  },

  // Get projects in chain
  async getChainProjects(
    slug: string,
    filters?: {
      page?: number;
      limit?: number;
      sort?: 'trending' | 'newest' | 'top_rated' | 'most_voted' | 'pinned_first';
      tech_stack?: string;
      min_proof_score?: number;
      pinned_only?: boolean;
    }
  ): Promise<{
    data: {
      projects: Project[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    };
  }> {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.sort) params.append('sort', filters.sort);
    if (filters?.tech_stack) params.append('tech_stack', filters.tech_stack);
    if (filters?.min_proof_score) params.append('min_proof_score', filters.min_proof_score.toString());
    if (filters?.pinned_only) params.append('pinned_only', filters.pinned_only.toString());

    const response = await api.get(`/chains/${slug}/projects?${params.toString()}`);
    return response.data;
  },

  // Pin/unpin project
  async togglePinProject(slug: string, projectId: string): Promise<{ data: { is_pinned: boolean } }> {
    const response = await api.post(`/chains/${slug}/projects/${projectId}/pin`);
    return response.data;
  },

  // ============================================================================
  // APPROVAL WORKFLOW
  // ============================================================================

  // Get pending requests (chain owner only)
  async getChainRequests(slug: string, status: 'pending' | 'approved' | 'rejected' = 'pending'): Promise<{
    data: {
      requests: ChainProjectRequest[];
    };
  }> {
    const response = await api.get(`/chains/${slug}/requests?status=${status}`);
    return response.data;
  },

  // Approve request
  async approveRequest(slug: string, requestId: string): Promise<{ data: any }> {
    const response = await api.post(`/chains/${slug}/requests/${requestId}/approve`);
    return response.data;
  },

  // Reject request
  async rejectRequest(
    slug: string,
    requestId: string,
    reason?: string
  ): Promise<{ data: null }> {
    const response = await api.post(`/chains/${slug}/requests/${requestId}/reject`, { reason });
    return response.data;
  },

  // ============================================================================
  // FOLLOWING
  // ============================================================================

  // Follow chain
  async followChain(slug: string): Promise<{ data: { follower_count: number } }> {
    const response = await api.post(`/chains/${slug}/follow`);
    return response.data;
  },

  // Unfollow chain
  async unfollowChain(slug: string): Promise<{ data: { follower_count: number } }> {
    const response = await api.delete(`/chains/${slug}/follow`);
    return response.data;
  },

  // Get chain followers
  async getChainFollowers(
    slug: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    data: {
      followers: Array<{
        user: User;
        followed_at: string;
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    };
  }> {
    const response = await api.get(`/chains/${slug}/followers?page=${page}&limit=${limit}`);
    return response.data;
  },

  // Get chains user is following
  async getUserFollowingChains(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    data: {
      chains: Chain[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    };
  }> {
    const response = await api.get(`/chains/user/${userId}/following?page=${page}&limit=${limit}`);
    return response.data;
  },

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  // Get chain analytics (owner only)
  async getChainAnalytics(slug: string): Promise<{
    data: {
      chain: {
        id: string;
        name: string;
        slug: string;
        created_at: string;
      };
      overview: {
        total_projects: number;
        total_followers: number;
        total_views: number;
        average_project_score: number;
        pending_requests: number;
      };
      recent_activity: {
        followers_last_7_days: number;
        projects_last_7_days: number;
      };
      engagement: {
        total_upvotes: number;
        total_comments: number;
        engagement_rate: number;
      };
      growth: {
        follower_growth: Array<{ date: string; count: number }>;
        cumulative_followers: Array<{ date: string; followers: number }>;
        projects_added: Array<{ date: string; count: number }>;
      };
      top_projects: Array<{
        id: string;
        title: string;
        proof_score: number;
        upvotes: number;
        downvotes: number;
        comment_count: number;
        view_count: number;
        is_pinned: boolean;
        added_at: string;
      }>;
    };
  }> {
    const response = await api.get(`/chains/${slug}/analytics`);
    return response.data;
  },

  // Get chain recommendations based on categories
  async getChainRecommendations(categories?: string[]): Promise<{
    data: {
      chains: Chain[];
      count: number;
    };
  }> {
    const params = new URLSearchParams();
    if (categories && categories.length > 0) {
      categories.forEach((cat) => params.append('categories', cat));
    }
    const response = await api.get(`/chains/recommendations?${params.toString()}`);
    return response.data;
  },

  // ============================================================================
  // ADMIN
  // ============================================================================

  // Feature/unfeature chain (admin only)
  async toggleFeatureChain(slug: string): Promise<{ data: { is_featured: boolean } }> {
    const response = await api.post(`/chains/${slug}/feature`);
    return response.data;
  },
};

export default chainApi;
