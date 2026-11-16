import type { EvidenceLevel, SafetySeverity, SupplementTiming } from '../types/supplements';

export const SUPPLEMENT_TIMINGS: SupplementTiming[] = [
  'morning',
  'with_breakfast',
  'with_lunch',
  'with_dinner',
  'pre_workout',
  'post_workout',
  'evening',
  'bedtime',
  'any',
];

/** Days shown in the check-off history strip. */
export const SUPPLEMENT_HISTORY_DAYS = 14;

/** Chip colours for evidence and safety, strongest first. */
export const EVIDENCE_COLOR: Record<EvidenceLevel, 'success' | 'info' | 'warning' | 'default'> = {
  strong: 'success',
  moderate: 'info',
  limited: 'warning',
  insufficient: 'default',
};

export const SEVERITY_COLOR: Record<SafetySeverity, 'error' | 'warning' | 'info'> = {
  doctor_first: 'error',
  caution: 'warning',
  info: 'info',
};

/** Monthly supplement budgets offered, in rupees (0: food only). */
export const BUDGET_OPTIONS_INR = [0, 500, 1000, 2500, 5000];
export const DEFAULT_BUDGET_INR = 1000;
/** Browser storage key for the chosen budget (a per-device convenience). */
export const BUDGET_STORAGE_KEY = 'repeat-supplement-budget';

/** URL search parameter for the Health page tab (push reminders open ?tab=supplements). */
export const HEALTH_TAB_PARAM = 'tab';
export const HEALTH_TABS = ['profile', 'supplements'] as const;
export type HealthTab = (typeof HEALTH_TABS)[number];
