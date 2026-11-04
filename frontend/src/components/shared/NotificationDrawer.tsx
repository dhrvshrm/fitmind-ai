import { Box, Button, Divider, Drawer, IconButton, Stack, Typography } from '@mui/material';
import { CloseRounded, NotificationsNoneRounded } from '@mui/icons-material';
import { NotificationItem } from './NotificationItem';
import { EmptyState } from '../ui/EmptyState';
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
        <Typography variant="h6" component="h2">
          {S.title}
        </Typography>
        <Stack sx={styles.headerActions}>
          {unreadCount > 0 && (
            <Button size="small" onClick={onMarkAllRead}>
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
            <EmptyState icon={NotificationsNoneRounded} title={S.emptyTitle} description={S.empty} />
          </Box>
        ) : (
          sections.map((section, index) => (
            <Box key={section.label}>
              {index > 0 && <Divider />}
              <Typography variant="overline" color="text.secondary" sx={styles.groupLabel}>
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
