/**
 * Shared helpers for dealing with project identifiers that might arrive
 * as undefined, string literals like "undefined", or alternate formats.
 */

/**
 * Normalize a raw project id value into a usable string.
 */
export function normalizeProjectId(value?: string | null): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === 'undefined' || trimmed.toLowerCase() === 'null') {
    return undefined;
  }

  return trimmed;
}

/**
 * Resolve the first valid project id from a list of candidates.
 * Useful when we might have a slug first and the canonical UUID later.
 */
export function resolveProjectId(...candidates: Array<string | null | undefined>): string | undefined {
  for (const candidate of candidates) {
    const normalized = normalizeProjectId(candidate);
    if (normalized) {
      return normalized;
    }
  }
  return undefined;
}
