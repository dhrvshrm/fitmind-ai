import type { SxProps, Theme } from '@mui/material';

export const recoveryLogFormStyles = {
  card: {
    p: { xs: 2.5, sm: 3 },
    borderRadius: 3,
    height: '100%',
  },
  title: {
    fontWeight: 700,
    mb: 2,
  },
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
    fontWeight: 700,
    color: 'primary.main',
  },
  slider: {
    mt: 0.5,
  },
  submit: {
    mt: 2,
  },
  donePanel: {
    py: 6,
    textAlign: 'center',
  },
  doneIcon: {
    fontSize: 48,
    color: 'success.main',
    mb: 1,
  },
  doneTitle: {
    fontWeight: 700,
  },
} satisfies Record<string, SxProps<Theme>>;
