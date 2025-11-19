import type { Project } from '@/types';

const SCORE_SECTIONS = ['quality', 'verification', 'validation', 'community'] as const;

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

function sumBreakdownScores(breakdown?: Record<string, { score?: number }>): number | null {
  if (!breakdown) return null;

  let total = 0;
  let hasValue = false;

  for (const key of SCORE_SECTIONS) {
    const raw = breakdown?.[key]?.score;
    if (typeof raw === 'number' && !Number.isNaN(raw)) {
      total += raw;
      hasValue = true;
    }
  }

  return hasValue ? total : null;
}

function sumComponentScores(proofScore?: Partial<Record<typeof SCORE_SECTIONS[number], number>>): number | null {
  if (!proofScore) return null;

  let total = 0;
  let hasValue = false;

  for (const key of SCORE_SECTIONS) {
    const raw = proofScore[key];
    if (typeof raw === 'number' && !Number.isNaN(raw)) {
      total += raw;
      hasValue = true;
    }
  }

  return hasValue ? total : null;
}

export function getProjectScore(project?: Partial<Project> & { proof_score?: number; scoreBreakdown?: any }) {
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
