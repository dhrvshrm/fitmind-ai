import type { SxProps, Theme } from '@mui/material';

export const bodyScanFormStyles = {
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 1.5,
    mb: 2,
  },
  date: {
    width: 190,
  },
  notice: {
    mb: 2,
  },
  section: {
    fontWeight: 700,
    mt: 1,
    mb: 1.25,
  },
  help: {
    mt: -0.75,
    mb: 1.25,
  },
  grid: {
    display: 'grid',
    gap: 1.5,
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' },
    mb: 2,
  },
  segments: {
    display: 'grid',
    gap: 1.25,
  },
  segmentRow: {
    display: 'grid',
    alignItems: 'center',
    gap: 1.25,
    gridTemplateColumns: { xs: 'minmax(0, 1fr) minmax(0, 1fr)', sm: '120px minmax(0, 1fr) minmax(0, 1fr)' },
  },
  segmentName: {
    fontWeight: 600,
    gridColumn: { xs: '1 / -1', sm: 'auto' },
  },
  profile: {
    mt: 2.5,
    mx: 0,
    alignItems: 'flex-start',
    '& .MuiCheckbox-root': { mt: -0.75 },
  },
  profileLabel: {
    fontWeight: 600,
  },
  actions: {
    px: 3,
    py: 2,
  },
} satisfies Record<string, SxProps<Theme>>;
