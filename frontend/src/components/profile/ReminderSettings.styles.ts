import type { SxProps, Theme } from '@mui/material';

export const reminderSettingsStyles = {
  device: {
    display: 'flex',
    flexDirection: { xs: 'column', sm: 'row' },
    alignItems: { xs: 'flex-start', sm: 'center' },
    justifyContent: 'space-between',
    gap: 1.5,
    p: 2,
    borderRadius: 2,
    border: '1px solid',
    borderColor: 'divider',
    mb: 2,
  },
  deviceStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
  },
  deviceActions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 1,
  },
  toggles: {
    display: 'flex',
    flexDirection: 'column',
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
    py: 1,
    borderBottom: '1px solid',
    borderColor: 'divider',
    '&:last-of-type': { borderBottom: 'none' },
  },
  toggleText: {
    minWidth: 0,
  },
  toggleLabel: {
    fontWeight: 600,
  },
  times: {
    display: 'grid',
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' },
    gap: 2,
    mt: 2,
  },
  skeleton: {
    height: 160,
  },
} satisfies Record<string, SxProps<Theme>>;
