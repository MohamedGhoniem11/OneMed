const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/** Parse `?limit=` defensively: positive integers only, capped at 100. */
export function parseLimit(value, { fallback = DEFAULT_LIMIT, max = MAX_LIMIT } = {}) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}
