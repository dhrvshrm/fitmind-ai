import type { SxProps, Theme } from '@mui/material';

export const notificationItemStyles = {
  row: (unread: boolean): SxProps<Theme> => ({
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 1.25,
    px: 2,
    py: 1.25,
    cursor: 'pointer',
    bgcolor: unread ? 'rgba(170, 59, 255, 0.06)' : 'transparent',
    '&:hover': {
      bgcolor: unread ? 'rgba(170, 59, 255, 0.1)' : 'action.hover',
    },
  }),
  iconWrap: (color: string): SxProps<Theme> => ({
    width: 36,
    height: 36,
    borderRadius: '50%',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    bgcolor: color,
  }),
  body: {
    flex: 1,
    minWidth: 0,
  },
  message: (unread: boolean): SxProps<Theme> => ({
    fontWeight: unread ? 700 : 400,
  }),
  timestamp: {
    mt: 0.25,
    display: 'block',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    bgcolor: 'primary.main',
    flexShrink: 0,
    mt: 0.75,
  },
};
