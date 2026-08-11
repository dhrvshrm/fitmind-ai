import type { SxProps, Theme } from '@mui/material';
import { SIDEBAR_WIDTH } from '../../constants/navigation';

/** Deep-violet gradient shared by both drawer variants. */
const DRAWER_PAPER = {
  width: SIDEBAR_WIDTH,
  boxSizing: 'border-box',
  border: 0,
  color: 'rgba(255, 255, 255, 0.82)',
  background:
    'linear-gradient(185deg, #1c1138 0%, #2a1550 55%, #1d0f3c 100%)',
};

export const sidebarStyles = {
  permanentDrawer: {
    display: { xs: 'none', md: 'block' },
    width: SIDEBAR_WIDTH,
    flexShrink: 0,
    '& .MuiDrawer-paper': DRAWER_PAPER,
  },
  mobileDrawer: {
    display: { xs: 'block', md: 'none' },
    '& .MuiDrawer-paper': DRAWER_PAPER,
  },
  list: {
    px: 1.25,
    py: 1.5,
  },
  itemButton: {
    borderRadius: 2.5,
    mb: 0.5,
    color: 'rgba(255, 255, 255, 0.72)',
    transition: 'background-color 0.18s ease, color 0.18s ease',
    '& .MuiListItemIcon-root': {
      color: 'rgba(255, 255, 255, 0.6)',
      transition: 'color 0.18s ease',
    },
    '& .MuiListItemText-primary': {
      fontWeight: 600,
      fontSize: '0.92rem',
    },
    '&:hover': {
      bgcolor: 'rgba(255, 255, 255, 0.07)',
      color: '#ffffff',
      '& .MuiListItemIcon-root': { color: '#ffffff' },
    },
    '&.Mui-selected': {
      background: 'linear-gradient(135deg, #aa3bff 0%, #7a1fd0 100%)',
      color: '#ffffff',
      boxShadow: '0 8px 18px rgba(170, 59, 255, 0.4)',
      '& .MuiListItemIcon-root': { color: '#ffffff' },
      '&:hover': {
        background: 'linear-gradient(135deg, #b455ff 0%, #8a2be2 100%)',
      },
    },
  },
  itemIcon: {
    minWidth: 40,
  },
} satisfies Record<string, SxProps<Theme>>;
