import type { SxProps, Theme } from '@mui/material';
import { SIDEBAR_WIDTH } from '../../constants/navigation';

export const sidebarStyles = {
  permanentDrawer: {
    display: { xs: 'none', md: 'block' },
    width: SIDEBAR_WIDTH,
    flexShrink: 0,
    '& .MuiDrawer-paper': {
      width: SIDEBAR_WIDTH,
      boxSizing: 'border-box',
      borderRight: 1,
      borderColor: 'divider',
    },
  },
  mobileDrawer: {
    display: { xs: 'block', md: 'none' },
    '& .MuiDrawer-paper': {
      width: SIDEBAR_WIDTH,
      boxSizing: 'border-box',
    },
  },
  list: {
    px: 1,
    py: 1,
  },
  itemButton: {
    borderRadius: 2,
    mb: 0.5,
    '&.Mui-selected': {
      bgcolor: 'primary.main',
      color: 'primary.contrastText',
      '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
      '&:hover': { bgcolor: 'primary.dark' },
    },
  },
  itemIcon: {
    minWidth: 40,
  },
} satisfies Record<string, SxProps<Theme>>;
