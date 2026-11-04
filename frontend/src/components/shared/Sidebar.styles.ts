import { alpha, type SxProps, type Theme } from '@mui/material';
import { SIDEBAR_WIDTH } from '../../constants/navigation';

const drawerPaper = {
  width: SIDEBAR_WIDTH,
  boxSizing: 'border-box',
  bgcolor: 'background.paper',
  borderRight: '1px solid',
  borderColor: 'divider',
} as const;

export const sidebarStyles = {
  permanentDrawer: {
    display: { xs: 'none', md: 'block' },
    width: SIDEBAR_WIDTH,
    flexShrink: 0,
    '& .MuiDrawer-paper': drawerPaper,
  },
  mobileDrawer: {
    display: { xs: 'block', md: 'none' },
    '& .MuiDrawer-paper': drawerPaper,
  },
  list: {
    px: 1.5,
    pt: 1,
    pb: 0.5,
  },
  groupLabel: {
    bgcolor: 'transparent',
    color: 'text.secondary',
    fontSize: '0.7rem',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    lineHeight: 2.6,
    px: 1.5,
    position: 'static',
  },
  itemButton: (theme: Theme) => ({
    borderRadius: 1,
    mb: 0.25,
    py: 0.75,
    color: theme.palette.text.secondary,
    '& .MuiListItemIcon-root': { color: theme.palette.text.secondary },
    '& .MuiListItemText-primary': { fontWeight: 500, fontSize: '0.9rem' },
    '&:hover': {
      bgcolor: theme.palette.action.hover,
      color: theme.palette.text.primary,
      '& .MuiListItemIcon-root': { color: theme.palette.text.primary },
    },
    '&.Mui-selected, &.Mui-selected:hover': {
      bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'light' ? 0.08 : 0.14),
      color: theme.palette.primary.main,
      '& .MuiListItemIcon-root': { color: theme.palette.primary.main },
      '& .MuiListItemText-primary': { fontWeight: 600 },
    },
  }),
  itemIcon: {
    minWidth: 34,
  },
} satisfies Record<string, SxProps<Theme>>;
