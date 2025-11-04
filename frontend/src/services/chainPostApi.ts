import api from './api';
import type { ChainPost, ChainPostFilters } from '../types';

// ============================================================================
// CHAIN POSTS API
// ============================================================================

export interface CreateChainPostData {
  title?: string;
  content: string;
  parent_id?: string;
  image_urls?: string[];
}

export interface ChainPostResponse {
  posts: ChainPost[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ChainPostRepliesResponse {
  replies: ChainPost[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export const chainPostApi = {
  // Create a new post or reply
  async createPost(slug: string, data: CreateChainPostData): Promise<{ data: ChainPost }> {
    const response = await api.post(`/chains/${slug}/posts`, data);
    return response.data;
  },

  // Get all posts in a chain (top-level only)
  async getPosts(slug: string, filters?: ChainPostFilters): Promise<{ data: ChainPostResponse }> {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.per_page) params.append('per_page', filters.per_page.toString());
    if (filters?.sort) params.append('sort', filters.sort);

    const response = await api.get(`/chains/${slug}/posts?${params.toString()}`);
    return response.data;
  },

  // Get a single post with its direct replies
  async getPost(slug: string, postId: string): Promise<{ data: ChainPost }> {
    const response = await api.get(`/chains/${slug}/posts/${postId}`);
    return response.data;
  },

  // Get replies for a post (paginated)
  async getPostReplies(
    slug: string,
    postId: string,
    filters?: { page?: number; per_page?: number; sort?: 'top' | 'new' }
  ): Promise<{ data: ChainPostRepliesResponse }> {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.per_page) params.append('per_page', filters.per_page.toString());
    if (filters?.sort) params.append('sort', filters.sort);

    const response = await api.get(`/chains/${slug}/posts/${postId}/replies?${params.toString()}`);
    return response.data;
  },

  // Update a post
  async updatePost(
    slug: string,
    postId: string,
    data: Partial<CreateChainPostData>
  ): Promise<{ data: ChainPost }> {
    const response = await api.put(`/chains/${slug}/posts/${postId}`, data);
    return response.data;
  },

  // Delete a post (soft delete)
  async deletePost(slug: string, postId: string): Promise<{ data: null }> {
    const response = await api.delete(`/chains/${slug}/posts/${postId}`);
    return response.data;
  },

  // React to a post (upvote/downvote)
  async reactToPost(
    slug: string,
    postId: string,
    reactionType: 'upvote' | 'downvote'
  ): Promise<{
    data: {
      reaction_type?: string;
      reaction_removed?: boolean;
      upvote_count: number;
      downvote_count: number;
    };
  }> {
    const response = await api.post(`/chains/${slug}/posts/${postId}/react`, {
      reaction_type: reactionType,
    });
    return response.data;
  },

  // Pin/unpin a post (chain owner only)
  async togglePinPost(slug: string, postId: string): Promise<{ data: { is_pinned: boolean } }> {
    const response = await api.post(`/chains/${slug}/posts/${postId}/pin`);
    return response.data;
  },

  // Lock/unlock a post (chain owner only)
  async toggleLockPost(slug: string, postId: string): Promise<{ data: { is_locked: boolean } }> {
    const response = await api.post(`/chains/${slug}/posts/${postId}/lock`);
    return response.data;
  },
};
