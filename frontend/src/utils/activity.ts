import {
  BREAK_LAST_SHOWN_KEY,
  BREAK_MAX_LATENESS_MINUTES,
  BREAK_ROUTINES,
} from '../constants/activity';
import type { ActivitySettings, DueBreak } from '../types/activity';
import { toIsoDate } from './date';

const MINUTES_PER_DAY = 24 * 60;

function minutesOf(hhmm: string): number {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
}

/** JS getDay() (Sunday = 0) -> backend weekday (Monday = 0). */
export function mondayFirstWeekday(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/**
 * The break reminder due at `now`, if any. Same rules as the backend's
 * `due_break_reminders`: every interval after work start, before work end,
 * on work days, skipped when more than 20 minutes late. Shifts can cross
 * midnight. Uses the device's local time.
 */
export function dueBreak(settings: ActivitySettings, now: Date = new Date()): DueBreak | null {
  if (!settings.break_reminders_enabled || settings.break_interval_minutes <= 0) return null;
  const start = minutesOf(settings.work_start);
  const length = (minutesOf(settings.work_end) - start + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  if (length === 0) return null;

  for (const daysBack of [0, 1]) {
    const shiftStart = new Date(now);
    shiftStart.setDate(shiftStart.getDate() - daysBack);
    shiftStart.setHours(Math.floor(start / 60), start % 60, 0, 0);
    if (!settings.work_days.includes(mondayFirstWeekday(shiftStart))) continue;
    const elapsed = (now.getTime() - shiftStart.getTime()) / 60_000;
    if (elapsed < 0 || elapsed >= length) continue;
    const count = Math.floor(elapsed / settings.break_interval_minutes);
    if (count < 1) return null;
    const slotMinutes = count * settings.break_interval_minutes;
    if (slotMinutes >= length || elapsed - slotMinutes > BREAK_MAX_LATENESS_MINUTES) return null;
    const slot = new Date(shiftStart.getTime() + slotMinutes * 60_000);
    const hhmm = `${String(slot.getHours()).padStart(2, '0')}:${String(slot.getMinutes()).padStart(2, '0')}`;
    const routine = BREAK_ROUTINES[(count - 1) % BREAK_ROUTINES.length];
    return { key: `break:${toIsoDate(slot)}:${hhmm}`, routineId: routine.id, minutes: routine.minutes };
  }
  return null;
}

/** The last reminder shown on this device (storage can be unavailable). */
export function readLastShownBreak(): string | null {
  try {
    return window.localStorage.getItem(BREAK_LAST_SHOWN_KEY);
  } catch {
    return null;
  }
}

export function writeLastShownBreak(key: string): void {
  try {
    window.localStorage.setItem(BREAK_LAST_SHOWN_KEY, key);
  } catch {
    // Without storage the nudge may repeat after a reload; harmless.
  }
}

/** Parses a typed step count; null when it isn't a whole number in range. */
export function parseSteps(value: string, max: number): number | null {
  const cleaned = value.replace(/[,\s]/g, '');
  if (!/^\d+$/.test(cleaned)) return null;
  const steps = Number(cleaned);
  return steps <= max ? steps : null;
}
