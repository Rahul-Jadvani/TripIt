"""
Scoring Configuration Manager
Loads admin-configurable weights and settings from database
"""
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
        config_value = AdminScoringConfig.get_config(config_key, default)

        # Cache and return
        if config_value:
            self._cache[config_key] = config_value

        return config_value or default

    def get_scoring_weights(self):
        """Get main scoring weights"""
        defaults = {
            'quality_score': 20,
            'verification_score': 20,
            'validation_score': 30,
            'community_score': 10,
            'onchain_score': 20
        }
        weights = self.get_config('scoring_weights', defaults.copy()) or {}
        # Ensure newly added keys exist even for legacy configs
        for key, value in defaults.items():
            weights.setdefault(key, value)
        return weights

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
