import { alpha, type SxProps, type Theme } from '@mui/material';

export const adaptiveTargetCardStyles = {
  stack: {
    gap: 1.5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  suggestion: {
    px: 2,
    py: 1.5,
    borderRadius: 2,
    bgcolor: (theme: Theme) => alpha(theme.palette.primary.main, 0.08),
  },
  suggestionValue: {
    fontWeight: 700,
    color: 'primary.main',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
  },
} satisfies Record<string, SxProps<Theme>>;
