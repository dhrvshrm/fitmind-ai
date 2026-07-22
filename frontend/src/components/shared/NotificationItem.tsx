import { Box, Stack, Typography } from '@mui/material';
import { NotificationTypeIcon } from './NotificationTypeIcon';
import { STRINGS } from '../../constants/strings';
import { getNotificationTypeColor } from '../../constants/notification';
import { formatTimestamp } from '../../utils/date';
import type { AppNotification } from '../../types/notification';
import { notificationItemStyles as styles } from './NotificationItem.styles';

type NotificationItemProps = {
  notification: AppNotification;
  onClick: (notification: AppNotification) => void;
};

/** One notification row: type icon, message, timestamp, and an unread indicator. */
export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const unread = !notification.read;
  const color = getNotificationTypeColor(notification.type);

  return (
    <Stack
      sx={styles.row(unread)}
      onClick={() => onClick(notification)}
      role="button"
      tabIndex={0}
    >
      <Box sx={styles.iconWrap(color)}>
        <NotificationTypeIcon notificationType={notification.type} fontSize="small" />
      </Box>

      <Box sx={styles.body}>
        <Typography variant="body2" sx={styles.message(unread)}>
          {notification.message}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={styles.timestamp}>
          {formatTimestamp(notification.created_at)}
        </Typography>
      </Box>

      {unread && <Box sx={styles.unreadDot} aria-label={STRINGS.notifications.unreadAria} />}
    </Stack>
  );
}
