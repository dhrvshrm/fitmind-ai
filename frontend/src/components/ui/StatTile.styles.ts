import type { SxProps, Theme } from '@mui/material';

export const statTileStyles = {
  card: {
    p: { xs: 2, sm: 2.5 },
    display: 'flex',
    flexDirection: 'column',
    gap: 0.5,
    minWidth: 0,
  },
  top: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 1,
    mb: 0.5,
  },
  label: {
    fontWeight: 500,
  },
  value: {
    fontVariantNumeric: 'tabular-nums',
  },
  valueSkeleton: {
    width: '60%',
    fontSize: '1.6rem',
  },
} satisfies Record<string, SxProps<Theme>>;
