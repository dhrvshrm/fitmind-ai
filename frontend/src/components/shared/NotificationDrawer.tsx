import { Box, Button, Divider, Drawer, IconButton, Stack, Typography } from '@mui/material';
import { CloseRounded, NotificationsNoneRounded } from '@mui/icons-material';
import { NotificationItem } from './NotificationItem';
import { useUiStore } from '../../store/uiStore';
import { STRINGS } from '../../constants/strings';
import { groupNotificationsByDate } from '../../utils/notification';
import type { AppNotification } from '../../types/notification';
import { notificationDrawerStyles as styles } from './NotificationDrawer.styles';

const S = STRINGS.notifications;

type NotificationGroupSection = {
  label: string;
  items: AppNotification[];
};

type NotificationDrawerProps = {
  open: boolean;
  onClose: () => void;
  onItemClick: (notification: AppNotification) => void;
  onMarkAllRead: () => void;
};

/** Slide-in drawer: notifications grouped by Today / This week / Earlier. */
export function NotificationDrawer({
  open,
  onClose,
  onItemClick,
  onMarkAllRead,
}: NotificationDrawerProps) {
  const notifications = useUiStore((s) => s.notifications);
  const unreadCount = useUiStore((s) => s.notificationCount);

  const groups = groupNotificationsByDate(notifications);
  const sections: NotificationGroupSection[] = [
    { label: S.groups.today, items: groups.today },
    { label: S.groups.thisWeek, items: groups.thisWeek },
    { label: S.groups.earlier, items: groups.earlier },
  ].filter((section) => section.items.length > 0);

  return (
    <Drawer anchor="right" open={open} onClose={onClose} slotProps={{ paper: { sx: styles.paper } }}>
      <Stack sx={styles.headerRow}>
        <Typography variant="h6" sx={styles.title}>
          {S.title}
        </Typography>
        <Stack sx={styles.headerActions}>
          {unreadCount > 0 && (
            <Button size="small" onClick={onMarkAllRead} sx={styles.markAllButton}>
              {S.markAllRead}
            </Button>
          )}
          <IconButton aria-label={S.closeAria} onClick={onClose} size="small">
            <CloseRounded fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>

      <Box sx={styles.list}>
        {sections.length === 0 ? (
          <Box sx={styles.empty}>
            <NotificationsNoneRounded sx={styles.emptyIcon} />
            <Typography variant="body2" color="text.secondary">
              {S.empty}
            </Typography>
          </Box>
        ) : (
          sections.map((section, index) => (
            <Box key={section.label}>
              {index > 0 && <Divider />}
              <Typography variant="caption" color="text.secondary" sx={styles.groupLabel}>
                {section.label}
              </Typography>
              {section.items.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={onItemClick}
                />
              ))}
            </Box>
          ))
        )}
      </Box>
    </Drawer>
  );
}
