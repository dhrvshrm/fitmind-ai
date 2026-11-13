import { alpha, type SxProps, type Theme } from '@mui/material';

type CalloutTone = 'info' | 'warning' | 'success';

export const trainingCoachCardStyles = {
  stack: {
    gap: 1.5,
  },
  // A tinted box per suggestion, coloured by what it asks of the user.
  callout:
    (tone: CalloutTone): SxProps<Theme> =>
    (theme) => ({
      display: 'grid',
      gap: 1,
      p: 1.75,
      borderRadius: 2,
      border: '1px solid',
      borderColor: alpha(theme.palette[tone].main, 0.35),
      bgcolor: alpha(theme.palette[tone].main, theme.palette.mode === 'dark' ? 0.12 : 0.06),
    }),
  block: {
    display: 'grid',
    gap: 0.75,
  },
  blockHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1.25,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
  },
  reasons: {
    display: 'grid',
    gap: 0.5,
    pl: 1.5,
    borderLeft: '3px solid',
    borderColor: 'warning.main',
  },
  reasonsTitle: {
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: 'warning.main',
  },
  bar: {
    height: 6,
    borderRadius: 3,
  },
  liftRow:
    (met: boolean): SxProps<Theme> => ({
      color: met ? 'success.main' : 'text.secondary',
      fontVariantNumeric: 'tabular-nums',
    }),
};
