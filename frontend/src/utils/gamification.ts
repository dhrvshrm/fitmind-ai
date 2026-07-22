import { BADGE_EARNED_DATES_KEY } from "../constants/api";
import { toIsoDate } from "./date";

/**
 * The backend doesn't record *when* a badge was earned, only that it was.
 * This locally remembers the first date this browser observed each badge as
 * earned, so the UI can still show an "Earned on …" date and detect
 * newly-unlocked badges for the celebration animation. It is a client-side
 * approximation, not the badge's true award date.
 */
function readEarnedDates(): Record<string, string> {
  try {
    const raw = localStorage.getItem(BADGE_EARNED_DATES_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}

/**
 * Reconciles the currently-earned badge ids against what's stored locally:
 * records today's date for any newly-seen id and returns both the full
 * date map and the subset of ids that are new since the last call.
 *
 * On this browser's very first sync (nothing stored yet) every earned badge
 * is seeded silently - they were earned before we started tracking, so none
 * count as "newly earned" and none trigger the unlock celebration.
 */
export function syncEarnedBadgeDates(earnedIds: string[]): {
  dates: Record<string, string>;
  newlyEarnedIds: string[];
} {
  const isFirstSync = localStorage.getItem(BADGE_EARNED_DATES_KEY) === null;
  const stored = readEarnedDates();
  const newlyEarnedIds: string[] = [];
  const today = toIsoDate(new Date());

  for (const id of earnedIds) {
    if (!stored[id]) {
      stored[id] = today;
      if (!isFirstSync) newlyEarnedIds.push(id);
    }
  }

  localStorage.setItem(BADGE_EARNED_DATES_KEY, JSON.stringify(stored));
  return { dates: stored, newlyEarnedIds };
}
