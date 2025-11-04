export interface User {
  id: string;
  username: string;
  email?: string;
  displayName?: string;
  display_name?: string; // Backend field
  avatar?: string;
  avatar_url?: string; // Backend field
  bio?: string;
  isVerified?: boolean;
  email_verified?: boolean; // Backend field
  isAdmin?: boolean;
  is_admin?: boolean; // Backend field
  is_investor?: boolean; // Backend field
  is_validator?: boolean; // Backend field
  walletAddress?: string;
  wallet_address?: string; // Backend field (truncated)
  full_wallet_address?: string; // Full wallet address for explorer links
  hasOxcert?: boolean;
  has_oxcert?: boolean; // Backend field
  oxcert_tx_hash?: string;
  oxcert_token_id?: string;
  oxcert_metadata?: {
    name?: string;
    description?: string;
    image?: string;
    attributes?: Array<{
      trait_type: string;
      value: string | number;
    }>;
  };
  github_username?: string;
  github_connected?: boolean;
  karma?: number;
  createdAt?: string;
  created_at?: string; // Backend field
  updatedAt?: string;
  updated_at?: string; // Backend field
}

export interface TeamMember {
  name: string;
  role?: string;
  avatar?: string;
  avatar_url?: string;
  image?: string;
}

export interface Project {
  id: string;
  title: string;
  tagline: string;
  description: string;
  // Extended project information
  project_story?: string; // Backend field - Project journey
  inspiration?: string; // Backend field - What inspired the project
  pitch_deck_url?: string; // Backend field - Link to pitch deck
  market_comparison?: string; // Backend field - Market landscape
  novelty_factor?: string; // Backend field - What makes it unique
  categories?: string[]; // Backend field - Project categories
  // URLs
  demoUrl?: string;
  demo_url?: string; // Backend field
  githubUrl?: string;
  github_url?: string; // Backend field
  // Hackathon info
  hackathonName: string;
  hackathon_name?: string; // Backend field
  hackathonDate: string;
  hackathon_date?: string; // Backend field
  // Arrays
  techStack: string[];
  tech_stack?: string[]; // Backend field
  teamMembers?: TeamMember[];
  team_members?: TeamMember[]; // Backend field
  screenshots: string[];
  // Relations
  authorId: string;
  user_id?: string; // Backend field
  author: User;
  creator?: User; // Backend field
  // Scores and badges
  proofScore: ProofScore;
  proof_score?: ProofScore; // Backend field
  badges: Badge[];
  // Engagement metrics
  voteCount: number;
  vote_count?: number; // Backend field
  commentCount: number;
  comment_count?: number; // Backend field
  viewCount?: number;
  view_count?: number; // Backend field
  shareCount?: number;
  share_count?: number; // Backend field
  // Votes
  userVote?: 'up' | 'down' | null;
  user_vote?: 'up' | 'down' | null; // Backend field
  // Status flags
  isFeatured: boolean;
  is_featured?: boolean; // Backend field
  isDeleted?: boolean;
  is_deleted?: boolean; // Backend field
  // Chains
  chains?: Array<{
    id: string;
    name: string;
    slug: string;
    logo_url?: string;
    is_pinned: boolean;
    added_at: string;
  }>;
  chain_count?: number;
  // Timestamps
  createdAt: string;
  created_at?: string; // Backend field
  updatedAt: string;
  updated_at?: string; // Backend field
  featured_at?: string; // Backend field
}

export interface ProofScore {
  total: number;
  verification: number;
  community: number;
  validation: number;
  quality: number;
}

export interface Badge {
  id: string;
  type: 'silver' | 'gold' | 'platinum';
  name: string;
  description: string;
  awardedBy: User;
  awardedAt: string;
}

export interface Comment {
  id: string;
  content: string;
  author: User;
  projectId: string;
  parentId?: string;
  replies?: Comment[];
  voteCount: number;
  userVote?: number;
  createdAt: string;
  updatedAt: string;
}

export interface IntroRequest {
  id: string;
  fromUser: User;
  toUser: User;
  project: Project;
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  updatedAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  user?: User;
  project?: Project;
  score: number;
}

export type SortType = 'hot' | 'new' | 'top';
export type TimeFilter = 'week' | 'month' | 'all';

// ============================================================================
// CHAINS FEATURE
// ============================================================================

export interface Chain {
  id: string;
  name: string;
  slug: string;
  description: string;
  banner_url?: string;
  logo_url?: string;
  categories: string[];
  rules?: string;
  social_links?: {
    twitter?: string;
    website?: string;
    discord?: string;
  };
  is_public: boolean;
  requires_approval: boolean;
  project_count: number;
  follower_count: number;
  view_count: number;
  is_featured: boolean;
  is_active: boolean;
  is_following?: boolean;
  is_owner?: boolean;
  creator_id: string;
  creator?: User;
  created_at: string;
  updated_at: string;
}

export interface ChainProject {
  id: string;
  chain_id: string;
  project_id: string;
  added_by_id: string;
  order_index: number;
  is_pinned: boolean;
  added_at: string;
  project?: Project;
  chain?: Chain;
  added_by?: User;
}

export interface ChainProjectRequest {
  id: string;
  chain_id: string;
  project_id: string;
  requester_id: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by_id?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  project?: Project;
  chain?: Chain;
  requester?: User;
  reviewed_by?: User;
}

export interface ChainFollower {
  id: string;
  chain_id: string;
  user_id: string;
  followed_at: string;
  user?: User;
  chain?: Chain;
}

export interface ChainStats {
  total_views: number;
  total_upvotes: number;
  avg_proof_score: number;
}

export interface ChainFilters {
  page?: number;
  limit?: number;
  sort?: 'trending' | 'newest' | 'most_projects' | 'most_followers' | 'alphabetical';
  search?: string;
  category?: string;
  visibility?: 'all' | 'public' | 'private';
  featured?: boolean;
  creator_id?: string;
}

// ============================================================================
// CHAIN POSTS (Forum Feature)
// ============================================================================

export interface ChainPost {
  id: string;
  chain_id: string;
  author_id: string;
  parent_id?: string;
  title?: string;
  content: string;
  image_urls: string[];
  upvote_count: number;
  downvote_count: number;
  comment_count: number;
  total_replies: number;
  is_pinned: boolean;
  is_locked: boolean;
  is_deleted: boolean;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
  author?: User;
  chain?: Chain;
  user_reaction?: 'upvote' | 'downvote' | null;
  is_author?: boolean;
  replies?: ChainPost[];
}

export interface ChainPostReaction {
  id: string;
  post_id: string;
  user_id: string;
  reaction_type: 'upvote' | 'downvote';
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface ChainPostFilters {
  page?: number;
  per_page?: number;
  sort?: 'hot' | 'new' | 'top' | 'active' | 'pinned';
}

export interface Notification {
  id: string;
  user_id: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  project_id?: string;
  chain_id?: string;
  actor_id?: string;
  redirect_url?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  actor?: User;
  project?: {
    id: string;
    title: string;
    tagline?: string;
  };
  chain?: {
    id: string;
    name: string;
    slug: string;
    logo_url?: string;
  };
}

export type NotificationType =
  | 'chain_new_project'
  | 'chain_request_approved'
  | 'chain_request_rejected'
  | 'project_added_to_chain'
  | 'project_removed_from_chain'
  | 'chain_follower'
  | 'chain_featured'
  | 'chain_project_request'
  | 'vote'
  | 'comment'
  | 'badge'
  | 'intro_request';

export interface PaginatedResponse<T> {
  data: T;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
