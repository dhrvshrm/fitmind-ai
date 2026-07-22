/** Notification types, aligned with the backend notification schemas. */

/** Known notification types from `notification_service.NOTIFICATION_TYPES`. */
export type NotificationType =
  | "follow"
  | "friend_accepted"
  | "nudge"
  | "badge_earned"
  | "streak_warning"
  | "workout_logged"
  | "level_up"
  | "weekly_report"
  | "leaderboard_change";

/** A single notification, as returned by the API or pushed over the socket. */
export type AppNotification = {
  id: string;
  type: NotificationType | (string & {});
  message: string;
  meta: Record<string, unknown>;
  read: boolean;
  created_at: string;
};

/** `GET /notifications` -> data. */
export type NotificationListResult = {
  notifications: AppNotification[];
  unread_count: number;
};
