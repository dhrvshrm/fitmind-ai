import type { NotificationType } from "../types/notification";

/**
 * Per-type accent color (icon tint + unread indicator), matched against the
 * backend's notification types. The icons themselves live in
 * `NotificationTypeIcon` — the React Compiler lint rule forbids rendering a
 * component reference picked out of a lookup map, so that file uses a
 * literal switch instead; keep the two in sync when adding a type.
 */
export const NOTIFICATION_TYPE_COLOR: Record<NotificationType, string> = {
  follow: "#6366f1",
  friend_accepted: "#12b8a6",
  nudge: "#f59e0b",
  badge_earned: "#aa3bff",
  streak_warning: "#ef4444",
  workout_logged: "#6366f1",
  level_up: "#aa3bff",
  weekly_report: "#12b8a6",
  leaderboard_change: "#f59e0b",
};

export const DEFAULT_NOTIFICATION_COLOR = "#aa3bff";

export function getNotificationTypeColor(type: string): string {
  return (
    NOTIFICATION_TYPE_COLOR[type as NotificationType] ??
    DEFAULT_NOTIFICATION_COLOR
  );
}

/**
 * Types worth interrupting the user with a toast when they arrive live.
 * Everything else still updates the bell badge, but silently — a "you
 * gained a follower" shouldn't pop over whatever the user is doing.
 */
export const TOAST_NOTIFICATION_TYPES: ReadonlySet<string> =
  new Set<NotificationType>([
    "badge_earned",
    "level_up",
    "streak_warning",
    "friend_accepted",
  ]);
