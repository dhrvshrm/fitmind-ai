import { alpha, type SxProps, type Theme } from '@mui/material';
import type { NotificationTone } from '../../constants/notification';

export const notificationItemStyles = {
  row: (unread: boolean): SxProps<Theme> => (theme) => ({
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 1.25,
    px: 2,
    py: 1.25,
    cursor: 'pointer',
    bgcolor: unread ? alpha(theme.palette.primary.main, 0.06) : 'transparent',
    '&:hover': {
      bgcolor: unread ? alpha(theme.palette.primary.main, 0.1) : theme.palette.action.hover,
    },
    '&:focus-visible': {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: -2,
    },
  }),
  iconWrap: (tone: NotificationTone): SxProps<Theme> => (theme) => ({
    width: 36,
    height: 36,
    borderRadius: 1,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: theme.palette[tone].main,
    bgcolor: alpha(theme.palette[tone].main, theme.palette.mode === 'light' ? 0.1 : 0.16),
  }),
  body: {
    flex: 1,
    minWidth: 0,
  } satisfies SxProps<Theme>,
  message: (unread: boolean): SxProps<Theme> => ({
    fontWeight: unread ? 600 : 400,
    overflowWrap: 'anywhere',
  }),
  timestamp: {
    mt: 0.25,
    display: 'block',
  } satisfies SxProps<Theme>,
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    bgcolor: 'primary.main',
    flexShrink: 0,
    mt: 0.75,
  } satisfies SxProps<Theme>,
};
