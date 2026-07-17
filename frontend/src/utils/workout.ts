import { WORKOUT_COMPLETIONS_KEY } from '../constants/api';
import { toIsoDate } from './date';

/**
 * Difficulty is a free-form string from the AI ("easy", "medium", "advanced"…),
 * bucketed for color-coding. Chip color tokens keep state readable next to the
 * always-present text label.
 */
export type DifficultyBucket = 'easy' | 'medium' | 'hard';

const EASY_WORDS = ['easy', 'beginner', 'light', 'low'];
const HARD_WORDS = ['hard', 'advanced', 'difficult', 'high', 'intense', 'expert'];

export function getDifficultyBucket(difficulty: string): DifficultyBucket {
  const normalized = difficulty.toLowerCase();
  if (EASY_WORDS.some((word) => normalized.includes(word))) return 'easy';
  if (HARD_WORDS.some((word) => normalized.includes(word))) return 'hard';
  return 'medium';
}

export const DIFFICULTY_CHIP_COLOR: Record<DifficultyBucket, 'success' | 'warning' | 'error'> = {
  easy: 'success',
  medium: 'warning',
  hard: 'error',
};

/**
 * Completed-workout dates tracked locally until Day 8 syncs with the backend.
 * Stored as a JSON array of `YYYY-MM-DD` strings.
 */
export function getCompletedDates(): string[] {
  try {
    const raw = localStorage.getItem(WORKOUT_COMPLETIONS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((d): d is string => typeof d === 'string') : [];
  } catch {
    return [];
  }
}

export function markDateCompleted(date: string): string[] {
  const dates = new Set(getCompletedDates());
  dates.add(date);
  const next = [...dates].sort();
  localStorage.setItem(WORKOUT_COMPLETIONS_KEY, JSON.stringify(next));
  return next;
}

/**
 * Current streak: consecutive completed days ending today (or yesterday, so an
 * unfinished today doesn't zero the streak).
 */
export function getStreak(completedDates: string[]): number {
  const completed = new Set(completedDates);
  const cursor = new Date();
  if (!completed.has(toIsoDate(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!completed.has(toIsoDate(cursor))) return 0;
  }

  let streak = 0;
  while (completed.has(toIsoDate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
