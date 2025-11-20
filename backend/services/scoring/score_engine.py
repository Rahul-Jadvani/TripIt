"""
Main Scoring Engine
Orchestrates GitHub analysis, LLM analysis, and community scoring
"""
import os

from .github_analyzer import GitHubAnalyzer
from .llm_analyzer import LLMAnalyzer
from .normalizer import normalize_score, combine_subscores
from .config_manager import config_manager


class ScoringEngine:
    """Main scoring orchestrator"""

    def __init__(self, github_token=None, openai_api_key=None):
        """
        Initialize scoring engine

        Args:
            github_token: GitHub access token
            openai_api_key: OpenAI API key
        """
        self.github_token = github_token or os.getenv('GITHUB_ACCESS_TOKEN')
        # Always use a service-level token for GraphQL (fallback to same token if none configured)
        self.graphql_service_token = os.getenv('GITHUB_GRAPHQL_TOKEN') or os.getenv('GITHUB_ACCESS_TOKEN') or self.github_token
        self.github_analyzer = GitHubAnalyzer(access_token=self.github_token, graphql_token=self.graphql_service_token)
        self.llm_analyzer = LLMAnalyzer(api_key=openai_api_key)
        self.config = config_manager

    def score_project(self, project):
        """
        Score a project using all analysis components

        Args:
            project: Project model instance

        Returns:
            Dict with scores and detailed breakdown
        """
        try:
            # Get configuration weights
            weights = self.config.get_scoring_weights()

            # 1. CODE QUALITY ANALYSIS (GitHub repo analysis)
            quality_result = self._analyze_code_quality(project)
            quality_score = quality_result.get('score', 0)

            # 2. GITHUB TEAM ANALYSIS
            verification_result = self._analyze_github_team(project)
            verification_score = verification_result.get('score', 0)

            # 3. LLM COMPREHENSIVE ANALYSIS + HUMAN VALIDATOR BADGES
            # HYBRID SCORING: Different normalization based on badge presence
            validator_badges = self._get_validator_badges(project)
            has_badges = len(validator_badges) > 0

            # Run AI analysis ONCE (returns raw 0-100 score)
            validation_result = self._analyze_with_llm(project)

            if has_badges:
                # HYBRID MODE: Human (0-20) + AI re-normalized (0-10) = 30
                # Get human validator score
                human_score = self._calculate_validator_score(validator_badges)  # 0-20

                # Get RAW AI score (0-100) from the analysis
                # Note: _analyze_with_llm returns already normalized to 30, so we need to get raw score
                ai_raw_score = validation_result.get('raw_score', 0)  # 0-100 raw

                # Re-normalize AI score to 0-10 range (not re-analyze, just re-normalize)
                ai_score_normalized = normalize_score(ai_raw_score, 0, 100, 10)

                # Total validation score
                validation_score = human_score + ai_score_normalized

                validation_result['human_score'] = human_score
                validation_result['ai_score_normalized'] = ai_score_normalized
                validation_result['ai_raw_score'] = ai_raw_score
                validation_result['mode'] = 'hybrid'
                validation_result['badges'] = validator_badges
            else:
                # AI ONLY MODE: AI (0-30)
                # Use the already normalized score
                validation_score = validation_result.get('score', 0)  # Already 0-30
                validation_result['mode'] = 'ai_only'

            # 4. COMMUNITY SCORE (relative scoring)
            community_result = self._calculate_community_score(project)
            community_score = community_result.get('score', 0)

            # 5. ON-CHAIN SCORE PLACEHOLDER (reserved for future implementation)
            onchain_score = 0.0

            # 6. CALCULATE FINAL SCORE
            # Component scores are already weighted to their max ranges:
            # - quality_score: 0-20
            # - verification_score: 0-20
            # - validation_score: 0-30
            # - community_score: 0-10
            # - onchain_score: 0-20 (coming soon)
            # Total max: 100
            # Simply sum them (no additional weighting needed)
            scores = {
                'quality_score': quality_score,
                'verification_score': verification_score,
                'validation_score': validation_score,
                'community_score': community_score,
                'onchain_score': onchain_score
            }

            # Calculate total score by summing weighted components
            proof_score = (
                quality_score +
                verification_score +
                validation_score +
                community_score +
                onchain_score
            )
            proof_score = min(round(proof_score, 2), 100)

            # 6. BUILD DETAILED BREAKDOWN
            # Remove 'score' from details to prevent overwriting normalized scores
            quality_details = {k: v for k, v in quality_result.get('details', {}).items() if k != 'score'}
            verification_details = {k: v for k, v in verification_result.get('details', {}).items() if k != 'score'}

            breakdown = {
                'quality': {
                    'score': quality_score,
                    **quality_details
                },
                'verification': {
                    'score': verification_score,
                    **verification_details
                },
                'validation': {
                    'score': validation_score,
                    'mode': validation_result.get('mode', 'ai_only'),
                    'human_score': validation_result.get('human_score', 0),
                    'ai_score_normalized': validation_result.get('ai_score_normalized', 0),
                    'ai_raw_score': validation_result.get('ai_raw_score', validation_result.get('raw_score', 0)),
                    'badges': validation_result.get('badges', []),
                    'competitive': validation_result.get('competitive', {}),
                    'market_fit': validation_result.get('market_fit', {}),
                    'success_criteria': validation_result.get('success_criteria', {}),
                    'evaluation': validation_result.get('evaluation', {}),
                    'reasoning': validation_result.get('reasoning', '')
                },
                'community': {
                    'score': community_score,
                    'upvotes': project.upvotes,
                    'downvotes': project.downvotes,
                    'comments': project.comment_count,
                    'upvote_score': community_result.get('upvote_score', 0),
                    'comment_score': community_result.get('comment_score', 0),
                    'max_upvotes': community_result.get('max_upvotes', 0),
                    'max_comments': community_result.get('max_comments', 0),
                    'calculation': (
                        f"({project.upvotes}/{community_result.get('max_upvotes', 0)})x6 + ({project.comment_count}/{community_result.get('max_comments', 0)})x4"
                    )
                },
                'onchain': {
                    'score': onchain_score,
                    'status': 'coming_soon',
                    'description': 'Reserved for future on-chain verification score.'
                },
                'weights_used': weights,
                'version': '2.0'
            }

            return {
                'success': True,
                'proof_score': proof_score,
                'quality_score': quality_score,
                'verification_score': verification_score,
                'validation_score': validation_score,
                'community_score': community_score,
                'onchain_score': onchain_score,
                'breakdown': breakdown
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'proof_score': 0,
                'quality_score': 0,
                'verification_score': 0,
                'validation_score': 0,
                'community_score': 0,
                'onchain_score': 0,
                'breakdown': {'error': str(e)}
            }

    def _analyze_code_quality(self, project):
        """
        Analyze code quality via GitHub API

        Returns:
            Dict with score and details
        """
        if not project.github_url:
            return {'score': 0, 'details': {'error': 'No GitHub URL provided'}}

        try:
            result = self.github_analyzer.analyze_repo(
                self.github_analyzer._extract_owner_repo(project.github_url)
            )

            # Extract score from repo analysis
            score = result.get('score', 0)

            # Normalize to 0-20 range (max quality_score weight)
            normalized_score = normalize_score(score, 0, 100, 20)

            return {
                'score': normalized_score,
                'details': result.get('details', {}),
                'stars': result.get('stars', 0),
                'forks': result.get('forks', 0)
            }

        except Exception as e:
            return {'score': 0, 'details': {'error': str(e)}}

    def _analyze_github_team(self, project):
        """
        Analyze project author's GitHub profile (repository owner)

        Returns:
            Dict with score and details
        """
        if not project.github_url:
            return {'score': 0, 'details': {'error': 'No GitHub URL provided'}}

        try:
            # Extract owner/repo from GitHub URL
            owner_repo = self.github_analyzer._extract_owner_repo(project.github_url)
            if not owner_repo:
                return {'score': 0, 'details': {'error': 'Invalid GitHub URL'}}

            # Get the repository owner (author)
            owner_username = owner_repo.split('/')[0]

            # Analyze the repository owner's profile
            result = self.github_analyzer.analyze_author(owner_username)

            # Extract score from author analysis
            score = result.get('score', 0)

            # Normalize to 0-20 range (max verification_score weight)
            normalized_score = normalize_score(score, 0, 100, 20)

            return {
                'score': normalized_score,
                'details': result
            }

        except Exception as e:
            return {'score': 0, 'details': {'error': str(e)}}

    def _analyze_with_llm(self, project):
        """
        Analyze project with LLM

        Returns:
            Dict with score (normalized to 30), raw_score (0-100), and details
        """
        try:
            # Prepare project data for LLM
            project_data = {
                'description': project.description or '',
                'market_comparison': project.market_comparison or '',
                'novelty_factor': project.novelty_factor or '',
                'tech_stack': project.tech_stack or [],
                'categories': project.categories or [],
                'project_story': project.project_story or '',
                'inspiration': project.inspiration or ''
            }

            result = self.llm_analyzer.analyze(project_data)

            # Extract raw score (0-100)
            raw_score = result.get('score', 0)

            # Normalize to 0-30 range (max validation_score weight for ai-only mode)
            normalized_score = normalize_score(raw_score, 0, 100, 30)

            # Remove raw score from result to avoid overwriting
            result_without_score = {k: v for k, v in result.items() if k != 'score'}

            return {
                'score': normalized_score,      # Normalized 0-30 (for ai-only mode)
                'raw_score': raw_score,          # Raw 0-100 (for hybrid mode re-normalization)
                **result_without_score
            }

        except Exception as e:
            return {
                'score': 0,
                'raw_score': 0,
                'error': str(e),
                'reasoning': f'LLM analysis failed: {str(e)}'
            }

    def _calculate_community_score(self, project):
        """
        Calculate community engagement score using relative scoring

        New Formula:
        - Upvote Score: (project_upvotes / max_upvotes_in_any_project) * 6
        - Comment Score: (project_comments / max_comments_in_any_project) * 4
        - Total: max 10 points

        Returns:
            Dict with score and details
        """
        try:
            # Import here to avoid circular imports
            from models.project import Project
            from extensions import db

            # Get max upvotes and max comments across all projects
            max_stats = db.session.query(
                db.func.max(Project.upvotes).label('max_upvotes'),
                db.func.max(Project.comment_count).label('max_comments')
            ).filter(
                Project.is_deleted == False
            ).first()

            max_upvotes = max_stats.max_upvotes or 0
            max_comments = max_stats.max_comments or 0

            max_upvote_points = 6
            max_comment_points = 4

            # Calculate upvote score (max 6 points)
            if max_upvotes > 0:
                upvote_score = (project.upvotes / max_upvotes) * max_upvote_points
            else:
                upvote_score = 0

            # Calculate comment score (max 4 points)
            if max_comments > 0:
                comment_score = (project.comment_count / max_comments) * max_comment_points
            else:
                comment_score = 0

            # Total community score (max 10)
            community_score = upvote_score + comment_score

            return {
                'score': round(min(community_score, 10), 2),
                'upvote_score': round(upvote_score, 2),
                'comment_score': round(comment_score, 2),
                'max_upvotes': max_upvotes,
                'max_comments': max_comments
            }

        except Exception as e:
            # Fallback to 0 if query fails
            print(f"Error calculating community score: {e}")
            return {
                'score': 0.0,
                'upvote_score': 0.0,
                'comment_score': 0.0,
                'max_upvotes': 0,
                'max_comments': 0,
                'error': str(e)
            }

    def _get_validator_badges(self, project):
        """
        Get all validator badges for a project

        Returns:
            List of badge dicts with type, points, awarded_by info
        """
        try:
            # Import Badge model here to avoid circular imports
            from models.badge import ValidationBadge

            badges = ValidationBadge.query.filter_by(project_id=project.id).all()

            badge_list = []
            for badge in badges:
                badge_list.append({
                    'type': badge.badge_type,
                    'name': badge.custom_badge_name or badge.badge_type,
                    'points': badge.points or 0,
                    'awarded_by': badge.validator_id,
                    'awarded_at': badge.created_at.isoformat() if badge.created_at else None
                })

            return badge_list
        except Exception as e:
            print(f"Error fetching badges: {e}")
            return []

    def _calculate_validator_score(self, badges):
        """
        Calculate human validator score from badges

        Badge scoring (from ValidationBadge model):
        - Stone: 5 points
        - Silver: 10 points
        - Gold: 15 points
        - Platinum: 20 points
        - Demerit: -10 points
        - Custom: Use badge.points value

        Maximum: 20 points (can combine multiple badges)

        Returns:
            Score (0-20)
        """
        if not badges:
            return 0

        # Define default badge point values (matching ValidationBadge.BADGE_POINTS)
        BADGE_POINTS = {
            'stone': 5,
            'silver': 10,
            'gold': 15,
            'platinum': 20,
            'demerit': -10
        }

        total_points = 0

        for badge in badges:
            badge_type = badge.get('type', '').lower()
            custom_points = badge.get('points', 0)

            # Use custom points if provided, otherwise use default
            if custom_points > 0:
                total_points += custom_points
            elif badge_type in BADGE_POINTS:
                total_points += BADGE_POINTS[badge_type]

        # Cap at 20 points maximum
        return round(min(total_points, 20), 2)


def score_project_sync(project, github_token=None, openai_api_key=None):
    """
    Synchronous helper function to score a project

    Args:
        project: Project model instance
        github_token: Optional GitHub token (uses project user's token if not provided)
        openai_api_key: Optional OpenAI key (uses config if not provided)

    Returns:
        Dict with scoring results
    """
    # Use user's GitHub token if available
    if not github_token and hasattr(project, 'user') and project.user:
        github_token = project.user.github_access_token

    engine = ScoringEngine(github_token=github_token, openai_api_key=openai_api_key)
    return engine.score_project(project)
