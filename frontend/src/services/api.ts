import axios from 'axios';

// Get backend URL without /api suffix (used for non-API endpoints)
export const getBackendUrl = (): string => {
  let baseUrl = import.meta.env.VITE_API_URL;
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
  const isDev = currentHost.includes('localhost') || currentHost.includes('127.0.0.1');

  if (!baseUrl) {
    if (isDev) {
      baseUrl = 'http://localhost:5000';
    } else {
      baseUrl = 'https://backend.zer0.pro';
    }
  }

  // Remove /api suffix if present
  return baseUrl.endsWith('/api') ? baseUrl.slice(0, -4) : baseUrl;
};

// Ensure API base always ends with /api
export const getApiBase = () => {
  const baseUrl = getBackendUrl();

  if (import.meta.env.DEV) console.log('🌐 API Base URL configured:', {
    currentHost: typeof window !== 'undefined' ? window.location.hostname : '',
    isDevelopment: (typeof window !== 'undefined' ? window.location.hostname : '').includes('localhost') || (typeof window !== 'undefined' ? window.location.hostname : '').includes('127.0.0.1'),
    baseUrl: baseUrl,
    fromEnvVar: !!import.meta.env.VITE_API_URL,
    viteApiUrl: import.meta.env.VITE_API_URL || 'not set'
  });

  const finalUrl = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
  if (import.meta.env.DEV) console.log('🌐 Final API Base URL:', finalUrl);
  return finalUrl;
};

export const API_BASE = getApiBase();

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (import.meta.env.DEV) console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
  return config;
});

// Handle responses and errors
api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) console.log(`[API Response] ${response.status}`, response.data);
    return response;
  },
  async (error) => {
    const config = error.config;

    if (import.meta.env.DEV) console.error(`[API Error] ${error.response?.status || 'Network'}:`, {
      url: config?.url,
      method: config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    // Handle 401 Unauthorized - try to refresh token
    if (error.response?.status === 401 && !config._retry) {
      config._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE}/auth/refresh`, {}, {
            headers: { Authorization: `Bearer ${refreshToken}` },
          });

          // Backend returns { status, message, data: { access } }
          const newAccessToken = response.data?.data?.access;
          if (newAccessToken) {
            if (import.meta.env.DEV) console.log('[Auth] Token refreshed successfully');
            localStorage.setItem('token', newAccessToken);
            api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
            config.headers['Authorization'] = `Bearer ${newAccessToken}`;
            return api(config);
          }
        }
      } catch (refreshError) {
        if (import.meta.env.DEV) console.error('[Auth] Token refresh failed:', refreshError);
        // Refresh failed, clear auth and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }

    // Handle other error statuses with backend messages
    if (error.response?.data?.message) {
      error.message = error.response.data.message;
    } else if (error.response?.status === 403) {
      error.message = 'You do not have permission to perform this action';
    } else if (error.response?.status === 404) {
      error.message = 'Resource not found';
    } else if (error.response?.status === 500) {
      error.message = 'Server error. Please try again later';
    } else if (!error.response) {
      error.message = 'Network error. Please check your connection';
    }

    return Promise.reject(error);
  }
);

// Itineraries (TripIt - replaces Projects)
export const itinerariesService = {
  getAll: (sort: string = 'trending', page: number = 1, includeDetailed: boolean = false) =>
    api.get(`/itineraries?sort=${sort}&page=${page}${includeDetailed ? '&include=detailed' : ''}`),
  getById: (id: string) => api.get(`/itineraries/${id}`),
  create: (data: any) => api.post('/itineraries', data),
  update: (id: string, data: any) => api.put(`/itineraries/${id}`, data),
  delete: (id: string) => api.delete(`/itineraries/${id}`),
  rescoreItinerary: (itineraryId: string) => api.post(`/admin/itineraries/${itineraryId}/rescore`),
  getByUser: (userId: string) => api.get(`/users/${userId}/itineraries`),
  getTaggedItineraries: (userId: string) => api.get(`/users/${userId}/tagged-itineraries`),
  getMostRequested: (limit: number = 20) => api.get(`/itineraries/most-requested?limit=${limit}`),
  getFeatured: (limit: number = 20) => api.get(`/itineraries/featured?limit=${limit}`),
  getByDestination: (destination: string, limit: number = 20) => api.get(`/itineraries/by-destination/${encodeURIComponent(destination)}?limit=${limit}`),
  getRisingStars: (limit: number = 20) => api.get(`/itineraries/rising-stars?limit=${limit}`),
  getExpertMatches: (page: number = 1, perPage: number = 20, minScore: number = 20) =>
    api.get(`/itineraries/travel-expert/matches?page=${page}&per_page=${perPage}&min_score=${minScore}`),
};

// Keep legacy projectsService as alias for backward compatibility during migration
export const projectsService = itinerariesService;

// Safety Ratings (TripIt - replaces Votes)
export const safetyRatingsService = {
  addRating: (itineraryId: string, data: any) =>
    api.post('/safety-ratings', { ...data, itinerary_id: itineraryId }),
  getRatings: (itineraryId: string) =>
    api.get(`/safety-ratings/${itineraryId}`),
  getRatingById: (ratingId: string) =>
    api.get(`/safety-ratings/${ratingId}`),
  updateRating: (ratingId: string, data: any) =>
    api.put(`/safety-ratings/${ratingId}`, data),
  deleteRating: (ratingId: string) =>
    api.delete(`/safety-ratings/${ratingId}`),
  getUserRatings: () =>
    api.get('/safety-ratings/user/ratings'),
  markHelpful: (ratingId: string) =>
    api.post(`/safety-ratings/${ratingId}/helpful`),
  markUnhelpful: (ratingId: string) =>
    api.post(`/safety-ratings/${ratingId}/unhelpful`),
};

// Keep legacy votesService as alias for backward compatibility during migration
export const votesService = {
  vote: (projectId: string, voteType: 'up' | 'down') =>
    safetyRatingsService.addRating(projectId, {
      overall_safety_score: voteType === 'up' ? 5 : 1
    }),
  getUserVotes: () => safetyRatingsService.getUserRatings(),
};

// Travel Intel (TripIt - replaces Comments)
export const travelIntelService = {
  getByItinerary: (itineraryId: string) =>
    api.get(
      `/travel-intel?itinerary_id=${encodeURIComponent(itineraryId)}&per_page=100`
    ),
  create: (data: any) => api.post('/travel-intel', data),
  getById: (intelId: string) => api.get(`/travel-intel/${intelId}`),
  update: (intelId: string, data: any) => api.put(`/travel-intel/${intelId}`, data),
  delete: (intelId: string) => api.delete(`/travel-intel/${intelId}`),
  markHelpful: (intelId: string) =>
    api.post(`/travel-intel/${intelId}/helpful`),
  markUnhelpful: (intelId: string) =>
    api.post(`/travel-intel/${intelId}/unhelpful`),
  respond: (intelId: string, data: any) =>
    api.post(`/travel-intel/${intelId}/respond`, data),
  getUserIntel: () =>
    api.get('/travel-intel/user/intel'),
  getStats: (itineraryId: string) =>
    api.get(`/travel-intel/stats/${itineraryId}`),
};

// Keep legacy commentsService as alias for backward compatibility during migration
export const commentsService = {
  getByProject: (projectId: string) =>
    travelIntelService.getByItinerary(projectId),
  create: (data: any) => travelIntelService.create(data),
  update: (commentId: string, data: any) => travelIntelService.update(commentId, data),
  delete: (commentId: string) => travelIntelService.delete(commentId),
  vote: (commentId: string, voteType: 'up' | 'down') =>
    voteType === 'up' ? travelIntelService.markHelpful(commentId) : travelIntelService.markUnhelpful(commentId),
};

// Badges
export const badgesService = {
  award: (data: any) => api.post('/badges/award', data),
  getByProject: (projectId: string) => api.get(`/badges/${projectId}`),
};

// Users
export const usersService = {
  getByUsername: (username: string) => api.get(`/users/${username}`),
  update: (data: any) => api.put('/users/profile', data),
  getProfile: () => api.get('/auth/me'),
  getStats: () => api.get('/users/stats'),
  searchTravelers: (query: string) => api.get(`/users/search?q=${encodeURIComponent(query)}`),
};

// Wallet & Verification
export const walletService = {
  verifyCert: (walletAddress: string) => api.post('/blockchain/verify-cert', { wallet_address: walletAddress }),
  getCertInfo: (walletAddress: string) => api.get(`/blockchain/cert-info/${walletAddress}`),
  checkHealth: () => api.get('/blockchain/health'),
};

// Authentication
export const authService = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (email: string, username: string, password: string, display_name?: string) =>
    api.post('/auth/register', { email, username, password, display_name }),
  getCurrentUser: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh'),
  githubConnect: () => api.get('/auth/github/connect'),
  githubDisconnect: () => api.post('/auth/github/disconnect'),
  requestOTP: (email: string) => api.post('/auth/otp/request', { email }),
  verifyOTP: (email: string, otp: string) => api.post('/auth/otp/verify', { email, otp }),
};

// File Upload
export const uploadService = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  testConnection: () => api.get('/upload/test'),
};

// Intro Requests
export const introsService = {
  create: (data: any) => api.post('/intros/request', data),
  getReceived: () => api.get('/intros/received'),
  getSent: () => api.get('/intros/sent'),
  accept: (id: string) => api.put(`/intros/${id}/accept`),
  decline: (id: string) => api.put(`/intros/${id}/decline`),
  getRecentConnections: (limit: number = 20) => api.get(`/intros/recent-connections?limit=${limit}`),
};

// Search & Leaderboard
export const searchService = {
  search: (query: string, type?: string) =>
    api.get(`/search?q=${query}${type ? `&type=${type}` : ''}`),
};

export const leaderboardService = {
  getProjects: (limit: number = 50) => api.get(`/users/leaderboard/projects?limit=${limit}`),
  getBuilders: (limit: number = 50) => api.get(`/users/leaderboard/builders?limit=${limit}`),
  getFeatured: () => api.get('/users/leaderboard/featured'),
};

// Saved Itineraries (TripIt - replaces Saved Projects)
export const savedItinerariesService = {
  saveItinerary: (itineraryId: string) => api.post(`/saved/save/${itineraryId}`),
  unsaveItinerary: (itineraryId: string) => api.delete(`/saved/unsave/${itineraryId}`),
  getMySavedItineraries: (page: number = 1, perPage: number = 20) =>
    api.get(`/saved/itineraries?page=${page}&per_page=${perPage}`),
  checkIfSavedItinerary: (itineraryId: string) => api.get(`/saved/check/${itineraryId}`),
};

// Keep legacy savedProjectsService as alias for backward compatibility during migration
export const savedProjectsService = {
  saveProject: (projectId: string) => savedItinerariesService.saveItinerary(projectId),
  unsaveProject: (projectId: string) => savedItinerariesService.unsaveItinerary(projectId),
  getMySavedProjects: (page: number = 1, perPage: number = 20) =>
    savedItinerariesService.getMySavedItineraries(page, perPage),
  checkIfSaved: (projectId: string) => savedItinerariesService.checkIfSavedItinerary(projectId),
};

// Feedback
export const feedbackService = {
  submitFeedback: (data: {
    feedback_type: 'suggestion' | 'improvement' | 'contact' | 'report';
    message: string;
    contact_email?: string;
    reported_project_id?: string;
    reported_user_id?: string;
    report_reason?: 'spam' | 'inappropriate' | 'harassment' | 'false_info' | 'other';
  }) => api.post('/feedback', data),
};

// Admin
export const adminService = {
  // Analytics
  getStats: () => api.get('/admin/stats'),

  // Users
  getUsers: (params: { search?: string; role?: string; perPage?: number } = {}) => {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.role) queryParams.append('role', params.role);
    if (params.perPage) queryParams.append('per_page', params.perPage.toString());
    return api.get(`/admin/users?${queryParams.toString()}`);
  },
  toggleUserAdmin: (userId: string) => api.post(`/admin/users/${userId}/toggle-admin`),
  toggleUserActive: (userId: string) => api.post(`/admin/users/${userId}/toggle-active`),

  // Validators
  getValidators: () => api.get('/admin/validators'),
  addValidator: (email: string) => api.post('/admin/validators/add-email', { email }),
  removeValidator: (validatorId: string) => api.post(`/admin/validators/${validatorId}/remove`),
  updateValidatorPermissions: (validatorId: string, permissions: any) =>
    api.post(`/admin/validators/${validatorId}/permissions`, permissions),

  // Itineraries (replaces Projects)
  getItineraries: (params: { search?: string; page?: number; perPage?: number } = {}) => {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.perPage) queryParams.append('per_page', params.perPage.toString());
    return api.get(`/admin/itineraries?${queryParams.toString()}`);
  },
  toggleItineraryFeatured: (itineraryId: string) => api.post(`/admin/itineraries/${itineraryId}/feature`),
  deleteItinerary: (itineraryId: string) => api.delete(`/admin/itineraries/${itineraryId}`),

  // Keep legacy Projects alias for backward compatibility
  getProjects: (params: { search?: string; page?: number; perPage?: number } = {}) => {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.perPage) queryParams.append('per_page', params.perPage.toString());
    return api.get(`/admin/itineraries?${queryParams.toString()}`);
  },
  toggleProjectFeatured: (projectId: string) => api.post(`/admin/itineraries/${projectId}/feature`),
  deleteProject: (projectId: string) => api.delete(`/admin/itineraries/${projectId}`),

  // Badges
  awardCustomBadge: (data: {
    project_id: string;
    badge_type: string;
    custom_name: string;
    custom_image?: string;
    points: number;
    rationale: string;
  }) => api.post('/admin/badges/award', data),
  getAllBadges: (params: { page?: number; perPage?: number; projectId?: string; validatorId?: string; badgeType?: string } = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.perPage) queryParams.append('per_page', params.perPage.toString());
    if (params.projectId) queryParams.append('project_id', params.projectId);
    if (params.validatorId) queryParams.append('validator_id', params.validatorId);
    if (params.badgeType) queryParams.append('badge_type', params.badgeType);
    return api.get(`/admin/badges?${queryParams.toString()}`);
  },
  getBadge: (badgeId: string) => api.get(`/admin/badges/${badgeId}`),
  updateBadge: (badgeId: string, data: { badge_type?: string; rationale?: string }) => api.patch(`/admin/badges/${badgeId}`, data),
  deleteBadge: (badgeId: string) => api.delete(`/admin/badges/${badgeId}`),
  getProjectBadges: (projectId: string) => api.get(`/admin/projects/${projectId}/badges`),

  // Investor Requests
  getInvestorRequests: () => api.get('/admin/investor-requests'),
  approveInvestorRequest: (requestId: string) => api.post(`/admin/investor-requests/${requestId}/approve`),
  rejectInvestorRequest: (requestId: string) => api.post(`/admin/investor-requests/${requestId}/reject`),
  getMyInvestorProfile: () => api.get('/investor-requests/my-request'),
  getUserInvestorProfile: (userId: string) => api.get(`/investor-requests/user/${userId}`),
  getPublicInvestors: () => api.get('/investor-requests/public'),

  // Validator Assignments
  assignProjectToValidator: (data: {
    validator_id: string;
    project_id: string;
    category_filter?: string;
    priority?: string;
  }) => api.post('/admin/validator-assignments', data),
  bulkAssignProjects: (data: {
    validator_id: string;
    category_filter: string;
    priority?: string;
    limit?: number;
  }) => api.post('/admin/validator-assignments/bulk', data),
  removeValidatorAssignment: (assignmentId: string) => api.delete(`/admin/validator-assignments/${assignmentId}`),
  getValidatorAssignments: (validatorId: string) => api.get(`/admin/validator-assignments/validator/${validatorId}`),
  getCategories: () => api.get('/admin/categories'),

  // Feedback & Reports
  getAllFeedback: (params: { type?: string; status?: string; page?: number; perPage?: number } = {}) => {
    const queryParams = new URLSearchParams();
    if (params.type) queryParams.append('type', params.type);
    if (params.status) queryParams.append('status', params.status);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.perPage) queryParams.append('per_page', params.perPage.toString());
    return api.get(`/feedback/admin?${queryParams.toString()}`);
  },
  updateFeedbackStatus: (feedbackId: string, data: { status: string; admin_notes?: string }) =>
    api.patch(`/feedback/admin/${feedbackId}/status`, data),
  deleteFeedback: (feedbackId: string) => api.delete(`/feedback/admin/${feedbackId}`),

  // Scoring Configuration
  getScoringConfig: () => api.get('/admin/scoring/config'),
  updateScoringConfig: (data: { config_key: string; config_value: any }) =>
    api.put('/admin/scoring/config', data),
  getScoringStats: () => api.get('/admin/scoring/stats'),
  rescoreProject: (projectId: string) => api.post(`/admin/projects/${projectId}/rescore`),
  rescoreProjectsBulk: (data: { filter: string }) => api.post('/admin/projects/rescore/bulk', data),

  // Itinerary Rescoring
  rescoreItinerary: (itineraryId: string) => api.post(`/admin/itineraries/${itineraryId}/rescore`),
  rescoreItinerariesBulk: (data?: { limit?: number; force?: boolean }) => api.post('/admin/itineraries/rescore/bulk', data || {}),
};

// Public Investors (non-admin convenience wrapper)
export const publicInvestorsService = {
  getAll: () => api.get('/investor-requests/public'),
};

// Messages
export const messagesService = {
  getConversations: () => api.get('/messages/conversations'),
  getConversation: (userId: string) => api.get(`/messages/conversation/${userId}`),
  send: (recipientId: string, message: string) =>
    api.post('/messages/send', { recipient_id: recipientId, message }),
  markRead: (messageId: string) => api.put(`/messages/${messageId}/read`),
};

// Travel Groups
export const travelGroupsService = {
  getGroups: (params?: any) => {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.destination) queryParams.append('destination', params.destination);
    if (params?.group_type) queryParams.append('group_type', params.group_type);
    if (params?.activity && params.activity.length > 0) {
      params.activity.forEach((a: string) => queryParams.append('activity', a));
    }
    if (params?.women_safe !== undefined) queryParams.append('women_safe', String(params.women_safe));
    if (params?.has_availability !== undefined) queryParams.append('has_availability', String(params.has_availability));
    if (params?.sort) queryParams.append('sort', params.sort);
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));
    return api.get(`/travel-groups?${queryParams.toString()}`);
  },
  getGroupById: (groupId: string) => api.get(`/travel-groups/${groupId}`),
  createGroup: (data: any) => api.post('/travel-groups', data),
  updateGroup: (groupId: string, data: any) => api.put(`/travel-groups/${groupId}`, data),
  deleteGroup: (groupId: string) => api.delete(`/travel-groups/${groupId}`),
  joinGroup: (groupId: string) => api.post(`/travel-groups/${groupId}/join`),
  leaveGroup: (groupId: string) => api.post(`/travel-groups/${groupId}/leave`),
  getMembers: (groupId: string, page?: number) =>
    api.get(`/travel-groups/${groupId}/members${page ? `?page=${page}` : ''}`),
  inviteMember: (groupId: string, travelerId: string) =>
    api.post(`/travel-groups/${groupId}/invite`, { traveler_id: travelerId }),
  removeMember: (groupId: string, memberId: string) =>
    api.delete(`/travel-groups/${groupId}/members/${memberId}`),
  updateMemberRole: (groupId: string, memberId: string, role: string) =>
    api.put(`/travel-groups/${groupId}/members/${memberId}/role`, { role }),
  getGroupInvites: (groupId: string) =>
    api.get(`/travel-groups/${groupId}/invites`),
  cancelInvite: (groupId: string, inviteId: string) =>
    api.delete(`/travel-groups/${groupId}/invites/${inviteId}`),
  getMatching: (page?: number) =>
    api.get(`/travel-groups/matching${page ? `?page=${page}` : ''}`),
};

// Snaps
export const snapsService = {
  getAll: (page: number = 1, limit: number = 20) =>
    api.get(`/snaps?page=${page}&limit=${limit}`),
  getById: (snapId: string) => api.get(`/snaps/${snapId}`),
  create: (formData: FormData) =>
    api.post('/snaps', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (snapId: string) => api.delete(`/snaps/${snapId}`),
  like: (snapId: string) => api.post(`/snaps/${snapId}/like`),
  getFeed: (page: number = 1, limit: number = 20) =>
    api.get(`/snaps/feed?page=${page}&limit=${limit}`),
  getByUser: (userId: string, page: number = 1, limit: number = 20) =>
    api.get(`/snaps/user/${userId}?page=${page}&limit=${limit}`),
};

// Women's Safety Feature
export const womenSafetyService = {
  // Women Guides
  getGuides: (params?: any) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
    if (params?.sort) queryParams.append('sort', params.sort);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.location) queryParams.append('location', params.location);
    if (params?.language) queryParams.append('language', params.language);
    if (params?.specialization) queryParams.append('specialization', params.specialization);
    if (params?.verified_only) queryParams.append('verified_only', params.verified_only);
    if (params?.min_rating) queryParams.append('min_rating', params.min_rating.toString());
    return api.get(`/women-safety/guides?${queryParams.toString()}`);
  },
  getGuideById: (guideId: string) => api.get(`/women-safety/guides/${guideId}`),
  getGuideReviews: (guideId: string, page: number = 1, perPage: number = 20) =>
    api.get(`/women-safety/guides/${guideId}/reviews?page=${page}&per_page=${perPage}`),

  // Guide Bookings
  createBooking: (data: any) => api.post('/women-safety/bookings', data),
  getMyBookings: (page: number = 1, perPage: number = 20) =>
    api.get(`/women-safety/bookings?page=${page}&per_page=${perPage}`),
  getBookingById: (bookingId: string) => api.get(`/women-safety/bookings/${bookingId}`),
  updateBooking: (bookingId: string, data: any) =>
    api.put(`/women-safety/bookings/${bookingId}`, data),
  cancelBooking: (bookingId: string) => api.delete(`/women-safety/bookings/${bookingId}`),

  // Guide Reviews
  createReview: (data: any) => api.post('/women-safety/reviews', data),
  updateReview: (reviewId: string, data: any) =>
    api.put(`/women-safety/reviews/${reviewId}`, data),
  deleteReview: (reviewId: string) => api.delete(`/women-safety/reviews/${reviewId}`),
  markReviewHelpful: (reviewId: string) =>
    api.post(`/women-safety/reviews/${reviewId}/helpful`),

  // Safety Resources
  getResources: (params?: any) => {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.country) queryParams.append('country', params.country);
    if (params?.search) queryParams.append('search', params.search);
    return api.get(`/women-safety/resources?${queryParams.toString()}`);
  },
  getResourceById: (resourceId: string) => api.get(`/women-safety/resources/${resourceId}`),
  markResourceHelpful: (resourceId: string) =>
    api.post(`/women-safety/resources/${resourceId}/helpful`),

  // Safety Settings
  getSettings: () => api.get('/women-safety/settings'),
  updateSettings: (data: any) => api.put('/women-safety/settings', data),

  // Emergency Alerts
  triggerEmergencyAlert: (data: { location?: string; message?: string }) =>
    api.post('/women-safety/emergency-alert', data),
};

export default api;


