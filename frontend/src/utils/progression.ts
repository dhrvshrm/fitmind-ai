import { PROGRESSION_STRINGS } from '../constants/progressionStrings';
import type { Exercise, ExerciseTarget, SetEntry } from '../types/workout';

const T = PROGRESSION_STRINGS.target;

/** One set while it's being logged: text inputs plus the done tick. */
export type SetDraft = { weight: string; reps: string; done: boolean };

/** Plain rep count from "8-12" or "10 each side"; holds like "30s" give null. */
function repRange(reps: string): [number, number] | null {
  const head = reps.split(' ')[0] ?? '';
  if (!head || head.endsWith('s')) return null;
  const [low, high] = head.split('-').map((n) => Number.parseInt(n, 10));
  if (Number.isNaN(low)) return null;
  return [low, Number.isNaN(high) ? low : high];
}

/** True when this exercise is logged with weight and reps (not a timed hold). */
export function tracksSets(exercise: Exercise): boolean {
  return Boolean(exercise.exercise_id && exercise.target && repRange(exercise.reps));
}

/**
 * Starting values for each set, so a typical set is one tap: the suggested
 * weight (or last time's), and last time's reps nudged toward the target.
 */
export function defaultDrafts(exercise: Exercise): SetDraft[] {
  const count = Math.max(1, exercise.sets);
  const target = exercise.target;
  const range = repRange(exercise.reps);
  const last = target?.last?.sets ?? [];
  return Array.from({ length: count }, (_, index) => {
    const previous = last[index] ?? last[last.length - 1];
    const weight = target?.loaded ? target.weight_kg ?? previous?.weight_kg ?? null : null;
    let reps: number | null = range ? range[0] : null;
    if (target && previous) {
      if (target.action === 'add_reps') reps = Math.min(target.reps[1], previous.reps + 1);
      else if (target.action === 'hold' || target.action === 'deload') reps = previous.reps;
    }
    return { weight: weight != null ? String(weight) : '', reps: reps != null ? String(reps) : '', done: false };
  });
}

/** Ticked sets with valid numbers, ready to send. */
export function completedSets(drafts: SetDraft[], loaded: boolean): SetEntry[] {
  return drafts
    .filter((d) => d.done)
    .map((d) => ({ weight_kg: loaded ? Number.parseFloat(d.weight) || 0 : 0, reps: Number.parseInt(d.reps, 10) || 0 }))
    .filter((s) => s.reps > 0);
}

/** The one-line coaching note for today's target. */
export function targetText(target: ExerciseTarget): string {
  const [low, high] = target.reps;
  switch (target.action) {
    case 'first_time':
      return target.loaded ? T.first_time : T.first_time_bodyweight;
    case 'add_weight':
      return T.add_weight(target.weight_kg ?? 0);
    case 'add_reps':
      return T.add_reps(target.weight_kg, low, high);
    case 'hold':
      return T.hold(target.weight_kg ?? 0);
    case 'reduce':
      return T.reduce(target.weight_kg ?? 0);
    case 'harder_variation':
      return T.harder_variation(target.harder_name ?? '');
    case 'add_set':
      return T.add_set;
    case 'deload':
      return T.deload(target.weight_kg);
  }
}
