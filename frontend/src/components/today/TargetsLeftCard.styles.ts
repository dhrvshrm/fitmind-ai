import type { SxProps, Theme } from '@mui/material';

export const RING_SIZE = 104;
export const RING_THICKNESS = 4.5;

export const targetsLeftCardStyles = {
  rings: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 2,
  },
  ringBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 1,
    textAlign: 'center',
    minWidth: 0,
  },
  ringWrap: {
    position: 'relative',
    width: RING_SIZE,
    height: RING_SIZE,
  },
  track: {
    position: 'absolute',
    inset: 0,
    color: 'action.hover',
  },
  ring: {
    position: 'absolute',
    inset: 0,
    '& .MuiCircularProgress-circle': { strokeLinecap: 'round' },
  },
  ringCenter: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1.1,
  },
  label: {
    fontWeight: 600,
  },
  sub: {
    color: 'text.secondary',
    fontVariantNumeric: 'tabular-nums',
  },
} satisfies Record<string, SxProps<Theme>>;
