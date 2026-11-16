import type { BodyScanValues } from './bodyScan';

/** Lab reports ("health reports"), their draft values, and confirmed biomarker history. */

export type BiomarkerStatus = 'low' | 'high' | 'in_range' | 'unknown';

/** Where a range came from: printed on the report, or the usual adult range. */
export type RangeSource = 'lab' | 'standard' | null;

/** A value read from a report, waiting for the person to check it. */
export type DraftValue = {
  id: string;
  code: string | null;
  name: string;
  value: number;
  unit: string;
  ref_low: number | null;
  ref_high: number | null;
  ref_source: RangeSource;
  /** Read by the app itself, or by AI (worth a closer look). */
  source: 'local' | 'ai';
  /** False when the unit couldn't be matched to a known one. */
  unit_checked: boolean;
};

export type LabReportStatus = 'needs_review' | 'confirmed';

/** A blood test, or the printout of a body composition machine. */
export type ReportKind = 'blood' | 'body_composition';

export type LabReport = {
  id: string;
  kind: ReportKind;
  mime_type: string;
  size: number;
  status: LabReportStatus;
  /** How values were read: by the app, and by AI when allowed. */
  methods: ('local' | 'ai')[];
  /** Set when AI was allowed but couldn't read the report. */
  ai_error: string | null;
  created_at: string;
  confirmed_at: string | null;
  confirmed_count?: number;
  filename?: string;
  report_date?: string | null;
  lab?: string | null;
  drafts?: DraftValue[];
  /** A body composition scan's values read from the printout, to check. */
  scan_draft?: BodyScanValues | null;
  draft_count?: number;
};

export type FileLink = { url: string | null; expires_in: number | null; mime_type: string };

/** One value the person checked, sent on confirm or typed in by hand. */
export type BiomarkerValueIn = {
  code?: string | null;
  name: string;
  value: number;
  unit: string;
  measured_at?: string | null;
  ref_low?: number | null;
  ref_high?: number | null;
};

export type BiomarkerCategory =
  'blood_sugar' | 'lipids' | 'blood' | 'kidney' | 'liver' | 'thyroid' | 'vitamins' | 'minerals' | 'other';

export type BiomarkerPoint = {
  id: string;
  date: string;
  value: number;
  unit: string;
  ref_low: number | null;
  ref_high: number | null;
  ref_source: RangeSource;
  status: BiomarkerStatus;
  source: 'report' | 'manual';
  report_id: string | null;
};

/** All confirmed values of one biomarker, oldest first. */
export type BiomarkerGroup = {
  code: string;
  name: string;
  unit: string;
  category: BiomarkerCategory;
  about: string | null;
  source: string | null;
  points: BiomarkerPoint[];
  latest: BiomarkerPoint;
  reference: { low: number | null; high: number | null; source: RangeSource };
};

/** A biomarker the app knows, for adding a value by hand. */
export type CatalogBiomarker = {
  code: string;
  name: string;
  unit: string;
  category: BiomarkerCategory;
  about: string;
  source: string;
  reference: { low: number | null; high: number | null };
};
