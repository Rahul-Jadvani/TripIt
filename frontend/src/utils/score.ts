import type { Project } from '@/types';

const SCORE_SECTIONS = ['quality', 'verification', 'validation', 'community', 'onchain'] as const;

export function formatScore(value?: number | null, digits = 1): string {
  const normalized = Number(value ?? 0);
  if (!Number.isFinite(normalized)) {
    return Number(0).toFixed(digits);
  }
  return normalized.toFixed(digits);
}

function getScoreBreakdown(project?: Partial<Project> & { scoreBreakdown?: any }) {
  return project?.score_breakdown || project?.scoreBreakdown;
}

function sumBreakdownScores(breakdown?: Record<string, { score?: number | string }>): number | null {
  if (!breakdown) return null;

  let total = 0;
  let hasNonZeroValue = false;

  for (const key of SCORE_SECTIONS) {
    const raw = breakdown?.[key]?.score;
    if (raw === null || raw === undefined) continue;

    const value = Number(raw);
    if (!Number.isFinite(value)) continue;

    total += value;
    if (value !== 0) {
      hasNonZeroValue = true;
    }
  }

  return hasNonZeroValue ? total : null;
}

function sumComponentScores(proofScore?: Partial<Record<typeof SCORE_SECTIONS[number], number>>): number | null {
  if (!proofScore) return null;

  let total = 0;
  let hasNonZeroValue = false;

  for (const key of SCORE_SECTIONS) {
    const raw = proofScore[key];
    if (raw === null || raw === undefined) continue;

    const value = Number(raw);
    if (!Number.isFinite(value)) continue;

    total += value;
    if (value !== 0) {
      hasNonZeroValue = true;
    }
  }

  return hasNonZeroValue ? total : null;
}

export function getProjectScore(project?: Partial<Project> & { proof_score?: number; scoreBreakdown?: any }) {
  // Prefer explicit match score when present (e.g., investor matching results)
  const matchScore = (project as any)?.matchScore ?? (project as any)?.match_score;
  if (typeof matchScore === 'number' && Number.isFinite(matchScore) && matchScore > 0) {
    return matchScore;
  }

  const breakdown = getScoreBreakdown(project);
  const breakdownScore = sumBreakdownScores(breakdown);

  if (breakdownScore !== null) {
    return breakdownScore;
  }

  const componentsScore = sumComponentScores(project?.proofScore);
  if (componentsScore !== null) {
    return componentsScore;
  }

  const fallback = project?.proofScore?.total ?? project?.proof_score ?? 0;
  const normalized = Number(fallback);
  return Number.isFinite(normalized) ? normalized : 0;
}
