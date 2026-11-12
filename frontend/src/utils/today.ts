import type { DietPlan, PlanMeal } from '../types/dietPlan';

/** A meal stays "next" for this long after its planned time before the following one takes over. */
const NEXT_MEAL_GRACE_MINUTES = 60;

export type DayPart = 'morning' | 'afternoon' | 'evening';

export function dayPart(date = new Date()): DayPart {
  const hour = date.getHours();
  if (hour < 12) return 'morning';
  return hour < 17 ? 'afternoon' : 'evening';
}

function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** "13:30" -> "1:30 PM" in the user's locale. */
export function formatClock(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const date = new Date();
  date.setHours(h || 0, m || 0, 0, 0);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** Today's date as a friendly heading, e.g. "Thursday, 12 November". */
export function formatToday(date = new Date()): string {
  return date.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
}

export type NextMeal = {
  meal: PlanMeal | null;
  /** Plan meals not yet logged today. */
  remaining: number;
};

/**
 * The plan meal to offer now: the first one not logged yet whose time hasn't
 * long passed; late in the day, the last one still open.
 */
export function nextPlanMeal(plan: DietPlan | null | undefined, now = new Date()): NextMeal {
  if (!plan) return { meal: null, remaining: 0 };
  const logged = new Set(plan.logged_today);
  const open = plan.meals.filter((m) => !logged.has(m.id));
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const upcoming = open.find((m) => minutesOf(m.time) + NEXT_MEAL_GRACE_MINUTES >= nowMinutes);
  return { meal: upcoming ?? open[open.length - 1] ?? null, remaining: open.length };
}

/** How much of a target is left (negative when over). */
export function leftOf(goal: number, eaten: number): number {
  return Math.round(goal - eaten);
}

/** Share of a target reached, capped at 100. */
export function percentOf(value: number, goal: number): number {
  return goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
}

/** localStorage-backed "hide this until tomorrow" flags; failures (private mode) are ignored. */
export function readDismissed(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeDismissed(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Hiding for this visit only is fine.
  }
}
