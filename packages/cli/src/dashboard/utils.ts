/**
 * Shared utilities for dashboard components.
 */

/** Truncate a string to maxLen, appending "…" if it was cut. */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 1) + "…"
}
