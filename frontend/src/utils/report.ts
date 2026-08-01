import { formatDateLabel } from "./date";
import type { WeeklyReport } from "../types/report";

/** "Jul 26 – Aug 1" style range for a report's week. */
export function formatWeekRange(report: WeeklyReport): string {
  return `${formatDateLabel(report.week_start)} – ${formatDateLabel(report.week_end)}`;
}

/** Case-insensitive match against the report's searchable text fields. */
export function reportMatchesQuery(report: WeeklyReport, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    report.content,
    report.highlight,
    report.mood_trend,
    report.recovery_trend,
    formatWeekRange(report),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

/** Plain-text recap used by both the share and download actions. */
export function buildReportShareText(report: WeeklyReport): string {
  return [
    `FitMind AI — Weekly Report (${formatWeekRange(report)})`,
    "",
    report.highlight,
    "",
    report.content,
    "",
    `Workouts: ${report.workouts_completed}/${report.workouts_planned}`,
    `XP earned: ${report.xp_earned}`,
    `Avg. calories: ${report.avg_calories} kcal (P${report.avg_protein}/C${report.avg_carbs}/F${report.avg_fats}g)`,
    `Mood trend: ${report.mood_trend}`,
    `Recovery trend: ${report.recovery_trend}`,
  ].join("\n");
}
