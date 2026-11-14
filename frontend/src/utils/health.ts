import { CONDITION_ORDER, HEALTH_CONDITIONS } from '../constants/health';
import type {
  ConditionDetails,
  ConditionKey,
  FollowUpQuestion,
  FollowUpValue,
  HealthDraft,
  HealthProfile,
  HealthProfilePayload,
} from '../types/health';

/** Whether a follow-up applies, given the earlier answers of the same condition. */
export function questionApplies(question: FollowUpQuestion, answers: ConditionDetails): boolean {
  if (!question.when) return true;
  return Object.entries(question.when).every(([key, values]) => values.includes(answers[key]));
}

/** The follow-ups to show for a condition, in order. */
export function visibleQuestions(condition: ConditionKey, answers: ConditionDetails): FollowUpQuestion[] {
  return HEALTH_CONDITIONS[condition].filter((q) => questionApplies(q, answers));
}

/**
 * Set (or clear, with `undefined`) one answer and drop follow-ups that no
 * longer apply, so a stale "uses insulin" never outlives "no medicine".
 */
export function answerQuestion(
  condition: ConditionKey,
  answers: ConditionDetails,
  key: string,
  value: FollowUpValue | undefined,
): ConditionDetails {
  const next: ConditionDetails = { ...answers };
  if (value === undefined) delete next[key];
  else next[key] = value;
  const cleaned: ConditionDetails = {};
  for (const question of HEALTH_CONDITIONS[condition]) {
    if (question.key in next && questionApplies(question, cleaned)) cleaned[question.key] = next[question.key];
  }
  return cleaned;
}

export function emptyDraft(): HealthDraft {
  return { conditions: {}, otherConditions: '', medications: '', bloodThinners: null };
}

export function draftFromProfile(profile: HealthProfile | null): HealthDraft {
  if (!profile) return emptyDraft();
  const conditions: HealthDraft['conditions'] = {};
  for (const item of profile.conditions) conditions[item.key] = { ...item.details };
  return {
    conditions,
    otherConditions: profile.other_conditions?.value ?? '',
    medications: profile.medications?.value ?? '',
    bloodThinners: profile.blood_thinners?.value ?? null,
  };
}

export function payloadFromDraft(draft: HealthDraft): HealthProfilePayload {
  return {
    conditions: CONDITION_ORDER.filter((key) => draft.conditions[key]).map((key) => ({
      key,
      // Re-ordered by question, so equal answers always compare equal.
      details: Object.fromEntries(
        HEALTH_CONDITIONS[key]
          .filter((q) => q.key in (draft.conditions[key] ?? {}))
          .map((q) => [q.key, (draft.conditions[key] ?? {})[q.key]]),
      ),
    })),
    other_conditions: draft.otherConditions.trim() || null,
    medications: draft.medications.trim() || null,
    blood_thinners: draft.bloodThinners,
  };
}

/** Whether two drafts would save the same thing. */
export function sameDraft(a: HealthDraft, b: HealthDraft): boolean {
  return JSON.stringify(payloadFromDraft(a)) === JSON.stringify(payloadFromDraft(b));
}
