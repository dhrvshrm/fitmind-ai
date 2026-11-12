import { alpha, type SxProps, type Theme } from '@mui/material';

export const weightProgressCardStyles = {
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 1,
  },
  chart: {
    width: '100%',
    height: 240,
    mt: 1,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 2,
    mt: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0.75,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    bgcolor: (theme: Theme) => alpha(theme.palette.primary.main, 0.35),
  },
  legendLine: {
    width: 16,
    height: 3,
    borderRadius: 2,
    bgcolor: 'primary.main',
  },
} satisfies Record<string, SxProps<Theme>>;
