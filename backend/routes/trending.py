"""
Trending Tags and Destinations API
"""
from flask import Blueprint, jsonify
from utils.trending_tags import TrendingTagsTracker

trending_bp = Blueprint('trending', __name__)

@trending_bp.route('/trending/tags', methods=['GET'])
def get_trending_tags():
    """Get trending activity tags with counts"""
    try:
        tags = TrendingTagsTracker.get_trending_tags(limit=10)
        return jsonify({
            'success': True,
            'data': tags,
            'last_updated': TrendingTagsTracker._last_refresh.isoformat() if TrendingTagsTracker._last_refresh else None
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@trending_bp.route('/trending/leading-tag', methods=['GET'])
def get_leading_tag():
    """Get the single most trending tag"""
    try:
        tag = TrendingTagsTracker.get_leading_tag()
        return jsonify({
            'success': True,
            'data': tag
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@trending_bp.route('/trending/itineraries', methods=['GET'])
def get_trending_itineraries():
    """Get itineraries with trending tags"""
    try:
        itineraries = TrendingTagsTracker.get_itineraries_with_trending_tags(limit=30)

        # Convert to dict
        result = []
        for itin in itineraries:
            result.append(itin.to_dict(include_creator=True))

        return jsonify({
            'success': True,
            'data': result,
            'count': len(result)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@trending_bp.route('/trending/refresh', methods=['POST'])
def force_refresh_trending():
    """Force refresh trending tags (admin only)"""
    try:
        TrendingTagsTracker.force_refresh()
        return jsonify({
            'success': True,
            'message': 'Trending tags refreshed successfully'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
