import type { SxProps, Theme } from '@mui/material';

export const navbarStyles = {
  appBar: {
    zIndex: (theme: Theme) => theme.zIndex.drawer + 1,
    bgcolor: 'background.paper',
    color: 'text.primary',
    borderBottom: 1,
    borderColor: 'divider',
  },
  menuButton: {
    mr: 1,
    display: { xs: 'inline-flex', md: 'none' },
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  brandIcon: {
    color: 'primary.main',
  },
  brandName: {
    fontWeight: 700,
    letterSpacing: 0.3,
  },
  spacer: {
    flexGrow: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    bgcolor: 'primary.main',
    fontSize: 14,
    fontWeight: 700,
  },
  menuHeader: {
    px: 2,
    py: 1,
  },
} satisfies Record<string, SxProps<Theme>>;
