# ZER0 AI SCORING - CONTINUATION GUIDE

**Last Session Ended:** Phase 1 Complete (5/24 tasks)
**Resume From:** Phase 2 - Core Services Implementation

---

## ✅ WHAT'S BEEN COMPLETED

1. ✅ All database migrations applied and verified
2. ✅ All Python dependencies installed (openai, PyGithub, celery, tenacity)
3. ✅ config.py updated with OpenAI + Celery configuration
4. ✅ celery_app.py created
5. ✅ Folder structure created (services/scoring/, tasks/)

---

## 🚀 QUICK RESUME (Copy-Paste These Commands)

### **Continue Implementation - Run These in Order:**

```bash
# Navigate to backend
cd "C:\Users\JARVIS\Desktop\0x.Discovery-ship\backend"

# Verify Phase 1 complete
python -c "import os; assert os.path.exists('celery_app.py'); assert os.path.exists('services/scoring/__init__.py'); assert os.path.exists('tasks/__init__.py'); print('Phase 1 verified ✅')"

# Now create remaining files below...
```

---

## 📝 PHASE 2-6: REMAINING FILES TO CREATE

### **IMPORTANT:** Copy each code block below into the specified file path.

---

### **FILE 1:** `backend/services/scoring/normalizer.py`

```python
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
```

---

### **FILE 2:** `backend/services/scoring/config_manager.py`

```python
"""
Scoring Configuration Manager
Loads admin-configurable weights and settings from database
"""
from extensions import db
from models.admin_scoring_config import AdminScoringConfig

class ScoringConfigManager:
    """Manages scoring configuration from database"""

    def __init__(self):
        self._cache = {}

    def get_config(self, config_key, default=None):
        """
        Get configuration value by key

        Args:
            config_key: Configuration key (e.g. 'scoring_weights')
            default: Default value if not found

        Returns:
            Configuration value (dict)
        """
        # Check cache first
        if config_key in self._cache:
            return self._cache[config_key]

        # Query database
        config = AdminScoringConfig.query.filter_by(config_key=config_key).first()

        if not config:
            return default

        # Cache and return
        self._cache[config_key] = config.config_value
        return config.config_value

    def get_scoring_weights(self):
        """Get main scoring weights"""
        return self.get_config('scoring_weights', {
            'quality_score': 20,
            'verification_score': 20,
            'validation_score': 30,
            'community_score': 30
        })

    def get_llm_weights(self):
        """Get LLM sub-weights"""
        return self.get_config('llm_weights', {
            'competitive': 0.25,
            'market_fit': 0.25,
            'success_criteria': 0.25,
            'evaluation': 0.25
        })

    def get_github_weights(self):
        """Get GitHub analysis weights"""
        return self.get_config('github_weights', {
            'repo_quality': 0.5,
            'team_quality': 0.5
        })

    def get_code_quality_weights(self):
        """Get code quality sub-weights"""
        return self.get_config('code_quality_weights', {
            'repo_structure': 0.3,
            'readme_quality': 0.3,
            'file_organization': 0.2,
            'code_patterns': 0.2
        })

    def get_scoring_config(self):
        """Get general scoring configuration"""
        return self.get_config('scoring_config', {
            'llm_model': 'gpt-4o-mini',
            'max_retries': 10,
            'retry_backoff_seconds': 300,
            'rate_limit_hours': 1,
            'github_cache_days': 7,
            'enable_scoring': True
        })

    def clear_cache(self):
        """Clear configuration cache"""
        self._cache = {}

    def refresh(self):
        """Refresh all configurations from database"""
        self.clear_cache()
        # Pre-load common configs
        self.get_scoring_weights()
        self.get_llm_weights()
        self.get_github_weights()
        self.get_scoring_config()


# Global instance
config_manager = ScoringConfigManager()
```

---

**THIS IS TOO LARGE - CONTINUING IN PART 2...**

---

## 🎯 NEXT IMMEDIATE ACTIONS

1. **Continue creating files from the plan document**
2. **Reference:** `ZER0_AI_SCORING_IMPLEMENTATION_PLAN.md` for full details
3. **Files to create next:**
   - github_analyzer.py (GitHub API analysis)
   - llm_analyzer.py (OpenAI GPT-4o-mini)
   - score_engine.py (main orchestrator)
4. **Then proceed to Phase 3** (models) and Phase 4 (routes)

---

**Resume Command:**
```bash
# Ask Claude to:
"Continue implementing the ZER0 AI Scoring System from Phase 2.
Reference: ZER0_AI_SCORING_IMPLEMENTATION_PLAN.md and IMPLEMENTATION_PROGRESS.md"
```
