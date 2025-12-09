"""
Investor-Project Matching Service
Matches projects to investors based on their profile and preferences
"""
from typing import List, Dict, Tuple, Optional
from extensions import db
from models.project import Project
from models.investor_request import InvestorRequest
from sqlalchemy import and_, or_, cast, String, func
import json
from upstash_redis import Redis
from flask import current_app
from datetime import timedelta


class InvestorMatchingService:
    """Service for matching projects to investor profiles"""

    # Cache configuration: 24 hours TTL
    CACHE_TTL_SECONDS = 86400  # 24 hours
    CACHE_KEY_PREFIX = "investor_matches:"

    @staticmethod
    def get_redis_client() -> Optional[Redis]:
        """Get Upstash Redis client from Flask app context"""
        try:
            if not current_app:
                return None
            upstash_url = current_app.config.get('UPSTASH_REDIS_URL')
            upstash_token = current_app.config.get('UPSTASH_REDIS_TOKEN')
            return Redis(url=upstash_url, token=upstash_token)
        except Exception:
            return None

    @staticmethod
    def _get_cache_key(investor_id: str, min_score: float) -> str:
        """Generate cache key for investor matches"""
        return f"{InvestorMatchingService.CACHE_KEY_PREFIX}{investor_id}:min_score_{int(min_score)}"

    @staticmethod
    def _get_cached_matches(investor_id: str, min_score: float) -> Optional[List[Dict]]:
        """Retrieve cached matches from Redis"""
        try:
            redis_client = InvestorMatchingService.get_redis_client()
            if not redis_client:
                return None
            
            cache_key = InvestorMatchingService._get_cache_key(investor_id, min_score)
            cached_data = redis_client.get(cache_key)
            
            if cached_data:
                return json.loads(cached_data)
        except Exception as e:
            # Cache miss or Redis error - continue without cache
            print(f"[CACHE] Error retrieving cache: {e}")
        
        return None

    @staticmethod
    def _cache_matches(investor_id: str, min_score: float, matches: List[Dict]) -> bool:
        """Cache matches in Redis with long TTL"""
        try:
            redis_client = InvestorMatchingService.get_redis_client()
            if not redis_client:
                return False
            
            cache_key = InvestorMatchingService._get_cache_key(investor_id, min_score)
            cached_data = json.dumps(matches)
            
            # Set with 24-hour TTL (86400 seconds)
            redis_client.setex(
                cache_key,
                InvestorMatchingService.CACHE_TTL_SECONDS,
                cached_data
            )
            print(f"[CACHE] Cached {len(matches)} matches for investor {investor_id} (TTL: 24h)")
            return True
        except Exception as e:
            print(f"[CACHE] Error caching matches: {e}")
        
        return False

    @staticmethod
    def invalidate_cache(investor_id: str) -> bool:
        """Clear cache for specific investor across all min_score values"""
        try:
            redis_client = InvestorMatchingService.get_redis_client()
            if not redis_client:
                return False
            
            # Delete all cache keys for this investor
            pattern = f"{InvestorMatchingService.CACHE_KEY_PREFIX}{investor_id}:*"
            keys = redis_client.keys(pattern)
            if keys:
                redis_client.delete(*keys)
                print(f"[CACHE] Invalidated {len(keys)} cache entries for investor {investor_id}")
            return True
        except Exception as e:
            print(f"[CACHE] Error invalidating cache: {e}")
        
        return False

    @staticmethod
    def calculate_match_score(project: Project, investor_profile: InvestorRequest) -> Tuple[float, Dict]:
        """
        Calculate how well a project matches an investor's criteria
        
        Scoring factors:
        - Industry Match: 0-60 pts (primary gate)
        - Proof Score: 0-15 pts (project quality)
        - Verification/Community/Validation/Quality: 0-10 pts (derived scores)
        - Links & Metadata: 0-10 pts (demo, github, badges, featured)
        - Engagement/Traction: 0-15 pts (upvotes, comments, views)
        - Stage/Location Hints: 0-5 pts (keywords in description/tags)
        
        Returns:
            Tuple of (score, breakdown_dict)
            - score: 0-100 representing match quality
            - breakdown: Dict explaining the score components
        """
        score = 0.0
        breakdown = {}

        # 1. Industry/Category Match (60 points max - primary match factor, lowered to allow other factors)
        industry_match_score = 0
        industry_reasons = []
        
        if investor_profile.industries:
            project_categories = project.categories or []
            investor_industries = [ind.lower() for ind in investor_profile.industries]
            project_categories_lower = [cat.lower() for cat in project_categories]
            
            # Exact matches
            exact_matches = set(investor_industries) & set(project_categories_lower)
            if exact_matches:
                industry_match_score = 60  # Full credit for exact match
                industry_reasons = list(exact_matches)
            else:
                # Partial matches (substring matching)
                partial_matches = []
                for inv_ind in investor_industries:
                    for proj_cat in project_categories_lower:
                        if (inv_ind in proj_cat or proj_cat in inv_ind):
                            partial_matches.append(inv_ind)
                            break
                
                if partial_matches:
                    industry_match_score = 30  # Partial credit
                    industry_reasons = partial_matches
        
        breakdown['industry_match'] = {
            'score': industry_match_score,
            'reasons': industry_reasons
        }
        score += industry_match_score

        # 2. Proof Score Quality (0-15 pts)
        proof_score_points = 0
        proof_score = project.proof_score or 0
        if proof_score >= 80:
            proof_score_points = 15
        elif proof_score >= 70:
            proof_score_points = 12
        elif proof_score >= 60:
            proof_score_points = 9
        elif proof_score >= 50:
            proof_score_points = 6
        elif proof_score >= 40:
            proof_score_points = 3
        
        breakdown['proof_score'] = {
            'score': proof_score_points,
            'value': proof_score
        }
        score += proof_score_points

        # 3. Component Scores (0-10 pts total - verification, community, validation, quality)
        component_score = 0
        component_breakdown = {}
        
        verification = project.verification_score or 0
        community = project.community_score or 0
        validation = project.validation_score or 0
        quality = project.quality_score or 0
        
        # Average the components and scale to 10 pts
        avg_component = (verification + community + validation + quality) / 4 if (verification + community + validation + quality) > 0 else 0
        component_score = int((avg_component / 100) * 10) if avg_component > 0 else 0
        component_score = min(component_score, 10)  # Cap at 10
        
        component_breakdown = {
            'verification': verification,
            'community': community,
            'validation': validation,
            'quality': quality,
            'average': round(avg_component, 1)
        }
        
        breakdown['components'] = {
            'score': component_score,
            'breakdown': component_breakdown
        }
        score += component_score

        # 4. Links, Metadata, and Badges (0-10 pts)
        metadata_score = 0
        metadata_reasons = []
        
        if project.demo_url:
            metadata_score += 3
            metadata_reasons.append('demo_url')
        
        if project.github_url:
            metadata_score += 3
            metadata_reasons.append('github_url')
        
        # Handle badges - it's a dynamic relationship so we need to count() it
        try:
            if project.badges:
                badge_count = project.badges.count() if hasattr(project.badges, 'count') else len(project.badges)
                if badge_count >= 1:
                    metadata_score += 2
                    metadata_reasons.append(f'badges ({badge_count})')
        except Exception as e:
            # If badge counting fails, just skip it
            pass
        
        if project.is_featured:
            metadata_score += 2
            metadata_reasons.append('featured')
        
        metadata_score = min(metadata_score, 10)  # Cap at 10
        
        breakdown['metadata'] = {
            'score': metadata_score,
            'reasons': metadata_reasons
        }
        score += metadata_score

        # 5. Engagement & Traction (0-15 pts)
        engagement_score = 0
        
        upvotes = project.upvotes or 0
        comments = project.comment_count or 0
        views = project.view_count or 0
        
        # Upvotes: 0-5 pts (scale: 0-50 upvotes = 0-5 pts)
        upvote_points = min(int((upvotes / 50) * 5), 5)
        
        # Comments: 0-5 pts (scale: 0-25 comments = 0-5 pts)
        comment_points = min(int((comments / 25) * 5), 5)
        
        # Views: 0-5 pts (scale: 0-500 views = 0-5 pts)
        view_points = min(int((views / 500) * 5), 5)
        
        engagement_score = upvote_points + comment_points + view_points
        engagement_score = min(engagement_score, 15)  # Cap at 15
        
        breakdown['engagement'] = {
            'score': engagement_score,
            'upvotes': upvotes,
            'comments': comments,
            'views': views,
            'upvote_points': upvote_points,
            'comment_points': comment_points,
            'view_points': view_points
        }
        score += engagement_score

        # 6. Stage & Location Hints (0-5 pts)
        # Parse keywords from description and tags for seed/series/geographic indicators
        stage_location_score = 0
        stage_location_reasons = []
        
        try:
            description_lower = (project.description or '').lower()
            
            # Handle hackathons - could be list of strings or dicts
            tags_str = ''
            if project.hackathons:
                if isinstance(project.hackathons, list):
                    # Filter to only string items, convert dicts to their string representation
                    hackathon_items = []
                    for item in project.hackathons:
                        if isinstance(item, str):
                            hackathon_items.append(item)
                        elif isinstance(item, dict) and 'name' in item:
                            hackathon_items.append(item['name'])
                    tags_str = ' '.join(hackathon_items).lower() if hackathon_items else ''
            
            combined_text = (description_lower + ' ' + tags_str).lower()
            
            # Check for common stage keywords
            stage_keywords = {
                'seed': ['seed round', 'seed stage', 'pre-seed', 'seed funding'],
                'series': ['series a', 'series b', 'series c', 'funding round'],
                'pre-launch': ['pre-launch', 'beta', 'mvp'],
                'launched': ['launched', 'production', 'live']
            }
            
            for stage, keywords in stage_keywords.items():
                if any(kw in combined_text for kw in keywords):
                    stage_location_score += 2
                    stage_location_reasons.append(stage)
                    break  # Only count one stage
            
            # Check for geographic indicators
            geographic_keywords = {
                'us': ['us', 'united states', 'usa', 'america', 'american'],
                'eu': ['europe', 'european', 'eu'],
                'asia': ['asia', 'asian', 'china', 'india', 'singapore'],
                'international': ['global', 'worldwide', 'international']
            }
            
            for region, keywords in geographic_keywords.items():
                if any(kw in combined_text for kw in keywords):
                    stage_location_score += 2
                    stage_location_reasons.append(region)
                    break  # Only count one region
        except Exception:
            # If stage/location parsing fails, just skip it
            pass
        
        stage_location_score = min(stage_location_score, 5)  # Cap at 5
        
        breakdown['stage_location'] = {
            'score': stage_location_score,
            'hints': stage_location_reasons
        }
        score += stage_location_score

        # Cap total score at 100
        final_score = min(score, 100)
        
        # Add overall reason
        breakdown['total'] = round(final_score, 2)
        
        return (final_score, breakdown)

    @staticmethod
    def get_matched_projects(
        investor_profile: InvestorRequest,
        limit: int = 20,
        min_score: float = 30.0,
        include_score: bool = False,
        user_id: str = None
    ) -> List[Dict]:
        """
        Get projects that match investor criteria, scored and sorted.
        Results are cached with 24-hour TTL.

        Args:
            investor_profile: Investor's profile with preferences
            limit: Maximum number of projects to return
            min_score: Minimum match score (0-100)
            include_score: Whether to include match_score in response (for dashboard)
            user_id: User ID for adding user_vote data

        Returns:
            List of project dicts (without match scores unless include_score=True)
        """
        # Check cache first (only cache when include_score=True for dashboard)
        if include_score and investor_profile.id:
            cached_matches = InvestorMatchingService._get_cached_matches(
                investor_profile.id,
                min_score
            )
            if cached_matches:
                print(f"[CACHE] Using cached matches for investor {investor_profile.id}")
                return cached_matches[:limit]

        from sqlalchemy.orm import joinedload
        
        # Build base query with eager loading to avoid N+1 queries
        query = Project.query.options(
            joinedload(Project.creator)
        ).filter(
            Project.is_deleted == False
        )

        # Filter by industries if specified
        if investor_profile.industries:
            industry_conditions = []
            for industry in investor_profile.industries:
                # Match exact or partial (e.g., "AI/ML" or "AI")
                # For JSON columns, cast to string to search
                try:
                    industry_conditions.append(
                        cast(Project.categories, String).ilike(f'%{industry}%')
                    )
                except Exception:
                    # If JSON filtering fails, we'll filter in Python
                    pass
            
            if industry_conditions:
                query = query.filter(or_(*industry_conditions))

        # Get all matching projects (pre-filtered)
        try:
            projects = query.all()
        except Exception:
            # Fallback: get all projects and filter in Python
            projects = Project.query.filter(Project.is_deleted == False).all()

        # Calculate match scores for all projects
        scored_projects = []
        for project in projects:
            score, breakdown = InvestorMatchingService.calculate_match_score(
                project, investor_profile
            )

            if score >= min_score:
                project_dict = project.to_dict(include_creator=True, user_id=user_id)

                # Only include score/breakdown if explicitly requested (dashboard)
                if include_score:
                    project_dict['match_score'] = round(score, 2)
                    project_dict['match_breakdown'] = breakdown
                else:
                    # Store score internally for sorting but don't expose to frontend
                    project_dict['_internal_score'] = score

                scored_projects.append(project_dict)

        # Sort by match score (highest first)
        if include_score:
            scored_projects.sort(key=lambda x: x['match_score'], reverse=True)
        else:
            scored_projects.sort(key=lambda x: x.get('_internal_score', 0), reverse=True)
            # Remove internal score before returning
            for p in scored_projects:
                p.pop('_internal_score', None)

        # Cache results before limiting
        if include_score and investor_profile.id and scored_projects:
            InvestorMatchingService._cache_matches(
                investor_profile.id,
                min_score,
                scored_projects
            )

        return scored_projects[:limit]
