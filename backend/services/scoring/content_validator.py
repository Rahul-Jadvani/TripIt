"""
Content Quality Validator
Validates project content before LLM analysis to catch low-quality submissions
"""
import re
from typing import Dict, List, Tuple


class ContentValidator:
    """Validates project content quality for investor-grade scoring"""

    # Minimum content lengths (characters)
    MIN_DESCRIPTION_LENGTH = 100
    MIN_MARKET_COMPARISON_LENGTH = 50
    MIN_NOVELTY_LENGTH = 50

    # Repetition detection
    MAX_WORD_REPETITION_RATIO = 0.3  # Max 30% repeated words
    MIN_UNIQUE_WORDS = 20  # Minimum unique words required

    # Placeholder detection
    PLACEHOLDER_PATTERNS = [
        r'\btest+\b',
        r'\bplaceholder\b',
        r'\btodo\b',
        r'\bTBD\b',
        r'\bcoming soon\b',
        r'\bexample\b',
        r'\bdemo\b',
        r'\bsample\b',
        r'\blorem ipsum\b',
    ]

    @classmethod
    def validate_project_content(cls, project_data: Dict) -> Tuple[bool, List[str], int]:
        """
        Validate project content quality

        Args:
            project_data: Dict with project fields

        Returns:
            Tuple of (is_valid, error_messages, penalty_score)
            - is_valid: False if content is completely invalid
            - error_messages: List of validation issues
            - penalty_score: 0-50 points to deduct from LLM score
        """
        errors = []
        penalty = 0

        description = project_data.get('description', '')
        market_comparison = project_data.get('market_comparison', '')
        novelty_factor = project_data.get('novelty_factor', '')
        tech_stack = project_data.get('tech_stack', [])
        categories = project_data.get('categories', [])

        # 1. Check minimum lengths
        if len(description) < cls.MIN_DESCRIPTION_LENGTH:
            errors.append(f"Description too short ({len(description)} chars, min {cls.MIN_DESCRIPTION_LENGTH})")
            penalty += 20

        if len(market_comparison) < cls.MIN_MARKET_COMPARISON_LENGTH:
            errors.append(f"Market comparison insufficient ({len(market_comparison)} chars)")
            penalty += 15

        if len(novelty_factor) < cls.MIN_NOVELTY_LENGTH:
            errors.append(f"Novelty explanation insufficient ({len(novelty_factor)} chars)")
            penalty += 15

        # 2. Check for repetitive content
        if description:
            rep_ratio, unique_count = cls._check_repetition(description)
            if rep_ratio > cls.MAX_WORD_REPETITION_RATIO:
                errors.append(f"Description contains repetitive text ({int(rep_ratio*100)}% repeated)")
                penalty += 25
            if unique_count < cls.MIN_UNIQUE_WORDS:
                errors.append(f"Description lacks variety ({unique_count} unique words)")
                penalty += 20

        # 3. Check for placeholder text
        placeholder_count = 0
        for field_name, content in [
            ('description', description),
            ('market_comparison', market_comparison),
            ('novelty_factor', novelty_factor)
        ]:
            if cls._contains_placeholders(content):
                errors.append(f"{field_name.title()} contains placeholder/test text")
                placeholder_count += 1
                penalty += 15

        # 4. Check tech stack
        if not tech_stack or len(tech_stack) == 0:
            errors.append("No tech stack provided")
            penalty += 10

        # 5. Check categories
        if not categories or len(categories) == 0:
            errors.append("No categories provided")
            penalty += 10

        # 6. Check if content is mostly empty
        total_content = len(description) + len(market_comparison) + len(novelty_factor)
        if total_content < 200:
            errors.append("Overall content is minimal (investor due diligence requires substantial information)")
            penalty += 30

        # Cap penalty at 50 (half the max score)
        penalty = min(penalty, 50)

        # Consider content completely invalid if penalty is too high
        is_valid = penalty < 50 and placeholder_count < 2

        return is_valid, errors, penalty

    @classmethod
    def _check_repetition(cls, text: str) -> Tuple[float, int]:
        """
        Check for repetitive text patterns

        Returns:
            Tuple of (repetition_ratio, unique_word_count)
        """
        if not text:
            return 0.0, 0

        # Normalize text
        words = re.findall(r'\w+', text.lower())
        if not words:
            return 0.0, 0

        total_words = len(words)
        unique_words = len(set(words))

        # Calculate repetition ratio
        repetition_ratio = 1.0 - (unique_words / total_words) if total_words > 0 else 0.0

        return repetition_ratio, unique_words

    @classmethod
    def _contains_placeholders(cls, text: str) -> bool:
        """Check if text contains placeholder patterns"""
        if not text:
            return False

        text_lower = text.lower()

        # Check for placeholder patterns
        for pattern in cls.PLACEHOLDER_PATTERNS:
            if re.search(pattern, text_lower, re.IGNORECASE):
                # Additional check: if "test" appears more than 5 times, it's likely placeholder
                if pattern == r'\btest+\b':
                    test_count = len(re.findall(pattern, text_lower, re.IGNORECASE))
                    if test_count > 5:
                        return True
                else:
                    return True

        return False

    @classmethod
    def get_validation_report(cls, project_data: Dict) -> Dict:
        """
        Get detailed validation report

        Returns:
            Dict with validation results, errors, and recommendations
        """
        is_valid, errors, penalty = cls.validate_project_content(project_data)

        # Generate quality score (0-100)
        quality_score = max(0, 100 - penalty * 2)  # Penalty translates to quality

        return {
            'is_valid': is_valid,
            'quality_score': quality_score,
            'errors': errors,
            'penalty_points': penalty,
            'recommendations': cls._generate_recommendations(errors)
        }

    @classmethod
    def _generate_recommendations(cls, errors: List[str]) -> List[str]:
        """Generate actionable recommendations based on errors"""
        recommendations = []

        for error in errors:
            if 'too short' in error.lower() or 'insufficient' in error.lower():
                recommendations.append("Provide more detailed, substantive information about your project")
            elif 'repetitive' in error.lower():
                recommendations.append("Remove repetitive content and provide unique, meaningful descriptions")
            elif 'placeholder' in error.lower() or 'test' in error.lower():
                recommendations.append("Replace placeholder/test text with actual project information")
            elif 'tech stack' in error.lower():
                recommendations.append("List the technologies and frameworks used in your project")
            elif 'categories' in error.lower():
                recommendations.append("Select relevant categories that describe your project")

        # Add general recommendation if multiple issues
        if len(errors) >= 3:
            recommendations.append("Consider providing comprehensive project information suitable for investor review")

        return list(set(recommendations))  # Remove duplicates
