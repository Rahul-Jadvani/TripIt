"""
LLM-based Project Analysis
Uses OpenAI GPT-4o-mini to analyze competitive position, market fit, success criteria, and evaluation
INVESTOR-GRADE SCORING: Conservative, rigorous evaluation suitable for investment decisions
"""
import json
from openai import OpenAI
from flask import current_app
from .content_validator import ContentValidator


class LLMAnalyzer:
    """Analyzes projects using OpenAI LLM with investor-grade rigor"""

    def __init__(self, api_key=None, model='gpt-4o-mini'):
        """
        Initialize LLM analyzer

        Args:
            api_key: OpenAI API key
            model: Model to use (default: gpt-4o-mini)
        """
        self.api_key = api_key or current_app.config.get('OPENAI_API_KEY')
        self.model = model or current_app.config.get('OPENAI_MODEL', 'gpt-4o-mini')
        self.client = OpenAI(api_key=self.api_key) if self.api_key else None
        self.validator = ContentValidator()

    def analyze(self, project_data):
        """
        Perform comprehensive LLM analysis with content validation

        Args:
            project_data: Dict with project information
                - description: Project description
                - market_comparison: Competitive landscape
                - novelty_factor: Innovation claims
                - tech_stack: Technologies used
                - categories: Project categories

        Returns:
            Dict with competitive, market_fit, success_criteria, evaluation scores and reasoning
        """
        if not self.client:
            return self._error_result("OpenAI API key not configured")

        try:
            # STEP 1: Validate content quality (INVESTOR-GRADE)
            is_valid, errors, penalty = self.validator.validate_project_content(project_data)

            # If content is completely invalid, return low score with error
            if not is_valid:
                return {
                    'score': 0,
                    'competitive': {'score': 0, 'error': 'Content validation failed'},
                    'market_fit': {'score': 0, 'error': 'Content validation failed'},
                    'success_criteria': {'score': 0, 'error': 'Content validation failed'},
                    'evaluation': {'score': 0, 'error': 'Content validation failed'},
                    'reasoning': f"Content quality insufficient for investor evaluation. Issues: {'; '.join(errors[:3])}",
                    'validation_errors': errors,
                    'content_penalty': penalty
                }

            # STEP 2: Run LLM analyses with strict criteria
            competitive = self.competitive_analysis(project_data)
            market_fit = self.market_fit_analysis(project_data)
            success = self.success_criteria_analysis(project_data)
            evaluation = self.evaluation_analysis(project_data)

            # STEP 3: Combine scores with weights (25% each)
            raw_score = (
                competitive.get('score', 0) * 0.25 +
                market_fit.get('score', 0) * 0.25 +
                success.get('score', 0) * 0.25 +
                evaluation.get('score', 0) * 0.25
            )

            # STEP 4: Apply content quality penalty
            final_score = max(0, raw_score - penalty)

            return {
                'score': round(final_score, 2),
                'competitive': competitive,
                'market_fit': market_fit,
                'success_criteria': success,
                'evaluation': evaluation,
                'reasoning': self._generate_summary(competitive, market_fit, success, evaluation, errors, penalty),
                'validation_warnings': errors if errors else None,
                'content_penalty': penalty if penalty > 0 else None
            }

        except Exception as e:
            return self._error_result(str(e))

    def competitive_analysis(self, project_data):
        """
        Analyze competitive landscape and market positioning with INVESTOR-GRADE RIGOR

        Returns:
            Dict with score (0-100) and reasoning
        """
        prompt = f"""You are a venture capital analyst evaluating this startup for investment. Be CONSERVATIVE and RIGOROUS.

PROJECT DATA:
Description: {project_data.get('description', 'N/A')}
Market Comparison: {project_data.get('market_comparison', 'N/A')}
Novelty Factor: {project_data.get('novelty_factor', 'N/A')}
Categories: {', '.join(project_data.get('categories', []))}

SCORING RUBRIC (0-100):
0-25: RED OCEAN - Highly saturated market, weak differentiation, no moat, high commoditization risk
      Example: "Another task management app", "Generic social network"

26-50: CROWDED MARKET - Some differentiation, limited moat, moderate competition
       Example: "Task manager with AI features", "Niche social network for students"

51-75: DIFFERENTIATED - Strong differentiation, building moat, manageable competition
       Example: "AI-powered workflow automation with unique algorithm", "Industry-specific vertical SaaS"

76-100: BLUE OCEAN - Novel approach, strong moat, minimal direct competition, defensible advantage
        Example: "First-to-market breakthrough technology", "Unique business model in underserved market"

EVALUATION CRITERIA:
1. Market saturation - How crowded is this space?
2. Differentiation strength - What makes this truly unique?
3. Competitive moat - Can competitors easily copy this?
4. Defensibility - Network effects, proprietary tech, data moats?

BE HARSH: Most projects are in red/crowded markets (0-50). Only truly innovative approaches score 70+.

Return ONLY valid JSON in this exact format:
{{
    "score": <0-100 integer>,
    "market_type": "<blue_ocean|red_ocean|purple_ocean>",
    "differentiation": "<weak|moderate|strong>",
    "reasoning": "<2-3 sentence investor-focused analysis>"
}}"""

        return self._call_llm(prompt, "competitive_analysis")

    def market_fit_analysis(self, project_data):
        """
        Analyze product-market fit indicators with INVESTOR-GRADE RIGOR

        Returns:
            Dict with score (0-100) and reasoning
        """
        prompt = f"""You are a venture capital analyst. Assess product-market fit CONSERVATIVELY.

PROJECT DATA:
Description: {project_data.get('description', 'N/A')}
Tech Stack: {', '.join(project_data.get('tech_stack', []))}
Categories: {', '.join(project_data.get('categories', []))}

SCORING RUBRIC (0-100):
0-25: POOR FIT - Unclear problem, vague solution, undefined market, questionable timing
      Example: "Building a platform" (what problem?), "Revolutionary app" (for whom?)

26-50: WEAK FIT - Problem exists but solution unclear, market too broad, timing uncertain
       Example: "Tool for developers" (which developers? what pain?), Generic consumer app

51-75: MODERATE FIT - Clear problem, viable solution, defined target market, reasonable timing
       Example: "Automated compliance for fintech startups", "API for healthcare data integration"

76-100: STRONG FIT - Urgent problem, proven demand, precise ICP, perfect timing, large TAM
        Example: "SOC2 automation for YC companies", "AI safety tools for Fortune 500"

EVALUATION CRITERIA:
1. Problem-Solution Alignment - Is there a REAL, URGENT problem being solved?
2. Target Market Clarity - Can you name 10 potential customers RIGHT NOW?
3. Market Size - Is TAM > $1B? Is SAM > $100M?
4. Timing - Why NOW? Market tailwinds or headwinds?

BE SKEPTICAL: Vague descriptions, broad targets, or "nice-to-have" solutions score low (0-40).

Return ONLY valid JSON:
{{
    "score": <0-100 integer>,
    "problem_solution_fit": "<weak|moderate|strong>",
    "market_clarity": "<unclear|somewhat_clear|very_clear>",
    "reasoning": "<2-3 sentence investor assessment>"
}}"""

        return self._call_llm(prompt, "market_fit_analysis")

    def success_criteria_analysis(self, project_data):
        """
        Analyze success likelihood with INVESTOR-GRADE RIGOR

        Returns:
            Dict with score (0-100) and reasoning
        """
        prompt = f"""You are a VC partner evaluating execution capability. Be HARSH on risk assessment.

PROJECT DATA:
Description: {project_data.get('description', 'N/A')}
Tech Stack: {', '.join(project_data.get('tech_stack', []))}
Novelty: {project_data.get('novelty_factor', 'N/A')}

SCORING RUBRIC (0-100):
0-25: HIGH RISK - Technically infeasible, unviable business model, severe execution challenges
      Example: "Quantum AI blockchain" (buzzwords), "Uber for X" (derivative), requires massive capital

26-50: MODERATE-HIGH RISK - Feasible but challenging, uncertain economics, significant execution risk
       Example: Hardware startup, two-sided marketplace, regulated industry without domain expertise

51-75: MANAGEABLE RISK - Proven tech, viable unit economics, clear GTM, experienced team needed
       Example: B2B SaaS with established playbook, API business, proven distribution channel

76-100: LOW RISK - Proven feasibility, strong economics, low execution risk, repeatable model
        Example: Simple no-code tool, proven PLG model, minimal dependencies, fast iteration

EVALUATION CRITERIA:
1. Technical Feasibility - Can a competent team actually build this? Hard tech = higher risk
2. Business Viability - Unit economics, CAC/LTV, burn rate, path to profitability
3. Execution Risk - How many things need to go RIGHT? Dependencies? Regulatory hurdles?
4. Team Capability - Does the description suggest domain expertise and realistic planning?

DEFAULT TO SKEPTICISM: Ambitious claims, complex products, or regulatory challenges score low (20-40).

Return ONLY valid JSON:
{{
    "score": <0-100 integer>,
    "feasibility": "<low|medium|high>",
    "viability": "<low|medium|high>",
    "reasoning": "<2-3 sentence risk assessment>"
}}"""

        return self._call_llm(prompt, "success_criteria_analysis")

    def evaluation_analysis(self, project_data):
        """
        Overall investment evaluation with INVESTOR-GRADE RIGOR

        Returns:
            Dict with score (0-100) and reasoning
        """
        prompt = f"""You are a lead investor making a GO/NO-GO decision. Be CONSERVATIVE.

PROJECT DATA:
Description: {project_data.get('description', 'N/A')}
Innovation: {project_data.get('novelty_factor', 'N/A')}
Categories: {', '.join(project_data.get('categories', []))}

SCORING RUBRIC (0-100):
0-25: PASS - Unclear problem, low innovation, limited impact, poor scalability
      Example: Feature not product, small niche, no network effects, limited TAM

26-50: WEAK - Incremental improvement, moderate impact, scaling challenges, crowded space
       Example: "Better analytics dashboard", local services marketplace, consulting-heavy model

51-75: INTERESTING - Clear value prop, solid innovation, meaningful impact, scalable model
       Example: Vertical SaaS with novel approach, B2B marketplace with defensibility, dev tools

76-100: COMPELLING - Breakthrough innovation, transformative impact, massive scalability, unfair advantage
        Example: Platform play with network effects, novel technical moat, 10x better solution

EVALUATION CRITERIA:
1. Problem Clarity - Is this a REAL, PAINFUL problem investors understand?
2. Innovation Level - Is this genuinely novel or just incremental?
3. Impact Potential - Can this be a $100M+ business? Does anyone care?
4. Scalability - Software margins? Or services/hardware constraints?

MOST PROJECTS ARE INCREMENTAL (30-50). Reserve 70+ for truly exceptional opportunities.

Return ONLY valid JSON:
{{
    "score": <0-100 integer>,
    "innovation": "<low|medium|high>",
    "impact": "<low|medium|high>",
    "reasoning": "<2-3 sentence investment thesis>"
}}"""

        return self._call_llm(prompt, "evaluation_analysis")

    def _call_llm(self, prompt, analysis_type):
        """
        Call OpenAI API with retry logic

        Args:
            prompt: Prompt string
            analysis_type: Type of analysis (for error logging)

        Returns:
            Dict with score and analysis details
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a senior VC partner with 15+ years experience. You've seen thousands of pitches. Be CONSERVATIVE and RIGOROUS - investors' capital is at stake. Most projects are mediocre (30-50 scores). Only exceptional opportunities score 70+. Return only valid JSON responses."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,  # Lower temperature for more consistent, conservative scoring
                max_tokens=500,
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content
            result = json.loads(content)

            # Validate score is in range
            if 'score' in result:
                result['score'] = max(0, min(100, result['score']))

            return result

        except json.JSONDecodeError as e:
            return {
                'score': 50,
                'error': f'JSON parse error in {analysis_type}',
                'reasoning': f'Failed to parse LLM response: {str(e)}'
            }
        except Exception as e:
            return {
                'score': 50,
                'error': f'LLM API error in {analysis_type}',
                'reasoning': f'Analysis failed: {str(e)}'
            }

    def _generate_summary(self, competitive, market_fit, success, evaluation, errors=None, penalty=0):
        """Generate overall reasoning summary with validation warnings"""
        parts = []

        # Add content quality warning if penalties applied
        if penalty > 0 and errors:
            quality_warning = f"⚠️ Content Quality Issues (-{penalty} points): {errors[0]}"
            parts.append(quality_warning)

        if 'reasoning' in competitive:
            parts.append(f"Competition: {competitive['reasoning']}")

        if 'reasoning' in market_fit:
            parts.append(f"Market Fit: {market_fit['reasoning']}")

        if 'reasoning' in success:
            parts.append(f"Success: {success['reasoning']}")

        if 'reasoning' in evaluation:
            parts.append(f"Overall: {evaluation['reasoning']}")

        return " | ".join(parts) if parts else "Analysis complete."

    def _error_result(self, error_msg):
        """Return error result structure"""
        return {
            'score': 0,
            'error': error_msg,
            'competitive': {'score': 0, 'error': error_msg},
            'market_fit': {'score': 0, 'error': error_msg},
            'success_criteria': {'score': 0, 'error': error_msg},
            'evaluation': {'score': 0, 'error': error_msg},
            'reasoning': f'LLM analysis failed: {error_msg}'
        }
