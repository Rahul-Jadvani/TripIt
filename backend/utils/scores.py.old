"""
Proof Score Calculation Utilities
"""
import math
from datetime import datetime


class ProofScoreCalculator:
    """Calculate proof scores for projects"""

    # Category 1: Basic Verification (Max 20 points)
    VERIFICATION_EMAIL = 5
    VERIFICATION_OXCERT = 10
    VERIFICATION_GITHUB = 5

    # Category 2: Community Signal (Max 30 points)
    COMMUNITY_MAX_UPVOTE_RATIO = 20
    COMMUNITY_COMMENT_MULTIPLIER = 0.5
    COMMUNITY_COMMENT_MAX = 10

    # Category 3: Expert Validation (Max 30 points)
    # Handled by badge awards (silver=10, gold=15, platinum=20)

    # Category 4: Project Quality (Max 20 points)
    QUALITY_DEMO_LINK = 5
    QUALITY_GITHUB_LINK = 5
    QUALITY_SCREENSHOTS = 5
    QUALITY_DESCRIPTION = 5

    @staticmethod
    def calculate_verification_score(user) -> int:
        """Calculate verification score from user attributes"""
        score = 0
        if user.email_verified:
            score += ProofScoreCalculator.VERIFICATION_EMAIL
        if user.has_oxcert:
            score += ProofScoreCalculator.VERIFICATION_OXCERT
        if user.github_connected:
            score += ProofScoreCalculator.VERIFICATION_GITHUB
        return min(score, 20)

    @staticmethod
    def calculate_community_score(project) -> int:
        """Calculate community signal score"""
        score = 0

        # Upvote ratio (max 20)
        total_votes = project.upvotes + project.downvotes
        if total_votes > 0:
            ratio = (project.upvotes / total_votes) * 100
            upvote_score = (ratio / 100) * ProofScoreCalculator.COMMUNITY_MAX_UPVOTE_RATIO
            score += min(upvote_score, ProofScoreCalculator.COMMUNITY_MAX_UPVOTE_RATIO)

        # Comment engagement (max 10)
        comment_score = project.comment_count * ProofScoreCalculator.COMMUNITY_COMMENT_MULTIPLIER
        score += min(comment_score, ProofScoreCalculator.COMMUNITY_COMMENT_MAX)

        return min(score, 30)

    @staticmethod
    def calculate_validation_score(project) -> int:
        """Calculate validation score from badges"""
        score = 0
        for badge in project.badges:
            score += badge.points
        return min(score, 30)

    @staticmethod
    def calculate_quality_score(project) -> int:
        """Calculate project quality score"""
        score = 0

        # Demo URL check
        if project.demo_url and project.demo_url.strip():
            score += ProofScoreCalculator.QUALITY_DEMO_LINK

        # GitHub URL check
        if project.github_url and project.github_url.strip():
            score += ProofScoreCalculator.QUALITY_GITHUB_LINK

        # Screenshots check - check if relationship has items
        try:
            if project.screenshots and project.screenshots.count() > 0:
                score += ProofScoreCalculator.QUALITY_SCREENSHOTS
        except:
            # Fallback if screenshots is a list
            if hasattr(project, 'screenshots') and len(project.screenshots) > 0:
                score += ProofScoreCalculator.QUALITY_SCREENSHOTS

        # Description length check
        if project.description and len(project.description.strip()) >= 200:
            score += ProofScoreCalculator.QUALITY_DESCRIPTION

        return min(score, 20)

    @staticmethod
    def calculate_total_score(user, project) -> int:
        """Calculate total proof score"""
        verification_score = ProofScoreCalculator.calculate_verification_score(user)
        community_score = ProofScoreCalculator.calculate_community_score(project)
        validation_score = ProofScoreCalculator.calculate_validation_score(project)
        quality_score = ProofScoreCalculator.calculate_quality_score(project)

        total = verification_score + community_score + validation_score + quality_score
        return min(total, 100)

    @staticmethod
    def calculate_trending_score(project) -> float:
        """
        Calculate trending/hot score using Reddit-style algorithm

        Formula combines:
        - Vote magnitude (log scale)
        - Time recency (newer projects ranked higher)
        - Proof score boost (quality multiplier)

        Returns: Float trending score for sorting
        """
        # Vote score (upvotes - downvotes)
        vote_score = project.upvotes - project.downvotes
        vote_magnitude = math.log10(max(abs(vote_score), 1))

        # Sign of votes (+1 or -1)
        sign = 1 if vote_score > 0 else -1 if vote_score < 0 else 0

        # Time decay (newer = higher score)
        # Using platform epoch as reference point
        epoch = datetime(2024, 1, 1)
        time_diff_seconds = (project.created_at - epoch).total_seconds()
        time_score = time_diff_seconds / 45000  # ~12.5 hour decay period

        # Proof score boost (0-1 multiplier based on quality)
        proof_boost = (project.proof_score / 100) * 0.5  # Max 50% boost from proof score

        # Combined trending score
        trending = (sign * vote_magnitude + time_score) * (1 + proof_boost)

        return round(trending, 2)

    @staticmethod
    def update_project_scores(project):
        """Update all score components for a project"""
        user = project.creator
        project.verification_score = ProofScoreCalculator.calculate_verification_score(user)
        project.community_score = ProofScoreCalculator.calculate_community_score(project)
        project.validation_score = ProofScoreCalculator.calculate_validation_score(project)
        project.quality_score = ProofScoreCalculator.calculate_quality_score(project)
        project.calculate_proof_score()

        # Update trending score
        if hasattr(project, 'trending_score'):
            project.trending_score = ProofScoreCalculator.calculate_trending_score(project)

        return project
