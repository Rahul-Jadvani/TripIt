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
  // Blockchain Identity Fields (TripIt SBT)
  profile_hash?: string; // SHA-256 hash of profile for SBT
  wallet_bound_at?: string; // When wallet was bound (ISO date)
  sbt_id?: string; // Soul-Bound Token ID
  sbt_status?: string; // not_issued, issued, verified, suspended, revoked
  sbt_verified_date?: string; // When SBT was verified (ISO date)
  sbt_blockchain_hash?: string; // Transaction hash of SBT minting
  reputation_score?: number; // 0-100 reputation score
  trip_token_balance?: number; // TRIP token balance
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
  onchain_score?: number; // Backend field
  onchainScore?: number;
  badges: Badge[];
  // AI Scoring fields
  scoring_status?: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying'; // Backend field
  scoringStatus?: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
  score_breakdown?: any; // Backend field - detailed AI scoring breakdown
  scoreBreakdown?: any;
  scoring_retry_count?: number; // Backend field
  scoringRetryCount?: number;
  last_scored_at?: string; // Backend field
  lastScoredAt?: string;
  scoring_error?: string; // Backend field - error message if scoring failed
  scoringError?: string;
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
  onchain: number;
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

// ============================================================================
// TRIPIT MODELS (New Travel-Focused Types)
// ============================================================================

export interface Traveler extends User {
  sbt_id?: string;
  sbt_verified?: boolean;
  destinations_visited?: number;
  total_trips_count?: number;
  total_km_traveled?: number;
  traveler_reputation_score?: number;
  certifications?: string[];
  women_guide_certified?: boolean;
}

export interface SafetyRating {
  id: string;
  itinerary_id: string;
  traveler_sbt_id: string;
  overall_safety_score: number; // 1-5
  rating_type: 'overall' | 'accommodation' | 'route' | 'community' | 'women_safety';
  detailed_feedback?: string;
  accommodation_safety?: number;
  route_safety?: number;
  community_safety?: number;
  women_safety_score?: number;
  photo_ipfs_hashes?: string[];
  helpful_count?: number;
  unhelpful_count?: number;
  verified_traveler?: boolean;
  experience_date?: string;
  created_at: string;
  updated_at: string;
}

export interface TravelIntel {
  id: string;
  itinerary_id: string;
  intel_type: 'question' | 'update' | 'warning' | 'recommendation' | 'local_insight';
  title?: string;
  content: string;
  location_gps?: string;
  severity_level?: 'low' | 'medium' | 'high' | 'critical';
  safety_related?: boolean;
  status?: 'open' | 'in_progress' | 'resolved' | 'archived';
  traveler_sbt_id?: string;
  responder_sbt_id?: string;
  response_status?: string;
  photo_ipfs_hashes?: string[];
  helpful_count?: number;
  parent_intel_id?: string; // For threaded Q&A
  replies?: TravelIntel[];
  created_at: string;
  updated_at: string;
  traveler?: Traveler;
  is_deleted?: boolean;
  deleted_at?: string;
}

export interface TravelCredibilityScore {
  total: number;
  identity_score: number;
  travel_history_score: number;
  community_score: number;
  safety_score_component: number;
  quality_score: number;
}

export interface Itinerary {
  id: string;
  uuid?: string;
  title: string;
  tagline?: string;
  description: string;
  // Travel Details
  destination: string;
  regions?: string[];
  country?: string;
  state_province?: string;
  start_date: string;
  end_date: string;
  duration_days?: number;
  difficulty_level?: 'easy' | 'moderate' | 'difficult' | 'expert';
  travel_type?: string; // Solo, Group, Family, etc.
  // Budget
  estimated_budget_min?: number;
  estimated_budget_max?: number;
  actual_budget_spent?: number;
  budget_amount?: number;
  budget_currency?: string;
  // Route & GPS
  route_gpx?: string;
  route_waypoints?: Array<{ lat: number; lon: number; name?: string; elevation?: number }>;
  starting_point_gps?: string;
  ending_point_gps?: string;
  route_map_url?: string;
  // Travel Experience
  travel_style?: string;
  activity_tags?: string[];
  travel_companions?: Array<{ name: string; role?: string }>;
  screenshots?: string[];
  // Safety & Verification
  women_safe_certified?: boolean;
  safety_score?: number;
  safety_ratings_count?: number;
  safety_ratings_avg?: number;
  // Credibility Scoring
  proof_score?: number;
  travel_credibility_score?: number;
  identity_score?: number;
  travel_history_score?: number;
  community_score?: number;
  safety_score_component?: number;
  quality_score?: number;
  score_explanations?: {
    [key: string]: {
      score: number;
      max: number;
      percentage: number;
      summary: string;
      details: string[];
    };
  };
  // Engagement Metrics
  safety_ratings?: SafetyRating[];
  travel_intel?: TravelIntel[];
  helpful_count?: number;
  share_count?: number;
  view_count?: number;
  upvotes?: number;
  downvotes?: number;
  comment_count?: number;
  user_vote?: 'up' | 'down' | null;
  userVote?: 'up' | 'down' | null;
  // Status
  is_published?: boolean;
  is_featured?: boolean;
  is_deleted?: boolean;
  // Relations
  traveler_id?: string;
  created_by_traveler_id?: string;
  user_id?: string;
  creator?: Traveler;
  author?: Traveler;
  // Timestamps
  created_at: string;
  updated_at: string;
  featured_at?: string;
  last_verified_date?: string;
}

export interface SavedItinerary {
  id: string;
  traveler_id: string;
  itinerary_id: string;
  itinerary?: Itinerary;
  saved_at: string;
}

export interface ItineraryUpdate {
  id: string;
  itinerary_id: string;
  content: string;
  photo_urls?: string[];
  created_at: string;
  updated_at: string;
}

// Type alias for backward compatibility with frontend code using "Project"
export type ProjectOrItinerary = Project | Itinerary;

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

export interface CommunityFilters {
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

// ============================================================================
// PHASE 3: TRAVEL GROUPS
// ============================================================================

export interface TravelGroup {
  id: string;
  uuid: string;
  name: string;
  description?: string;
  destination: string;
  start_date: string; // ISO date
  end_date: string; // ISO date
  group_type?: 'interest_based' | 'safety_focused' | 'women_only' | 'location_based';
  max_members: number;
  current_members_count: number;
  activity_tags: string[]; // ['trekking', 'photography', 'food', etc.]
  is_women_only: boolean;
  group_chat_room_id?: string;
  live_location_sharing_enabled: boolean;
  emergency_alert_enabled: boolean;
  is_active: boolean;
  is_featured: boolean;
  created_by_traveler_id: string;
  creator?: Traveler;
  members?: TravelGroupMember[];
  itineraries?: Itinerary[];
  created_at: string;
  updated_at: string;
}

export interface TravelGroupMember {
  id: string;
  group_id: string;
  traveler_id: string;
  role: 'member' | 'organizer' | 'moderator' | 'guest';
  join_status: 'pending' | 'accepted' | 'rejected' | 'left' | 'blocked';
  joined_date: string;
  traveler_reputation_at_join: number;
  traveler_safety_score_at_join: number;
  has_shared_location: boolean;
  notifications_enabled: boolean;
  is_active: boolean;
  traveler?: Traveler;
}

export interface TravelGroupFilters {
  search?: string;
  destination?: string;
  group_type?: string;
  activity?: string[];
  women_safe?: boolean;
  has_availability?: boolean;
  sort?: 'newest' | 'popular' | 'starting_soon';
}

// ============================================================================
// PHASE 5: WOMEN SAFETY
// ============================================================================

export interface WomenGuide {
  id: string;
  traveler_id: string;
  is_verified: boolean;
  verification_level?: 'bronze' | 'silver' | 'gold' | 'platinum';
  years_of_experience: number;
  languages_spoken: string[];
  specializations: string[]; // ['women_safety', 'budget_travel', 'adventure', etc.]
  favorite_destinations: string[];
  average_rating: number;
  total_reviews: number;
  women_travelers_guided: number;
  successful_trips_count: number;
  hourly_rate_usd?: number;
  availability_status: 'available' | 'unavailable' | 'on_leave';
  service_locations: string[]; // Cities/regions where guide operates
  max_group_size: number;
  offers_accommodation: boolean;
  offers_meals: boolean;
  emergency_response_training: boolean;
  first_aid_certified: boolean;
  background_check_completed: boolean;
  is_active: boolean;
  is_featured: boolean;
  traveler?: Traveler;
  reviews?: GuideReview[];
}

export interface GuideBooking {
  id: string;
  guide_id: string;
  traveler_id: string;
  destination: string;
  start_date: string; // ISO date
  end_date: string; // ISO date
  group_size: number;
  activity_type?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  total_cost_usd?: number;
  payment_status: 'pending' | 'paid' | 'refunded';
  special_requirements?: string;
  emergency_contacts_shared: boolean;
  insurance_provided: boolean;
  created_at: string;
  confirmation_date?: string;
  guide?: WomenGuide;
  traveler?: Traveler;
}

export interface GuideReview {
  id: string;
  guide_id: string;
  traveler_id: string;
  booking_id?: string;
  rating: number; // 1-5
  review_title?: string;
  review_text: string;
  safety_rating?: number;
  knowledge_rating?: number;
  communication_rating?: number;
  professionalism_rating?: number;
  value_for_money_rating?: number;
  verified_traveler: boolean;
  tour_type?: string;
  helpful_count: number;
  created_at: string;
  traveler?: Partial<Traveler>;
}

export interface WomenSafetyResource {
  id: string;
  title: string;
  description?: string;
  content: string;
  category: 'tips' | 'emergency' | 'legal' | 'health' | 'packing' | 'cultural' | 'navigation';
  target_region?: string;
  target_countries: string[];
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
  is_featured: boolean;
  is_pinned: boolean;
  external_links: Array<{
    title: string;
    url: string;
    source?: string;
  }>;
  helpline_numbers: Array<{
    country: string;
    service: string;
    number: string;
  }>;
  view_count: number;
  helpful_count: number;
  language: string;
  created_at: string;
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

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export enum DifficultyLevel {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  EXPERT = 'expert',
}

export enum TravelType {
  SOLO = 'solo',
  GROUP = 'group',
  FAMILY = 'family',
  ADVENTURE = 'adventure',
}

export enum SafetyRatingType {
  OVERALL = 'overall',
  ACCOMMODATION = 'accommodation',
  ROUTE = 'route',
  COMMUNITY = 'community',
  WOMEN_SAFETY = 'women_safety',
}

export enum TravelIntelType {
  QUESTION = 'question',
  UPDATE = 'update',
  WARNING = 'warning',
  RECOMMENDATION = 'recommendation',
  LOCAL_INSIGHT = 'local_insight',
}

export enum GroupType {
  INTEREST_BASED = 'interest_based',
  SAFETY_FOCUSED = 'safety_focused',
  WOMEN_ONLY = 'women_only',
  LOCATION_BASED = 'location_based',
}

export interface PaginatedResponse<T> {
  data: T;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
