import axios from 'axios';

// Ensure API base always ends with /api
const getApiBase = () => {
  // Priority: Environment variable > URL detection > Fallback
  let baseUrl = import.meta.env.VITE_API_URL;
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
  const isDev = currentHost.includes('localhost') || currentHost.includes('127.0.0.1');

  if (!baseUrl) {
    if (isDev) {
      // Development: use localhost
      baseUrl = 'http://localhost:5000';
    } else {
      // Production: use Render backend (for Netlify and other production hosts)
      baseUrl = 'https://discovery-platform.onrender.com';
    }
  }

  console.log('🌐 API Base URL configured:', {
    currentHost: currentHost,
    isDevelopment: isDev,
    baseUrl: baseUrl,
    fromEnvVar: !!import.meta.env.VITE_API_URL,
    viteApiUrl: import.meta.env.VITE_API_URL || 'not set'
  });

  const finalUrl = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
  console.log('🌐 Final API Base URL:', finalUrl);
  return finalUrl;
};

const API_BASE = getApiBase();

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
  console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, config.data || {});
  return config;
});

// Handle responses and errors
api.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.status}`, response.data);
    return response;
  },
  async (error) => {
    const config = error.config;

    console.error(`[API Error] ${error.response?.status || 'Network'}:`, {
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
            console.log('[Auth] Token refreshed successfully');
            localStorage.setItem('token', newAccessToken);
            api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
            config.headers['Authorization'] = `Bearer ${newAccessToken}`;
            return api(config);
          }
        }
      } catch (refreshError) {
        console.error('[Auth] Token refresh failed:', refreshError);
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

// Projects
export const projectsService = {
  getAll: (sort: string = 'hot', page: number = 1) =>
    api.get(`/projects?sort=${sort}&page=${page}`),
  getById: (id: string) => api.get(`/projects/${id}`),
  create: (data: any) => api.post('/projects', data),
  update: (id: string, data: any) => api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  getByUser: (userId: string) => api.get(`/users/${userId}/projects`),
  getTaggedProjects: (userId: string) => api.get(`/users/${userId}/tagged-projects`),
};

// Voting
export const votesService = {
  vote: (projectId: string, voteType: 'up' | 'down') =>
    api.post('/votes', { project_id: projectId, vote_type: voteType }),
  getUserVotes: () => api.get('/votes/user'),
};

// Comments
export const commentsService = {
  getByProject: (projectId: string) => api.get(`/comments?project_id=${projectId}`),
  create: (data: any) => api.post('/comments', data),
  update: (commentId: string, data: any) => api.put(`/comments/${commentId}`, data),
  delete: (commentId: string) => api.delete(`/comments/${commentId}`),
  vote: (commentId: string, voteType: 'up' | 'down') =>
    api.post(`/comments/${commentId}/vote`, { vote_type: voteType }),
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

// Saved Projects
export const savedProjectsService = {
  saveProject: (projectId: string) => api.post(`/saved/save/${projectId}`),
  unsaveProject: (projectId: string) => api.delete(`/saved/unsave/${projectId}`),
  getMySavedProjects: (page: number = 1, perPage: number = 20) =>
    api.get(`/saved/my-saved?page=${page}&per_page=${perPage}`),
  checkIfSaved: (projectId: string) => api.get(`/saved/check/${projectId}`),
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

  // Projects
  getProjects: (params: { search?: string; perPage?: number } = {}) => {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.perPage) queryParams.append('per_page', params.perPage.toString());
    return api.get(`/admin/projects?${queryParams.toString()}`);
  },
  toggleProjectFeatured: (projectId: string) => api.post(`/admin/projects/${projectId}/feature`),
  deleteProject: (projectId: string) => api.delete(`/admin/projects/${projectId}`),

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
};

export default api;
