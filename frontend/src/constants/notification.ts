import { ROUTES } from "./routes";
import type { NotificationType } from "../types/notification";

/** Theme palette keys a notification type can be tinted with. */
export type NotificationTone = "primary" | "secondary" | "success" | "warning" | "error" | "info";

/**
 * Per-type accent (icon tint), as a theme palette key so it resolves to the
 * right shade in light and dark mode at render time. The icons themselves
 * live in `NotificationTypeIcon`; the React Compiler lint rule forbids
 * rendering a component reference picked out of a lookup map, so that file
 * uses a literal switch instead. Keep the two in sync when adding a type.
 */
export const NOTIFICATION_TYPE_TONE: Record<NotificationType, NotificationTone> = {
  follow: "info",
  friend_request: "info",
  friend_accepted: "secondary",
  nudge: "warning",
  badge_earned: "primary",
  streak_warning: "error",
  workout_logged: "info",
  level_up: "primary",
  weekly_report: "secondary",
  leaderboard_change: "warning",
};

export const DEFAULT_NOTIFICATION_TONE: NotificationTone = "primary";

export function getNotificationTypeTone(type: string): NotificationTone {
  return NOTIFICATION_TYPE_TONE[type as NotificationType] ?? DEFAULT_NOTIFICATION_TONE;
}

/**
 * Types worth interrupting the user with a toast when they arrive live.
 * Everything else still updates the bell badge, but silently; a "you
 * gained a follower" shouldn't pop over whatever the user is doing.
 */
export const TOAST_NOTIFICATION_TYPES: ReadonlySet<string> =
  new Set<NotificationType>([
    "badge_earned",
    "level_up",
    "streak_warning",
    "friend_accepted",
    "friend_request",
  ]);

/** Where clicking a notification of each type should take the user. */
export const NOTIFICATION_TYPE_ROUTE: Record<NotificationType, string> = {
  follow: ROUTES.FRIENDS,
  friend_request: ROUTES.FRIENDS,
  friend_accepted: ROUTES.FRIENDS,
  nudge: ROUTES.WORKOUTS,
  badge_earned: ROUTES.GAMIFICATION,
  streak_warning: ROUTES.WORKOUTS,
  workout_logged: ROUTES.WORKOUTS,
  level_up: ROUTES.GAMIFICATION,
  weekly_report: ROUTES.DASHBOARD,
  leaderboard_change: ROUTES.GAMIFICATION,
};

export function getNotificationRoute(type: string): string {
  return NOTIFICATION_TYPE_ROUTE[type as NotificationType] ?? ROUTES.DASHBOARD;
}
