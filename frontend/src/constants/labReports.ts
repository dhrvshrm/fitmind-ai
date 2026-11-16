import type { BiomarkerStatus } from '../types/labReports';

/** Chip colour for a value against its range. */
export const BIOMARKER_STATUS_COLOR: Record<BiomarkerStatus, 'warning' | 'success' | 'default'> = {
  low: 'warning',
  high: 'warning',
  in_range: 'success',
  unknown: 'default',
};

/** Today as YYYY-MM-DD in the person's own timezone. */
export const todayIso = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
