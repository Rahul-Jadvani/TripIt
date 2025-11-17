"""
Main Scoring Engine
Orchestrates GitHub analysis, LLM analysis, and community scoring
"""
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
        self.github_analyzer = GitHubAnalyzer(access_token=github_token)
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
            # IMPORTANT: Check badges FIRST before running LLM analysis
            validator_badges = self._get_validator_badges(project)
            has_badges = len(validator_badges) > 0

            if has_badges:
                # HYBRID MODE: Human (0-20) + AI (0-10)
                human_score = self._calculate_validator_score(validator_badges)  # 0-20

                # Run LLM analysis
                validation_result = self._analyze_with_llm(project)
                ai_validation_score = validation_result.get('score', 0)

                # Normalize AI score to 0-10 range
                ai_score_normalized = normalize_score(ai_validation_score, 0, 100, 10)

                # Combine scores
                validation_score = human_score + ai_score_normalized
                validation_result['human_validator_score'] = human_score
                validation_result['ai_score_normalized'] = ai_score_normalized
                validation_result['mode'] = 'hybrid'
                validation_result['badges'] = validator_badges
            else:
                # AI ONLY MODE: AI (0-30)
                validation_result = self._analyze_with_llm(project)
                # _analyze_with_llm already returns normalized 0-30 score
                validation_score = validation_result.get('score', 0)
                validation_result['mode'] = 'ai_only'

            # 4. COMMUNITY SCORE (existing logic)
            community_score = self._calculate_community_score(project)

            # 5. CALCULATE FINAL SCORE
            # Component scores are already weighted to their max ranges:
            # - quality_score: 0-20
            # - verification_score: 0-20
            # - validation_score: 0-30
            # - community_score: 0-30
            # Total max: 100
            # Simply sum them (no additional weighting needed)
            scores = {
                'quality_score': quality_score,
                'verification_score': verification_score,
                'validation_score': validation_score,
                'community_score': community_score
            }

            # Calculate total score by summing weighted components
            proof_score = quality_score + verification_score + validation_score + community_score
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
                    'comments': project.comment_count
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
        Analyze GitHub team experience

        Returns:
            Dict with score and details
        """
        if not project.github_url:
            return {'score': 0, 'details': {'error': 'No GitHub URL provided'}}

        try:
            # Get team members from project
            team_members = project.team_members or []

            result = self.github_analyzer.analyze_team(
                team_members,
                self.github_analyzer._extract_owner_repo(project.github_url)
            )

            # Extract score from team analysis
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
            Dict with score and details
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

            # Extract score (already 0-100)
            score = result.get('score', 0)

            # Normalize to 0-30 range (max validation_score weight)
            normalized_score = normalize_score(score, 0, 100, 30)

            # Remove raw score from result to avoid overwriting normalized score
            result_without_score = {k: v for k, v in result.items() if k != 'score'}

            return {
                'score': normalized_score,
                **result_without_score
            }

        except Exception as e:
            return {
                'score': 0,
                'error': str(e),
                'reasoning': f'LLM analysis failed: {str(e)}'
            }

    def _calculate_community_score(self, project):
        """
        Calculate community engagement score

        Returns:
            Score (0-30)
        """
        # Upvote ratio (max 20 points)
        total_votes = project.upvotes + project.downvotes
        if total_votes > 0:
            upvote_ratio = project.upvotes / total_votes
            upvote_score = upvote_ratio * 20
        else:
            upvote_score = 0

        # Comment engagement (max 10 points)
        comment_score = min(project.comment_count * 0.5, 10)

        # Total community score (max 30)
        community_score = upvote_score + comment_score

        return round(min(community_score, 30), 2)

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
