import type { SxProps, Theme } from '@mui/material';

export const step1PersonalStyles = {
  genderLabel: {
    mb: 1,
  },
  genderError: {
    mt: 0.5,
  },
  bmiBox: {
    p: 2,
    borderRadius: 2,
    bgcolor: 'action.hover',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
  },
  bmiChip: {
    fontWeight: 700,
  },
} satisfies Record<string, SxProps<Theme>>;
