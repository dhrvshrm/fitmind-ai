import type { SxProps, Theme } from '@mui/material';

export const recoveryLogFormStyles = {
  fieldRow: {
    mb: 1,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  label: {
    fontWeight: 600,
  },
  value: {
    fontWeight: 600,
    color: 'primary.main',
    fontVariantNumeric: 'tabular-nums',
  },
  slider: {
    mt: 0.5,
  },
  submit: {
    mt: 2,
  },
  donePanel: {
    py: 5,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: 1,
  },
  doneTitle: {
    mt: 1,
  },
} satisfies Record<string, SxProps<Theme>>;
