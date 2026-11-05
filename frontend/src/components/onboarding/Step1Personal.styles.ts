import type { SxProps, Theme } from '@mui/material';

export const step1PersonalStyles = {
  genderLabel: {
    mb: 1,
  },
  genderError: {
    mt: 0.5,
  },
  hint: {
    display: 'block',
    mt: 0.75,
  },
  bmiBox: {
    p: 2,
    borderRadius: 1,
    border: 1,
    borderColor: 'divider',
    bgcolor: 'action.hover',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
  },
  bmiChip: {
    fontWeight: 700,
    flexShrink: 0,
  },
} satisfies Record<string, SxProps<Theme>>;
