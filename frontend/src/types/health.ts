/** Consent and the manual health profile. */

export type ConsentScope = 'health_profile' | 'health_reports';

export type ConsentStatus = {
  scope: ConsentScope;
  granted: boolean;
  version: number | null;
  current_version: number;
  granted_at: string | null;
};

export type ConditionKey =
  | 'diabetes'
  | 'pcos'
  | 'thyroid'
  | 'hypertension'
  | 'high_cholesterol'
  | 'kidney'
  | 'pregnancy'
  | 'digestive';

export type Provenance = 'self_reported' | 'report';

export type FollowUpValue = string | boolean;

export type ConditionDetails = Record<string, FollowUpValue>;

export type HealthCondition = {
  key: ConditionKey;
  details: ConditionDetails;
  provenance: Provenance;
  recorded_at: string;
};

/** A single answer with where it came from and when it was recorded. */
export type ProvenancedValue<T> = {
  value: T;
  provenance: Provenance;
  recorded_at: string;
};

export type HealthProfile = {
  conditions: HealthCondition[];
  other_conditions: ProvenancedValue<string> | null;
  medications: ProvenancedValue<string> | null;
  blood_thinners: ProvenancedValue<boolean> | null;
  updated_at?: string | null;
};

export type PlanEffect = 'blood_sugar' | 'blood_pressure' | 'cholesterol' | 'kidney' | 'pregnancy';

export type HealthProfileView = {
  consented: boolean;
  profile: HealthProfile | null;
  plan_effects: PlanEffect[];
};

export type HealthProfilePayload = {
  conditions: { key: ConditionKey; details: ConditionDetails }[];
  other_conditions: string | null;
  medications: string | null;
  blood_thinners: boolean | null;
};

/** A follow-up question, shown only when `when` matches earlier answers. */
export type FollowUpQuestion = {
  key: string;
  kind: 'choice' | 'bool';
  options?: string[];
  when?: Record<string, FollowUpValue[]>;
};

/** The questionnaire as the form edits it: ticked conditions and their answers. */
export type HealthDraft = {
  conditions: Partial<Record<ConditionKey, ConditionDetails>>;
  otherConditions: string;
  medications: string;
  bloodThinners: boolean | null;
};
