import type { SxProps, Theme } from '@mui/material';

export const activitySettingsCardStyles = {
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 1.5,
  },
  targetField: {
    flex: { xs: '1 1 160px', sm: '0 0 180px' },
  },
  divider: {
    my: 2.5,
  },
  subtitle: {
    mb: 1,
  },
  fields: {
    display: 'grid',
    gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' },
    gap: 1.5,
    mt: 1.5,
  },
  daysLabel: {
    mt: 2,
    mb: 0.75,
  },
  days: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0.75,
  },
  notify: {
    mt: 2,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    mt: 2,
  },
} satisfies Record<string, SxProps<Theme>>;
