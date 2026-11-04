import type { SxProps, Theme } from '@mui/material';

export const mealFormStyles = {
  macroRow: {
    display: 'grid',
    gap: 2,
    gridTemplateColumns: 'repeat(3, 1fr)',
  },
  typeLabel: {
    fontWeight: 600,
    mb: 1,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
  },
  estimateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    minHeight: 32,
  },
  submit: {
    mt: 1,
  },
} satisfies Record<string, SxProps<Theme>>;
