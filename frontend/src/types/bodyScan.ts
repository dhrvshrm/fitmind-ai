import type { FitnessGoal } from './onboarding';

/** Body composition scans (InBody and similar), aligned with backend/app/health/body_composition.py. */

export type SegmentKey = 'right_arm' | 'left_arm' | 'trunk' | 'right_leg' | 'left_leg';

export type SegmentStatus = 'under' | 'normal' | 'over';

export type ScanSegment = {
  lean_kg?: number | null;
  /** Lean mass as a % of the standard for the person's height and weight. */
  lean_percent?: number | null;
  fat_kg?: number | null;
  fat_percent?: number | null;
};

export type BodyScanFieldKey =
  | 'weight_kg'
  | 'skeletal_muscle_mass_kg'
  | 'body_fat_mass_kg'
  | 'body_fat_percent'
  | 'fat_free_mass_kg'
  | 'total_body_water_l'
  | 'protein_kg'
  | 'minerals_kg'
  | 'visceral_fat_level'
  | 'bmr_kcal'
  | 'score';

export type BodyScanValues = Partial<Record<BodyScanFieldKey, number | null>> & {
  measured_at?: string | null;
  device?: string | null;
  segments?: Partial<Record<SegmentKey, ScanSegment>>;
};

export type ScanFinding = {
  code: string;
  values: Record<string, number | string | null>;
};

/** What the workout planner does with a scan. */
export type ScanTraining = {
  areas: ('arms' | 'legs' | 'trunk')[];
  weaker: Partial<Record<'arm' | 'leg', 'left' | 'right'>>;
  conditioning: boolean;
};

export type BodyScan = BodyScanValues & {
  id: string;
  measured_at: string;
  report_id: string | null;
  source: 'report' | 'manual';
  analysis: {
    body_fat_category: string | null;
    segment_status: Partial<Record<SegmentKey, SegmentStatus | null>>;
    findings: ScanFinding[];
    training: ScanTraining;
  };
  /** Change in the main numbers since the scan before. */
  changes: Partial<Record<BodyScanFieldKey, number>>;
  /** Newest scan only: a better-suited goal when the scan and the current goal pull apart. */
  goal_advice?: GoalAdvice | null;
};

export type GoalAdvice = {
  goal: FitnessGoal;
  suggested: FitnessGoal;
  reason: 'surplus_with_high_fat' | 'deficit_when_very_lean';
};

export type BodyScanRequest = { scan: BodyScanValues; use_for_profile: boolean };

export type SavedBodyScan = { scan: BodyScan; profile_updated: string[] };
