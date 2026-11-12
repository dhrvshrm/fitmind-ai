import type { ActivityLevel } from '../types/activity';

/** Days shown in the steps chart (matches the backend default). */
export const STEP_HISTORY_DAYS = 14;
export const MAX_DAILY_STEPS = 100_000;
export const MIN_STEP_TARGET = 1_000;
export const MAX_STEP_TARGET = 50_000;

export const ACTIVITY_LEVELS: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'very_active'];

/** Break interval choices, in minutes. */
export const BREAK_INTERVAL_OPTIONS = [30, 45, 60, 90, 120] as const;

/** Reminders older than this are skipped instead of shown late (matches the backend). */
export const BREAK_MAX_LATENESS_MINUTES = 20;
/** How often the open app checks whether a break is due. */
export const BREAK_CHECK_INTERVAL_MS = 30_000;
/** localStorage key holding the last break reminder shown on this device. */
export const BREAK_LAST_SHOWN_KEY = 'fitmind-break-last-shown';

/**
 * Short routines in the order break reminders rotate through them (the same
 * order the backend uses for push reminders).
 */
export const BREAK_ROUTINES = [
  { id: 'wrists_forearms', minutes: 2 },
  { id: 'neck_upper_back', minutes: 5 },
  { id: 'hips_hamstrings', minutes: 5 },
] as const;

/** Query parameter that opens a routine on the activity page (used by reminders). */
export const ROUTINE_QUERY_PARAM = 'routine';

/** Barcode formats found on retail packs. */
export const BARCODE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];
export const BARCODE_PATTERN = /^(\d{8}|\d{12,14})$/;
/** How often the camera frame is checked for a barcode. */
export const BARCODE_SCAN_INTERVAL_MS = 350;

/** Photos are shrunk to this longest side before upload (faster, under the size limit). */
export const PHOTO_MAX_SIDE = 1600;
export const PHOTO_JPEG_QUALITY = 0.85;
export const PHOTO_MAX_BYTES = 6 * 1024 * 1024;
