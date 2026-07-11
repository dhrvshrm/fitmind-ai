/** Score-band helpers for color-coding recovery UI. */

/**
 * MUI palette token for a recovery score. Thresholds per product spec:
 * red below 40, yellow 40–70, green above 70. Always shown next to the
 * recommendation text, so state is never conveyed by color alone.
 */
export function getScoreColorToken(score: number): 'success.main' | 'warning.main' | 'error.main' {
  if (score > 70) return 'success.main';
  if (score >= 40) return 'warning.main';
  return 'error.main';
}

/** Short axis/tooltip label for an ISO-ish date string, e.g. "Jul 5". */
export function formatDateLabel(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
