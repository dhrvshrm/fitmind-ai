import { toIsoDate } from './date';
import type { AppNotification } from '../types/notification';

export type NotificationGroups = {
  today: AppNotification[];
  thisWeek: AppNotification[];
  earlier: AppNotification[];
};

/** Buckets notifications by `created_at` into Today / This week / Earlier. */
export function groupNotificationsByDate(notifications: AppNotification[]): NotificationGroups {
  const todayIso = toIsoDate(new Date());
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: NotificationGroups = { today: [], thisWeek: [], earlier: [] };
  for (const notification of notifications) {
    const created = new Date(notification.created_at);
    if (Number.isNaN(created.getTime())) {
      groups.earlier.push(notification);
      continue;
    }
    if (toIsoDate(created) === todayIso) groups.today.push(notification);
    else if (created >= weekAgo) groups.thisWeek.push(notification);
    else groups.earlier.push(notification);
  }
  return groups;
}
