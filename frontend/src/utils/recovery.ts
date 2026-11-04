import type { Palette } from "@mui/material";

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
 * Resolved color per band from the active theme, for contexts (Recharts
 * fills/strokes) that can't use MUI theme-path tokens like
 * `getScoreColorToken` returns.
 */
export function getRecoveryBandColors(palette: Palette): Record<RecoveryBand, string> {
  return {
    good: palette.success.main,
    moderate: palette.warning.main,
    low: palette.error.main,
  };
}
