import type { CSSProperties } from "react";

/**
 * Shared Recharts tokens for every dashboard chart: brand purple marks,
 * recessive grid/ticks, and a themed tooltip — matches the chart styling
 * already established on the Recovery/Voice/Nutrition pages.
 */
export const dashboardChartTheme = {
  purple: "#aa3bff",
  purpleMuted: "rgba(170, 59, 255, 0.35)",
  grid: "rgba(28, 21, 48, 0.08)",
  tick: { fontSize: 12, fill: "#6b6484" },
  tooltip: {
    borderRadius: 10,
    border: "1px solid rgba(28, 21, 48, 0.08)",
    boxShadow: "0px 6px 16px rgba(76, 29, 149, 0.09)",
    fontSize: 12,
    fontFamily: "inherit",
  } satisfies CSSProperties,
} as const;
