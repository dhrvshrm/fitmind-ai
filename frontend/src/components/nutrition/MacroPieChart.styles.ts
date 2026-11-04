import type { SxProps, Theme } from '@mui/material';

export const macroPieChartStyles = {
  chartWrap: {
    width: '100%',
    height: 180,
  },
  legend: {
    mt: 1.5,
    display: 'grid',
    gap: 0.75,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  legendLabel: {
    fontWeight: 500,
  },
  legendValue: {
    ml: 'auto',
    fontVariantNumeric: 'tabular-nums',
  },
  legendDot: (color: string): SxProps<Theme> => ({
    width: 10,
    height: 10,
    borderRadius: '50%',
    bgcolor: color,
    flexShrink: 0,
  }),
};
