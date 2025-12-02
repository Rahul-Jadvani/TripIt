import api from './api';
import type {
  Community,
  CommunityFilters,
  CommunityStats,
  CommunityItineraryRequest,
  Itinerary,
  User,
  PaginatedResponse,
} from '../types';

// ============================================================================
// COMMUNITY CRUD
// ============================================================================

export interface CreateCommunityData {
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

export const communityApi = {
  // Create a new community
  async createCommunity(data: CreateCommunityData): Promise<{ data: { community: Community } }> {
    const response = await api.post('/communities', data);
    return response.data;
  },

  // Get all communities with filters
  async getCommunities(filters?: CommunityFilters): Promise<{
    data: {
      communities: Community[];
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

    const response = await api.get(`/communities?${params.toString()}`);
    return response.data;
  },

  // Get community by slug
  async getCommunity(slug: string): Promise<{
    data: {
      community: Community;
      stats: CommunityStats;
    };
  }> {
    const response = await api.get(`/communities/${slug}`);
    return response.data;
  },

  // Update community
  async updateCommunity(slug: string, data: Partial<CreateCommunityData>): Promise<{ data: { community: Community } }> {
    const response = await api.put(`/communities/${slug}`, data);
    return response.data;
  },

  // Delete community
  async deleteCommunity(slug: string): Promise<{ data: null }> {
    const response = await api.delete(`/communities/${slug}`);
    return response.data;
  },

  // ============================================================================
  // COMMUNITY-ITINERARY ASSOCIATION
  // ============================================================================

  // Add itinerary to community
  async addItineraryToCommunity(
    slug: string,
    data: {
      itinerary_id: string;
      message?: string;
    }
  ): Promise<{ data: any }> {
    // Convert itinerary_id to project_id for backend compatibility
    const response = await api.post(`/communities/${slug}/projects`, {
      project_id: data.itinerary_id,
      message: data.message
    });
    return response.data;
  },

  // Remove itinerary from community
  async removeItineraryFromCommunity(slug: string, itineraryId: string): Promise<{ data: null }> {
    const response = await api.delete(`/communities/${slug}/projects/${itineraryId}`);
    return response.data;
  },

  // Get itineraries in community
  async getCommunityItineraries(
    slug: string,
    filters?: {
      page?: number;
      limit?: number;
      sort?: 'trending' | 'newest' | 'top_rated' | 'most_voted' | 'pinned_first';
      travel_style?: string;
      min_trust_score?: number;
      pinned_only?: boolean;
    }
  ): Promise<{
    data: {
      itineraries: Itinerary[];
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
    if (filters?.travel_style) params.append('travel_style', filters.travel_style);
    if (filters?.min_trust_score) params.append('min_trust_score', filters.min_trust_score.toString());
    if (filters?.pinned_only) params.append('pinned_only', filters.pinned_only.toString());

    const response = await api.get(`/communities/${slug}/projects?${params.toString()}`);
    return response.data;
  },

  // Pin/unpin itinerary
  async togglePinItinerary(slug: string, itineraryId: string): Promise<{ data: { is_pinned: boolean } }> {
    const response = await api.post(`/communities/${slug}/projects/${itineraryId}/pin`);
    return response.data;
  },

  // ============================================================================
  // APPROVAL WORKFLOW
  // ============================================================================

  // Get pending requests (community owner only)
  async getCommunityRequests(slug: string, status: 'pending' | 'approved' | 'rejected' = 'pending'): Promise<{
    data: {
      requests: CommunityItineraryRequest[];
    };
  }> {
    const response = await api.get(`/communities/${slug}/requests?status=${status}`);
    return response.data;
  },

  // Approve request
  async approveRequest(slug: string, requestId: string): Promise<{ data: any }> {
    const response = await api.post(`/communities/${slug}/requests/${requestId}/approve`);
    return response.data;
  },

  // Reject request
  async rejectRequest(
    slug: string,
    requestId: string,
    reason?: string
  ): Promise<{ data: null }> {
    const response = await api.post(`/communities/${slug}/requests/${requestId}/reject`, { reason });
    return response.data;
  },

  // ============================================================================
  // FOLLOWING
  // ============================================================================

  // Follow community
  async followCommunity(slug: string): Promise<{ data: { follower_count: number } }> {
    const response = await api.post(`/communities/${slug}/follow`);
    return response.data;
  },

  // Unfollow community
  async unfollowCommunity(slug: string): Promise<{ data: { follower_count: number } }> {
    const response = await api.delete(`/communities/${slug}/follow`);
    return response.data;
  },

  // Get community followers
  async getCommunityFollowers(
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
    const response = await api.get(`/communities/${slug}/followers?page=${page}&limit=${limit}`);
    return response.data;
  },

  // Get communities user is following
  async getUserFollowingCommunities(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    data: {
      communities: Community[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    };
  }> {
    const response = await api.get(`/communities/user/${userId}/following?page=${page}&limit=${limit}`);
    return response.data;
  },

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  // Get community analytics (owner only)
  async getCommunityAnalytics(slug: string): Promise<{
    data: {
      community: {
        id: string;
        name: string;
        slug: string;
        created_at: string;
      };
      overview: {
        total_itineraries: number;
        total_followers: number;
        total_views: number;
        average_itinerary_score: number;
        pending_requests: number;
      };
      recent_activity: {
        followers_last_7_days: number;
        itineraries_last_7_days: number;
      };
      engagement: {
        total_upvotes: number;
        total_comments: number;
        engagement_rate: number;
      };
      growth: {
        follower_growth: Array<{ date: string; count: number }>;
        cumulative_followers: Array<{ date: string; followers: number }>;
        itineraries_added: Array<{ date: string; count: number }>;
      };
      top_itineraries: Array<{
        id: string;
        title: string;
        trust_score: number;
        upvotes: number;
        downvotes: number;
        comment_count: number;
        view_count: number;
        is_pinned: boolean;
        added_at: string;
      }>;
    };
  }> {
    const response = await api.get(`/communities/${slug}/analytics`);
    return response.data;
  },

  // Get community recommendations based on categories
  async getCommunityRecommendations(categories?: string[]): Promise<{
    data: {
      communities: Community[];
      count: number;
    };
  }> {
    const params = new URLSearchParams();
    if (categories && categories.length > 0) {
      categories.forEach((cat) => params.append('categories', cat));
    }
    const response = await api.get(`/communities/recommendations?${params.toString()}`);
    return response.data;
  },

  // ============================================================================
  // ADMIN
  // ============================================================================

  // Feature/unfeature community (admin only)
  async toggleFeatureCommunity(slug: string): Promise<{ data: { is_featured: boolean } }> {
    const response = await api.post(`/communities/${slug}/feature`);
    return response.data;
  },
};

export default communityApi;
