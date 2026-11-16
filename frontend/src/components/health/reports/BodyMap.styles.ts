import { alpha, type SxProps, type Theme } from '@mui/material';

export const bodyMapStyles = {
  title: {
    fontWeight: 700,
    mb: 1.5,
  },
  layout: {
    display: 'grid',
    gap: { xs: 2, sm: 3 },
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: '180px minmax(0, 1fr)' },
    alignItems: 'center',
  },
  figure: {
    width: { xs: 160, sm: 180 },
    height: 'auto',
    justifySelf: 'center',
    overflow: 'visible',
  },
  bars: {
    display: 'grid',
    gap: 1.5,
    minWidth: 0,
  },
  scale: {
    mb: -0.5,
  },
  row: {
    display: 'grid',
    gap: 0.5,
  },
  rowHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 1,
  },
  rowName: {
    fontWeight: 600,
  },
  rowValue: {
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
  },
  // The bar's track, with the standard band shaded behind the value.
  track: ((theme) => ({
    position: 'relative',
    height: 10,
    borderRadius: 5,
    bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.1 : 0.06),
    overflow: 'hidden',
  })) satisfies SxProps<Theme>,
  band: (from: number, to: number) =>
    ((theme: Theme) => ({
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: `${from}%`,
      width: `${to - from}%`,
      bgcolor: alpha(theme.palette.success.main, 0.18),
    })) satisfies SxProps<Theme>,
  fill: (to: number, color: string) => ({
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: 0,
    width: `${to}%`,
    borderRadius: 4,
    bgcolor: color,
  }),
  hundred: (at: number) =>
    ((theme: Theme) => ({
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: `${at}%`,
      width: '2px',
      bgcolor: theme.palette.text.primary,
      opacity: 0.45,
    })) satisfies SxProps<Theme>,
  status: (color: string) => ({
    color,
    fontWeight: 600,
  }),
  legend: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.75,
    mt: 0.5,
  },
  legendBand: ((theme) => ({
    width: 18,
    height: 10,
    borderRadius: '3px',
    bgcolor: alpha(theme.palette.success.main, 0.25),
  })) satisfies SxProps<Theme>,
  note: {
    mt: 1.5,
  },
};
