"""
Trending Tags Tracker - Tracks most-used activity tags over 24hr window
Refreshes every hour to identify trending tags
"""
from datetime import datetime, timedelta
from typing import List, Dict, Tuple
from collections import Counter
from extensions import db
from models.itinerary import Itinerary
import json

class TrendingTagsTracker:
    """Track and compute trending activity tags"""

    # In-memory cache for trending tags (refreshed hourly)
    _trending_tags_cache: List[Tuple[str, int]] = []
    _last_refresh: datetime = None
    _refresh_interval_minutes = 60  # Refresh every hour

    @classmethod
    def get_trending_tags(cls, limit: int = 10) -> List[Dict[str, any]]:
        """
        Get trending activity tags with counts
        Returns list of dicts: [{'tag': 'Trekking', 'count': 15, 'percentage': 25.5}, ...]
        """
        # Check if cache needs refresh
        now = datetime.utcnow()
        if (cls._last_refresh is None or
            (now - cls._last_refresh).total_seconds() > cls._refresh_interval_minutes * 60):
            cls._refresh_trending_tags()

        # Convert to dict format
        total = sum(count for _, count in cls._trending_tags_cache)
        result = []
        for tag, count in cls._trending_tags_cache[:limit]:
            percentage = (count / total * 100) if total > 0 else 0
            result.append({
                'tag': tag,
                'count': count,
                'percentage': round(percentage, 1)
            })

        return result

    @classmethod
    def _refresh_trending_tags(cls):
        """Refresh trending tags from database (24hr window)"""
        try:
            # Get itineraries from last 24 hours (or all if less than 50)
            cutoff_time = datetime.utcnow() - timedelta(hours=24)

            recent_itineraries = Itinerary.query.filter(
                Itinerary.is_published == True,
                Itinerary.created_at >= cutoff_time
            ).all()

            # If less than 20 recent itineraries, use all published itineraries
            if len(recent_itineraries) < 20:
                recent_itineraries = Itinerary.query.filter(
                    Itinerary.is_published == True
                ).order_by(Itinerary.created_at.desc()).limit(100).all()

            # Count all activity tags
            tag_counter = Counter()
            for itinerary in recent_itineraries:
                if itinerary.activity_tags:
                    for tag in itinerary.activity_tags:
                        if tag and isinstance(tag, str):
                            tag_counter[tag] += 1

            # Weight by engagement (views, votes, comments)
            for itinerary in recent_itineraries:
                if itinerary.activity_tags:
                    # Calculate engagement weight
                    engagement_score = (
                        (itinerary.view_count or 0) * 0.1 +
                        (itinerary.helpful_votes or 0) * 2 +
                        (itinerary.comment_count or 0) * 3
                    )
                    # Add bonus weight based on engagement
                    bonus = int(engagement_score / 100)  # 1 point per 100 engagement

                    for tag in itinerary.activity_tags:
                        if tag and isinstance(tag, str):
                            tag_counter[tag] += bonus

            # Store top tags
            cls._trending_tags_cache = tag_counter.most_common(20)
            cls._last_refresh = datetime.utcnow()

            print(f"[TRENDING TAGS] Refreshed at {cls._last_refresh.isoformat()}")
            print(f"[TRENDING TAGS] Top 5: {cls._trending_tags_cache[:5]}")

        except Exception as e:
            print(f"[TRENDING TAGS] Error refreshing: {e}")
            # Keep old cache on error

    @classmethod
    def get_leading_tag(cls) -> Dict[str, any]:
        """Get the single most trending tag with details"""
        trending = cls.get_trending_tags(limit=1)
        if trending:
            return trending[0]
        return {'tag': 'Photography', 'count': 0, 'percentage': 0}

    @classmethod
    def get_itineraries_with_trending_tags(cls, limit: int = 30) -> List[Itinerary]:
        """
        Get itineraries that contain the top trending tags
        Returns itineraries sorted by relevance to trending tags
        """
        trending_tags = cls.get_trending_tags(limit=5)
        if not trending_tags:
            # Fallback to top-rated if no trending tags
            return Itinerary.query.filter_by(is_published=True).order_by(
                Itinerary.proof_score.desc()
            ).limit(limit).all()

        # Get tag names
        top_tag_names = [t['tag'] for t in trending_tags]

        # Find itineraries with these tags
        all_itineraries = Itinerary.query.filter_by(is_published=True).all()

        # Score each itinerary by trending tag matches
        scored_itineraries = []
        for itin in all_itineraries:
            if not itin.activity_tags:
                continue

            # Count matching trending tags
            matches = sum(1 for tag in itin.activity_tags if tag in top_tag_names)
            if matches > 0:
                # Score = matches * 100 + engagement score
                engagement = (
                    (itin.view_count or 0) * 0.1 +
                    (itin.helpful_votes or 0) * 2 +
                    (itin.comment_count or 0) * 3 +
                    (itin.proof_score or 0)
                )
                score = matches * 100 + engagement
                scored_itineraries.append((itin, score))

        # Sort by score and return top N
        scored_itineraries.sort(key=lambda x: x[1], reverse=True)
        return [itin for itin, _ in scored_itineraries[:limit]]

    @classmethod
    def force_refresh(cls):
        """Force immediate refresh of trending tags"""
        cls._last_refresh = None
        cls._refresh_trending_tags()


# Initialize on module load
def init_trending_tags():
    """Initialize trending tags tracker"""
    try:
        TrendingTagsTracker.force_refresh()
    except Exception as e:
        print(f"[TRENDING TAGS] Failed to initialize: {e}")
