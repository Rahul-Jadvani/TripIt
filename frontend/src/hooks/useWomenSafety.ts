import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

export interface WomenGuideFilters {
  search?: string;
  location?: string;
  specialization?: string;
  language?: string;
  min_rating?: number;
  verified_only?: boolean;
  available_only?: boolean;
  featured?: boolean;
}

export interface WomenGuide {
  id: string;
  traveler_id: string;
  bio: string;
  service_locations: string[];
  specializations: string[];
  languages_spoken: string[];
  availability_status: 'available' | 'busy' | 'unavailable';
  hourly_rate_usd?: number;
  average_rating: number;
  total_reviews: number;
  is_verified: boolean;
  is_featured: boolean;
  is_active: boolean;
  verification_date?: string;
  years_of_experience?: number;
  certifications?: string[];
  traveler?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  reviews?: GuideReview[];
  user_has_pending_booking?: boolean;
}

export interface GuideReview {
  id: string;
  guide_id: string;
  traveler_id: string;
  booking_id: string;
  rating: number;
  review_title?: string;
  review_text?: string;
  safety_rating: number;
  knowledge_rating: number;
  communication_rating: number;
  professionalism_rating: number;
  value_for_money_rating: number;
  verified_traveler: boolean;
  is_approved: boolean;
  tour_type?: string;
  tour_date?: string;
  created_at: string;
  traveler?: {
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

export interface GuideBooking {
  id: string;
  guide_id: string;
  traveler_id: string;
  destination: string;
  start_date: string;
  end_date: string;
  group_size: number;
  activity_type?: string;
  special_requirements?: string;
  notes_from_traveler?: string;
  total_cost_usd?: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
}

export interface BookGuideData {
  destination: string;
  start_date: string;
  end_date: string;
  group_size?: number;
  activity_type?: string;
  special_requirements?: string;
  notes?: string;
}

export interface SubmitGuideReviewData {
  rating: number;
  review_title?: string;
  review_text?: string;
  safety_rating?: number;
  knowledge_rating?: number;
  communication_rating?: number;
  professionalism_rating?: number;
  value_for_money_rating?: number;
}

export interface SafetyResourceFilters {
  category?: 'tips' | 'emergency' | 'legal' | 'health' | 'packing' | 'cultural' | 'navigation';
  region?: string;
  language?: string;
  featured?: boolean;
}

export interface SafetyResource {
  id: string;
  title: string;
  category: string;
  content: string;
  summary?: string;
  target_region?: string;
  target_countries?: string[];
  language: string;
  is_featured: boolean;
  is_pinned: boolean;
  view_count: number;
  helpful_count: number;
  external_links?: string[];
  created_at: string;
  updated_at: string;
}

export interface WomenSafetySettings {
  women_only_group_preference: boolean;
  location_sharing_enabled: boolean;
  emergency_contacts: Array<{
    name?: string;
    phone?: string;
  }>;
  medical_conditions?: string;
  insurance_provider?: string;
}

export interface UpdateWomenSafetySettingsData {
  women_only_group_preference?: boolean;
  location_sharing_enabled?: boolean;
  emergency_contacts?: Array<{
    name?: string;
    phone?: string;
  }>;
  insurance_provider?: string;
}

// ============================================================================
// Women Guides Query Hooks
// ============================================================================

/**
 * List all verified women travel guides with filtering
 * @param filters - Optional filters for guides
 * @param page - Page number (default: 1)
 * @returns Query with guides data, loading state, and error
 */
export function useWomenGuides(filters?: WomenGuideFilters, page: number = 1) {
  return useQuery({
    queryKey: ['women-guides', filters, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      if (filters?.location) params.append('location', filters.location);
      if (filters?.specialization) params.append('specialization', filters.specialization);
      if (filters?.language) params.append('language', filters.language);
      if (filters?.min_rating !== undefined) params.append('min_rating', String(filters.min_rating));
      if (filters?.verified_only !== undefined) params.append('verified_only', String(filters.verified_only));
      if (filters?.available_only !== undefined) params.append('available_only', String(filters.available_only));
      if (filters?.featured !== undefined) params.append('featured', String(filters.featured));
      params.append('page', String(page));

      const response = await api.get(`/women-safety/guides?${params.toString()}`);
      return response.data;
    },
    staleTime: 1000 * 60 * 15, // 15 minutes - guide availability changes slowly
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Infinite scroll version of women guides list
 * @param filters - Optional filters for guides
 * @returns Infinite query with guides data and fetchNextPage
 */
export function useInfiniteWomenGuides(filters?: WomenGuideFilters) {
  return useInfiniteQuery({
    queryKey: ['women-guides-infinite', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      if (filters?.location) params.append('location', filters.location);
      if (filters?.specialization) params.append('specialization', filters.specialization);
      if (filters?.language) params.append('language', filters.language);
      if (filters?.min_rating !== undefined) params.append('min_rating', String(filters.min_rating));
      if (filters?.verified_only !== undefined) params.append('verified_only', String(filters.verified_only));
      if (filters?.available_only !== undefined) params.append('available_only', String(filters.available_only));
      if (filters?.featured !== undefined) params.append('featured', String(filters.featured));
      params.append('page', String(pageParam));

      const response = await api.get(`/women-safety/guides?${params.toString()}`);
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      const { page, total_pages } = lastPage.data.pagination;
      return page < total_pages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 30,
  });
}

/**
 * Get single women guide with full profile and reviews
 * @param guideId - Guide ID
 * @returns Query with guide data including reviews, loading state, and error
 */
export function useWomenGuide(guideId: string) {
  return useQuery({
    queryKey: ['women-guide', guideId],
    queryFn: async () => {
      const response = await api.get(`/women-safety/guides/${guideId}`);
      return response.data.data;
    },
    enabled: !!guideId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 20,
    refetchOnMount: true,
    refetchOnWindowFocus: 'stale',
  });
}

// ============================================================================
// Guide Booking Mutation Hooks
// ============================================================================

/**
 * Book a women travel guide
 * @returns Mutation with booking function and loading state
 */
export function useBookGuide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ guideId, data }: { guideId: string; data: BookGuideData }) => {
      const response = await api.post(`/women-safety/guides/${guideId}/book`, data);
      return { guideId, ...response.data };
    },
    onSuccess: ({ guideId }) => {
      // Update guide to reflect booking
      queryClient.setQueryData(['women-guide', guideId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          user_has_pending_booking: true,
        };
      });

      // Invalidate guides list
      queryClient.invalidateQueries({ queryKey: ['women-guides'] });

      toast.success('Booking request sent to guide!');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to book guide';
      toast.error(errorMessage);
    },
  });
}

/**
 * Submit a review for a women guide after completing a booking
 * @param guideId - Guide ID
 * @returns Mutation with review submission function and loading state
 */
export function useGuideReview(guideId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SubmitGuideReviewData) => {
      const response = await api.post(`/women-safety/guides/${guideId}/reviews`, data);
      return response.data;
    },
    // Optimistic update
    onMutate: async (newReview) => {
      await queryClient.cancelQueries({ queryKey: ['women-guide', guideId] });

      const previousGuide = queryClient.getQueryData(['women-guide', guideId]);

      // Optimistically update guide's rating
      queryClient.setQueryData(['women-guide', guideId], (old: any) => {
        if (!old) return old;

        const currentReviews = old.reviews || [];
        const newTotalReviews = old.total_reviews + 1;
        const newAverageRating = ((old.average_rating * old.total_reviews) + newReview.rating) / newTotalReviews;

        return {
          ...old,
          average_rating: Math.round(newAverageRating * 100) / 100,
          total_reviews: newTotalReviews,
          reviews: [
            {
              rating: newReview.rating,
              review_title: newReview.review_title,
              review_text: newReview.review_text,
              safety_rating: newReview.safety_rating || newReview.rating,
              knowledge_rating: newReview.knowledge_rating || newReview.rating,
              communication_rating: newReview.communication_rating || newReview.rating,
              professionalism_rating: newReview.professionalism_rating || newReview.rating,
              value_for_money_rating: newReview.value_for_money_rating || newReview.rating,
              verified_traveler: true,
              is_approved: false, // Pending approval
              created_at: new Date().toISOString(),
            },
            ...currentReviews,
          ],
        };
      });

      return { previousGuide };
    },
    onSuccess: () => {
      // Get fresh data from server
      queryClient.invalidateQueries({ queryKey: ['women-guide', guideId] });
      queryClient.invalidateQueries({ queryKey: ['women-guides'] });

      toast.success('Review submitted successfully!');
    },
    onError: (error: any, _newReview, context) => {
      // Rollback optimistic update
      if (context?.previousGuide) {
        queryClient.setQueryData(['women-guide', guideId], context.previousGuide);
      }

      const errorMessage = error.response?.data?.message || error.message || 'Failed to submit review';
      toast.error(errorMessage);
    },
  });
}

// ============================================================================
// Safety Resources Query Hooks
// ============================================================================

/**
 * List women safety resources (tips, emergency info, guides)
 * @param filters - Optional filters for resources
 * @param page - Page number (default: 1)
 * @returns Query with resources data, loading state, and error
 */
export function useSafetyResources(filters?: SafetyResourceFilters, page: number = 1) {
  return useQuery({
    queryKey: ['safety-resources', filters, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.category) params.append('category', filters.category);
      if (filters?.region) params.append('region', filters.region);
      if (filters?.language) params.append('language', filters.language);
      if (filters?.featured !== undefined) params.append('featured', String(filters.featured));
      params.append('page', String(page));

      const response = await api.get(`/women-safety/resources?${params.toString()}`);
      return response.data;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes - resources change rarely
    gcTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Mark a safety resource as helpful
 * @param resourceId - Resource ID
 * @returns Mutation with mark helpful function
 */
export function useMarkResourceHelpful(resourceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post(`/women-safety/resources/${resourceId}/helpful`);
      return response.data;
    },
    // Optimistic update
    onMutate: async () => {
      // Update all queries containing this resource
      queryClient.setQueriesData({ queryKey: ['safety-resources'] }, (old: any) => {
        if (!old?.data?.resources) return old;

        return {
          ...old,
          data: {
            ...old.data,
            resources: old.data.resources.map((resource: SafetyResource) => {
              if (resource.id === resourceId) {
                return {
                  ...resource,
                  helpful_count: (resource.helpful_count || 0) + 1,
                };
              }
              return resource;
            }),
          },
        };
      });
    },
    onSuccess: () => {
      // Reconcile with server
      queryClient.invalidateQueries({ queryKey: ['safety-resources'] });
      toast.success('Marked as helpful');
    },
    onError: () => {
      // Rollback by invalidating
      queryClient.invalidateQueries({ queryKey: ['safety-resources'] });
      toast.error('Failed to mark as helpful');
    },
  });
}

// ============================================================================
// Women Safety Settings Hooks
// ============================================================================

/**
 * Get current user's women safety settings
 * @returns Query with safety settings, loading state, and error
 */
export function useWomenSafetySettings() {
  return useQuery({
    queryKey: ['women-safety-settings'],
    queryFn: async () => {
      const response = await api.get('/women-safety/settings');
      return response.data.data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour - settings change rarely
    gcTime: 1000 * 60 * 120, // 2 hours
    refetchOnWindowFocus: false,
  });
}

/**
 * Update women safety settings (emergency contacts, preferences, etc.)
 * @returns Mutation with update function and loading state
 */
export function useUpdateWomenSafetySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateWomenSafetySettingsData) => {
      const response = await api.put('/women-safety/settings', data);
      return response.data;
    },
    // Optimistic update
    onMutate: async (newSettings) => {
      await queryClient.cancelQueries({ queryKey: ['women-safety-settings'] });

      const previousSettings = queryClient.getQueryData(['women-safety-settings']);

      // Optimistically update settings
      queryClient.setQueryData(['women-safety-settings'], (old: any) => {
        if (!old) return newSettings;
        return {
          ...old,
          ...newSettings,
        };
      });

      return { previousSettings };
    },
    onSuccess: () => {
      // Reconcile with server
      queryClient.invalidateQueries({ queryKey: ['women-safety-settings'] });
      toast.success('Safety settings updated successfully!');
    },
    onError: (error: any, _newSettings, context) => {
      // Rollback optimistic update
      if (context?.previousSettings) {
        queryClient.setQueryData(['women-safety-settings'], context.previousSettings);
      }

      const errorMessage = error.response?.data?.message || error.message || 'Failed to update settings';
      toast.error(errorMessage);
    },
  });
}
