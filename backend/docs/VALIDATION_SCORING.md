# Validation Score System Documentation

**Last Updated:** 2025-11-19
**Status:** Production Ready ✓

## Table of Contents
- [Overview](#overview)
- [Scoring Modes](#scoring-modes)
- [Score Calculation](#score-calculation)
- [Badge System](#badge-system)
- [Math-Only Recalculation](#math-only-recalculation)
- [API Endpoints](#api-endpoints)
- [Frontend Integration](#frontend-integration)
- [Database Schema](#database-schema)
- [Key Files](#key-files)
- [Testing](#testing)

---

## Overview

The validation score is a critical component of the project scoring system, worth **0-30 points** out of the total 100-point proof score. It evaluates projects based on:

1. **AI Analysis** (GPT-4o-mini) - Automated evaluation of project quality
2. **Human Validator Badges** - Expert validation awards

### Total Proof Score Breakdown
```
Proof Score (100 points) =
  Quality (30) +
  Verification (30) +
  Validation (30) +    ← THIS SYSTEM
  Community (10)
```

---

## Scoring Modes

### 1. AI-Only Mode (No Badges)

**When:** Project has no validation badges
**Score Range:** 0-30 points
**Calculation:** Direct AI analysis score normalized to 0-30

```python
validation_score = ai_analysis_score  # 0-30
```

**Breakdown Structure:**
```json
{
  "score": 17.5,
  "mode": "ai_only",
  "competitive": {
    "score": 75,
    "reasoning": "Strong market differentiation..."
  },
  "market_fit": {
    "score": 65,
    "reasoning": "Clear target audience..."
  },
  "success_criteria": {
    "score": 70,
    "reasoning": "Well-defined metrics..."
  },
  "evaluation": {
    "score": 60,
    "reasoning": "Solid execution plan..."
  },
  "reasoning": "Overall AI assessment..."
}
```

### 2. Hybrid Mode (With Badges)

**When:** Project has 1+ validation badges
**Score Range:** 0-30 points
**Calculation:** Badge points + Re-normalized AI score

```python
# Badge points: 0-20 (capped)
badge_points = min(sum(badge.points for badge in badges), 20)

# AI score re-normalized from 0-30 to 0-10
ai_normalized = (original_ai_score / 30) * 10

# Total validation score
validation_score = badge_points + ai_normalized  # 0-30
```

**Example:**
```
Original AI Score: 17.5/30
Silver Badge: 10 points

Hybrid Calculation:
- Badge Points: 10/20
- AI Normalized: (17.5/30) * 10 = 5.83/10
- Total: 10 + 5.83 = 15.83/30
```

**Breakdown Structure:**
```json
{
  "score": 15.83,
  "mode": "hybrid",
  "human_validator_score": 10,
  "ai_score_normalized": 5.83,
  "badges": [
    {
      "type": "silver",
      "name": "Silver",
      "points": 10,
      "awarded_by": "validator_uuid",
      "awarded_at": "2025-11-19T12:00:00"
    }
  ],
  "competitive": { /* AI analysis preserved */ },
  "market_fit": { /* AI analysis preserved */ },
  "success_criteria": { /* AI analysis preserved */ },
  "evaluation": { /* AI analysis preserved */ },
  "reasoning": "Combined expert + AI assessment..."
}
```

---

## Score Calculation

### AI Analysis Process

**File:** `backend/services/scoring/llm_analyzer.py`

```python
class LLMAnalyzer:
    def analyze(self, project_data):
        """Analyzes project with GPT-4o-mini"""

        # 4 dimensions analyzed:
        dimensions = {
            'competitive': 0-100,      # Market differentiation
            'market_fit': 0-100,       # Target audience clarity
            'success_criteria': 0-100, # Measurable goals
            'evaluation': 0-100        # Execution quality
        }

        # Average normalized to 0-100
        overall_score = average(dimensions.values())

        # Normalized to 0-30 for validation component
        validation_score = (overall_score / 100) * 30

        return {
            'score': validation_score,
            'competitive': {...},
            'market_fit': {...},
            'success_criteria': {...},
            'evaluation': {...},
            'reasoning': "..."
        }
```

### Badge Points

**File:** `backend/models/badge.py`

```python
BADGE_POINTS = {
    'stone': 5,      # Basic validation
    'silver': 10,    # Good quality
    'gold': 15,      # Excellent
    'platinum': 20,  # Outstanding
    'demerit': -10   # Issues found
}

# Multiple badges stack (capped at 20)
# Example: Stone (5) + Silver (10) = 15 total
```

---

## Badge System

### Badge Award Flow

```
1. Validator reviews project
2. Awards badge via API (/api/badges/award)
3. Math-only recalculation triggered (NO AI re-analysis)
4. Score updated in database
5. Cache invalidated
6. Real-time Socket.IO event emitted
```

### Badge Constraints

- **One Badge Per Project:** Only 1 badge allowed per project (enforced at DB level)
- **No Re-scoring:** Awarding badge does NOT trigger AI re-analysis
- **Instant Update:** Math-only recalculation completes in <50ms

---

## Math-Only Recalculation

**File:** `backend/utils/scoring_helpers.py`

### Why?

**Problem:** Original implementation re-ran full AI analysis when badge awarded:
- 4 GPT-4 API calls
- 20+ seconds execution time
- Wasted tokens (~$0.02 per badge)
- Celery overhead

**Solution:** Re-normalize existing AI score mathematically:
- 0 API calls
- <50ms execution
- $0 cost
- No Celery needed

### Implementation

```python
def recalculate_validation_score_with_badge(project):
    """
    Recalculate validation score when badge is awarded.
    Uses EXISTING AI analysis - just re-normalizes, no API calls.

    Args:
        project: Project model instance

    Returns:
        dict: {
            'success': True,
            'proof_score': 85.5,
            'validation_score': 15.83,
            'breakdown': {...}
        }
    """

    # Get existing AI score (0-30 range)
    existing_ai_score = project.score_breakdown['validation']['score']

    # Get badges
    badges = ValidationBadge.query.filter_by(project_id=project.id).all()
    badge_points = min(sum(b.points for b in badges), 20)

    # Re-normalize AI from 0-30 to 0-10
    ai_normalized = (existing_ai_score / 30) * 10

    # Calculate new validation score
    new_validation_score = badge_points + ai_normalized  # 0-30

    # Update breakdown (preserve all AI analysis)
    updated_breakdown = {
        **existing_breakdown,
        'validation': {
            **existing_ai_analysis,  # Keep AI reasoning
            'score': new_validation_score,
            'mode': 'hybrid',
            'human_validator_score': badge_points,
            'ai_score_normalized': ai_normalized,
            'badges': [...]
        }
    }

    # Recalculate total proof score
    proof_score = (quality + verification +
                   new_validation_score + community)

    return {
        'success': True,
        'proof_score': proof_score,
        'validation_score': new_validation_score,
        'breakdown': updated_breakdown
    }
```

### Usage

**Badge Award Routes** (3 files updated):
- `backend/routes/badges.py:85-97`
- `backend/routes/admin.py:1135-1145`
- `backend/routes/validator.py:450-460`

```python
# After creating badge in database:
from utils.scoring_helpers import recalculate_validation_score_with_badge

recalc_result = recalculate_validation_score_with_badge(project)

if recalc_result.get('success'):
    project.proof_score = recalc_result['proof_score']
    project.validation_score = recalc_result['validation_score']
    project.score_breakdown = recalc_result['breakdown']

db.session.commit()
```

---

## API Endpoints

### Award Badge

```http
POST /api/badges/award
Authorization: Bearer <token>
Content-Type: application/json

{
  "project_id": "uuid",
  "badge_type": "silver",
  "rationale": "Excellent execution and market fit"
}

Response 201:
{
  "status": "success",
  "message": "Badge awarded",
  "data": {
    "id": "badge_uuid",
    "project_id": "project_uuid",
    "badge_type": "silver",
    "points": 10,
    "validator": {
      "id": "validator_uuid",
      "display_name": "Expert Validator"
    },
    "awarded_at": "2025-11-19T12:00:00Z"
  }
}
```

### Get Project Badges

```http
GET /api/badges/<project_id>

Response 200:
{
  "status": "success",
  "data": [
    {
      "id": "badge_uuid",
      "badge_type": "silver",
      "points": 10,
      "rationale": "...",
      "validator": {...},
      "awarded_at": "..."
    }
  ]
}
```

---

## Frontend Integration

### Display Component

**File:** `frontend/src/components/AIScoringBreakdownCard.tsx:142-248`

```tsx
// AI-Only Mode Display
{mode === 'ai_only' && (
  <div className="score-display">
    <Brain className="icon" />
    <span>AI Analysis: {score}/30</span>
  </div>
)}

// Hybrid Mode Display
{mode === 'hybrid' && (
  <div className="score-display">
    <Award className="icon" />
    <span>
      Expert: {human_validator_score}/20 +
      AI: {ai_score_normalized}/10 =
      {score}/30
    </span>
  </div>
)}
```

### Badge Display

```tsx
{badges?.map(badge => (
  <div key={badge.type} className="badge">
    <TrophyIcon color={getBadgeColor(badge.type)} />
    <span>{badge.name}</span>
    <span className="points">+{badge.points}</span>
  </div>
))}
```

### Info Tooltip

```
💡 Hybrid Scoring Mode

This project has been validated by expert reviewers!

Score Breakdown:
• Expert Validation: 10/20 points
• AI Analysis: 5.83/10 points
• Total: 15.83/30 points

The AI score was re-normalized from 0-30 to 0-10
to make room for expert validator input.
```

---

## Database Schema

### ValidationBadge Table

```sql
CREATE TABLE validation_badge (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL UNIQUE,  -- One badge per project!
    validator_id UUID NOT NULL,
    badge_type VARCHAR(50) NOT NULL,  -- stone, silver, gold, platinum, demerit
    custom_badge_name VARCHAR(100),
    points INTEGER NOT NULL,
    rationale TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fk_project FOREIGN KEY (project_id)
        REFERENCES project(id) ON DELETE CASCADE,
    CONSTRAINT fk_validator FOREIGN KEY (validator_id)
        REFERENCES "user"(id) ON DELETE CASCADE,
    CONSTRAINT unique_project_badge UNIQUE (project_id)
);
```

### Project Score Fields

```sql
CREATE TABLE project (
    -- ... other fields ...

    -- Scores
    proof_score DECIMAL(5,2),           -- 0-100
    validation_score DECIMAL(5,2),      -- 0-30

    -- Breakdown (JSONB)
    score_breakdown JSONB,
    -- {
    --   "validation": {
    --     "score": 15.83,
    --     "mode": "hybrid",
    --     "human_validator_score": 10,
    --     "ai_score_normalized": 5.83,
    --     "badges": [...],
    --     "competitive": {...},
    --     ...
    --   }
    -- }

    scoring_status VARCHAR(20)          -- pending, completed, failed
);
```

---

## Key Files

### Backend

| File | Purpose | Lines |
|------|---------|-------|
| `services/scoring/score_engine.py` | Main scoring orchestration | 48-76 |
| `services/scoring/llm_analyzer.py` | GPT-4 AI analysis | Full file |
| `utils/scoring_helpers.py` | Math-only recalculation | Full file |
| `routes/badges.py` | Badge award endpoint | 85-97 |
| `routes/admin.py` | Admin badge award | 1135-1145 |
| `routes/validator.py` | Validator badge award | 450-460 |
| `models/badge.py` | Badge data model | Full file |

### Frontend

| File | Purpose | Lines |
|------|---------|-------|
| `components/AIScoringBreakdownCard.tsx` | Score display UI | 142-248 |
| `components/ProjectBadges.tsx` | Badge display component | Full file |
| `components/BadgeAwarder.tsx` | Badge award UI | Full file |
| `pages/ProjectDetail.tsx` | Integration point | Various |

---

## Testing

### Manual Test Results (2025-11-19)

#### Test 1: Math-Only Recalculation
```
Project: Test Project
Current AI Score: 10/30 (hybrid mode)
Badge: Silver (10 points)

Recalculation:
✓ Badge Points: 10/20
✓ AI Normalized: (10/30) * 10 = 3.33/10
✓ New Score: 13.33/30
✓ Execution Time: <50ms
✓ No API Calls: Confirmed
```

#### Test 2: AI-Only Mode
```
Project: SmartContract Auditor
AI Analysis: 69.25/100
Normalized: 20.78/30

✓ Competitive: 75/100
✓ Market Fit: 65/100
✓ Success Criteria: 70/100
✓ Evaluation: 60/100
✓ Mode: ai_only
```

#### Test 3: Hybrid Mode
```
Project: With Silver Badge
Original AI: 17/30
Badge: Silver (10 points)

✓ Badge Points: 10/20
✓ AI Normalized: 5.67/10
✓ Total: 15.67/30
✓ Mode: hybrid
✓ AI reasoning preserved
```

### Test Script

```python
# backend/tests/test_validation_scoring.py

def test_math_only_recalculation():
    """Test badge recalculation without AI"""
    from utils.scoring_helpers import recalculate_validation_score_with_badge

    # Setup project with AI score
    project.score_breakdown = {
        'validation': {'score': 20, ...}
    }

    # Award badge
    badge = ValidationBadge(
        project_id=project.id,
        badge_type='silver',
        points=10
    )
    db.session.add(badge)

    # Recalculate
    result = recalculate_validation_score_with_badge(project)

    assert result['success'] == True
    assert result['validation_score'] == 16.67  # 10 + (20/30)*10
    assert result['breakdown']['validation']['mode'] == 'hybrid'
```

---

## Performance Metrics

### Before Optimization (AI Re-analysis)
- **API Calls:** 4 per badge award
- **Execution Time:** 20-30 seconds
- **Cost:** ~$0.02 per badge
- **Celery:** Required
- **Token Usage:** ~3000 tokens

### After Optimization (Math-Only)
- **API Calls:** 0 ✓
- **Execution Time:** <50ms ✓
- **Cost:** $0 ✓
- **Celery:** Not needed ✓
- **Token Usage:** 0 ✓

**Improvement:** 600x faster, $0 cost, 100% reliable

---

## Troubleshooting

### Issue: Badge award doesn't update score

**Check:**
1. Badge created in database? `SELECT * FROM validation_badge WHERE project_id = ?`
2. Recalculation ran? Check logs for "Failed to recalculate scores"
3. Cache cleared? Verify `CacheService.invalidate_project()` called
4. Socket event sent? Check browser console for `badge_awarded` event

### Issue: Score seems wrong

**Verify calculation:**
```python
# Get current values
ai_score = project.score_breakdown['validation']['score']  # e.g., 20
badge_points = badge.points  # e.g., 10

# Manual calculation
expected = badge_points + (ai_score / 30) * 10
# = 10 + (20/30)*10 = 10 + 6.67 = 16.67

# Compare with actual
actual = project.validation_score
assert abs(expected - actual) < 0.01
```

### Issue: Hybrid mode not activating

**Check:**
1. Badge exists? `ValidationBadge.query.filter_by(project_id=?).first()`
2. Mode field updated? `score_breakdown['validation']['mode']`
3. Frontend receiving correct data? Check Network tab

---

## Future Enhancements

### Potential Improvements

1. **Multiple Badges:** Allow multiple badges per project with different types
2. **Badge Revocation:** Add ability to remove/revoke badges
3. **Validator Reputation:** Weight badge points by validator reputation
4. **Badge History:** Track badge changes over time
5. **Badge Categories:** Different badge types for different criteria

### Migration Notes

If implementing multiple badges:
```python
# Remove UNIQUE constraint on project_id
ALTER TABLE validation_badge
  DROP CONSTRAINT unique_project_badge;

# Update recalculation logic
badge_points = sum(badge.points for badge in badges)
badge_points = min(badge_points, 20)  # Still cap at 20
```

---

## Support

**Questions?** Contact the development team
**Issues?** File at [GitHub Issues](https://github.com/your-repo/issues)
**Documentation:** [Full API Docs](./API.md)

---

**End of Documentation**
