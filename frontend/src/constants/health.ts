import type { ConditionKey, FollowUpQuestion } from '../types/health';

/**
 * The health questionnaire. Mirrors backend app/health/questionnaire.py; the
 * backend validates answers and drops follow-ups that don't apply.
 */
export const HEALTH_CONDITIONS: Record<ConditionKey, FollowUpQuestion[]> = {
  diabetes: [
    { key: 'type', kind: 'choice', options: ['type1', 'type2', 'prediabetes', 'gestational', 'unsure'] },
    { key: 'on_medication', kind: 'bool' },
    { key: 'uses_insulin', kind: 'bool', when: { on_medication: [true] } },
  ],
  pcos: [{ key: 'on_medication', kind: 'bool' }],
  thyroid: [
    { key: 'type', kind: 'choice', options: ['hypothyroid', 'hyperthyroid', 'unsure'] },
    { key: 'on_medication', kind: 'bool' },
  ],
  hypertension: [{ key: 'on_medication', kind: 'bool' }],
  high_cholesterol: [{ key: 'on_medication', kind: 'bool' }],
  kidney: [
    { key: 'type', kind: 'choice', options: ['ckd', 'kidney_stones', 'other'] },
    { key: 'under_care', kind: 'bool' },
    { key: 'on_dialysis', kind: 'bool', when: { type: ['ckd'] } },
  ],
  pregnancy: [
    { key: 'status', kind: 'choice', options: ['pregnant', 'breastfeeding'] },
    { key: 'trimester', kind: 'choice', options: ['first', 'second', 'third'], when: { status: ['pregnant'] } },
  ],
  digestive: [{ key: 'type', kind: 'choice', options: ['ibs', 'acid_reflux', 'ibd', 'other'] }],
};

export const CONDITION_ORDER = Object.keys(HEALTH_CONDITIONS) as ConditionKey[];

/** Free-text limits; the backend enforces the same. */
export const OTHER_CONDITIONS_MAX = 300;
export const MEDICATIONS_MAX = 500;
