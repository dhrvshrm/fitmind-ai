import { STRINGS } from '../constants/strings';
import { INDIA_FIRST_STRINGS } from '../constants/indiaFirstStrings';
import type { PlanNote, PlanSlot } from '../types/dietPlan';
import type { FastingModeKey, FastingWarning } from '../types/indiaFirst';
import { formatDateLabel } from './date';

const S = STRINGS.mealPlan;
const I = INDIA_FIRST_STRINGS;

/** The meal's name, including Ramadan's sehri, iftar and the light meal after. */
export function slotLabel(slot: PlanSlot): string {
  if (slot === 'sehri' || slot === 'iftar' || slot === 'post_iftar') return I.slots[slot];
  return S.slots[slot];
}

export function modeName(mode: string | null | undefined): string {
  return mode && mode in I.modeNames ? I.modeNames[mode as FastingModeKey] : '';
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * A plan note as one sentence; fasting notes carry text values, the rest numbers.
 * `fastingMode` (the plan's) keeps advice inside the fast's food rules.
 */
export function noteText(note: PlanNote, fastingMode?: string | null): string {
  const v = note.values;
  switch (note.code) {
    case 'fasting_mode':
      return I.notes.fasting_mode(modeName(text(v.mode)), formatDateLabel(text(v.end_date)));
    case 'fasting_salt':
      return I.notes.fasting_salt();
    case 'paryushan_practice':
      return I.notes.paryushan_practice();
    case 'ramadan_timings':
      return I.notes.ramadan_timings(text(v.dawn), text(v.sunset), Boolean(v.given));
    case 'protein_short': {
      const grams = Number(v.grams) || 0;
      if (fastingMode === 'navratri' || fastingMode === 'ekadashi') return I.notes.proteinShortVrat(grams);
      if (fastingMode === 'paryushan') return I.notes.proteinShortJain(grams);
      return S.notes.protein_short(note.values);
    }
    default:
      return S.notes[note.code]();
  }
}

/** A gentle note after logging a food that breaks the active fast (logging still went through). */
export function fastingWarningText(warning: FastingWarning): string {
  return I.warning.toast(modeName(warning.mode), warning.foods.join(', '));
}
