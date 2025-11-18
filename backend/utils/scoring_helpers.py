"""
Scoring Helper Functions
Fast math-based score recalculation without re-running AI analysis
"""
from models.badge import ValidationBadge


def recalculate_validation_score_with_badge(project):
    """
    Recalculate validation score when badge is awarded
    Uses EXISTING AI analysis - just re-normalizes, no API calls

    Args:
        project: Project model instance

    Returns:
        dict: Updated scoring data
    """
    try:
        # Get existing AI validation score (0-30 range)
        existing_breakdown = project.score_breakdown or {}
        existing_validation = existing_breakdown.get('validation', {})
        existing_ai_score = existing_validation.get('score', 0)  # 0-30

        # Get badges for this project
        badges = ValidationBadge.query.filter_by(project_id=project.id).all()

        if not badges:
            # No badge - return existing score (shouldn't happen)
            return {
                'validation_score': existing_ai_score,
                'breakdown': existing_breakdown
            }

        # Calculate badge points (0-20 max)
        BADGE_POINTS = {
            'stone': 5,
            'silver': 10,
            'gold': 15,
            'platinum': 20,
            'demerit': -10
        }

        badge_points = 0
        badge_list = []
        for badge in badges:
            points = badge.points or BADGE_POINTS.get(badge.badge_type.lower(), 0)
            badge_points += points
            badge_list.append({
                'type': badge.badge_type,
                'name': badge.custom_badge_name or badge.badge_type,
                'points': points,
                'awarded_by': badge.validator_id,
                'awarded_at': badge.created_at.isoformat() if badge.created_at else None
            })

        # Cap badge points at 20
        badge_points = min(badge_points, 20)

        # Re-normalize existing AI score from 0-30 to 0-10
        # This makes room for badge points (0-20) while keeping total at 0-30
        ai_score_normalized = (existing_ai_score / 30) * 10

        # Calculate new validation score (badge 0-20 + AI 0-10 = 0-30)
        new_validation_score = badge_points + ai_score_normalized
        new_validation_score = min(round(new_validation_score, 2), 30)

        # Update breakdown with hybrid mode data
        updated_validation = {
            **existing_validation,  # Keep all existing AI analysis (competitive, market_fit, etc.)
            'score': new_validation_score,
            'mode': 'hybrid',
            'human_validator_score': badge_points,
            'ai_score_normalized': round(ai_score_normalized, 2),
            'badges': badge_list
        }

        # Update full breakdown
        updated_breakdown = {
            **existing_breakdown,
            'validation': updated_validation
        }

        # Recalculate total proof score
        quality_score = existing_breakdown.get('quality', {}).get('score', 0)
        verification_score = existing_breakdown.get('verification', {}).get('score', 0)
        community_score = existing_breakdown.get('community', {}).get('score', 0)

        proof_score = quality_score + verification_score + new_validation_score + community_score
        proof_score = min(round(proof_score, 2), 100)

        return {
            'success': True,
            'proof_score': proof_score,
            'validation_score': new_validation_score,
            'breakdown': updated_breakdown
        }

    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }
