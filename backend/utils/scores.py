"""
DEPRECATED - Legacy Scoring System (Archived)

This file is a compatibility shim for the old manual scoring system.
The new AI-powered scoring system is now used (see services/scoring/).

All ProofScoreCalculator methods are now no-ops since scoring is handled
asynchronously via Celery tasks (see tasks/scoring_tasks.py).
"""
import warnings


class ProofScoreCalculator:
    """
    Legacy proof score calculator - DEPRECATED

    This class is kept for compatibility with existing code.
    All scoring is now handled by the AI-powered async system.
    """

    @staticmethod
    def update_project_scores(project):
        """
        DEPRECATED - No longer performs any action

        Scoring is now handled asynchronously via Celery tasks.
        When a project is created, score_project_task.delay() is called.
        """
        warnings.warn(
            "ProofScoreCalculator.update_project_scores() is deprecated. "
            "Scoring is now handled asynchronously via Celery tasks.",
            DeprecationWarning,
            stacklevel=2
        )
        # No-op - scoring is now async via Celery
        pass

    @staticmethod
    def calculate_quality_score(project):
        """DEPRECATED - Returns 0"""
        return 0

    @staticmethod
    def calculate_verification_score(project):
        """DEPRECATED - Returns 0"""
        return 0

    @staticmethod
    def calculate_validation_score(project):
        """DEPRECATED - Returns 0"""
        return 0

    @staticmethod
    def calculate_community_score(project):
        """DEPRECATED - Returns 0"""
        return 0

    @staticmethod
    def calculate_proof_score(quality_score, verification_score, validation_score, community_score):
        """DEPRECATED - Returns 0"""
        return 0


# For backwards compatibility
def calculate_proof_score(*args, **kwargs):
    """DEPRECATED - Use async scoring system instead"""
    warnings.warn(
        "calculate_proof_score() is deprecated. Use the async scoring system.",
        DeprecationWarning,
        stacklevel=2
    )
    return 0
