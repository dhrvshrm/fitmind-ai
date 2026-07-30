/** Score-band helpers for color-coding recovery UI. */

/**
 * MUI palette token for a recovery score. Thresholds per product spec:
 * red below 40, yellow 40–70, green above 70. Always shown next to the
 * recommendation text, so state is never conveyed by color alone.
 */
export function getScoreColorToken(
  score: number,
): "success.main" | "warning.main" | "error.main" {
  if (score > 70) return "success.main";
  if (score >= 40) return "warning.main";
  return "error.main";
}

export type RecoveryBand = "low" | "moderate" | "good";

export function getScoreBand(score: number): RecoveryBand {
  if (score > 70) return "good";
  if (score >= 40) return "moderate";
  return "low";
}

/**
 * Literal hex per band, for contexts (Recharts fills/strokes) that can't
 * resolve MUI theme-path tokens like `getScoreColorToken` returns. Matches
 * the app's success/warning/error palette (theme.ts).
 */
export const RECOVERY_BAND_HEX: Record<RecoveryBand, string> = {
  good: "#16a34a",
  moderate: "#f59e0b",
  low: "#ef4444",
};

export function getScoreHexColor(score: number): string {
  return RECOVERY_BAND_HEX[getScoreBand(score)];
}
