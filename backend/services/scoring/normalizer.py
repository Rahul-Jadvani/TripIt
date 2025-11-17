"""
Score Normalization Utilities
Converts raw scores to 0-100 range with proper weighting
"""

def normalize_score(value, min_val=0, max_val=100, target_max=100):
    """
    Normalize a value to 0-target_max range

    Args:
        value: Raw score value
        min_val: Minimum possible value
        max_val: Maximum possible value
        target_max: Target maximum (usually 100)

    Returns:
        Normalized score (0-target_max)
    """
    if value is None:
        return 0

    # Clamp value to min/max range
    value = max(min_val, min(value, max_val))

    # Normalize to 0-target_max
    if max_val == min_val:
        return 0

    normalized = ((value - min_val) / (max_val - min_val)) * target_max
    return round(normalized, 2)


def apply_weights(scores, weights):
    """
    Apply weights to score components and return total

    Args:
        scores: Dict of {component: score}
        weights: Dict of {component: weight (0-1)}

    Returns:
        Weighted total score
    """
    total = 0
    for component, weight in weights.items():
        score = scores.get(component, 0)
        total += score * weight

    return round(total, 2)


def combine_subscores(subscores, weights, max_score=100):
    """
    Combine multiple subscores with weights

    Args:
        subscores: Dict of {subscore_name: value}
        weights: Dict of {subscore_name: weight (sum to 1.0)}
        max_score: Maximum possible score

    Returns:
        Combined score
    """
    total = 0
    for name, weight in weights.items():
        subscore = subscores.get(name, 0)
        # Normalize subscore to 0-100 first
        normalized = normalize_score(subscore, 0, 100, 100)
        total += normalized * weight

    # Scale to max_score
    final = (total / 100) * max_score
    return round(final, 2)


def calculate_percentile(value, values_list):
    """
    Calculate percentile rank of a value in a list

    Args:
        value: The value to rank
        values_list: List of all values for comparison

    Returns:
        Percentile (0-100)
    """
    if not values_list:
        return 50  # Default to median if no data

    sorted_values = sorted(values_list)
    count_below = sum(1 for v in sorted_values if v < value)
    percentile = (count_below / len(sorted_values)) * 100

    return round(percentile, 2)


class ScoreNormalizer:
    """Helper class for score normalization with configurable ranges"""

    def __init__(self, target_max=100):
        self.target_max = target_max

    def normalize(self, value, expected_max=100):
        """Normalize value to target_max"""
        return normalize_score(value, 0, expected_max, self.target_max)

    def combine(self, scores, weights):
        """Combine scores with weights"""
        return combine_subscores(scores, weights, self.target_max)
