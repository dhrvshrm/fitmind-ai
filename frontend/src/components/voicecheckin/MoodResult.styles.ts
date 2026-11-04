import type { SxProps, Theme } from '@mui/material';

export const moodResultStyles = {
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  moodIcon: (color: string): SxProps<Theme> => ({
    fontSize: 48,
    lineHeight: 1,
    flexShrink: 0,
    color,
  }),
  moodText: {
    minWidth: 0,
  },
  moodLabel: (color: string): SxProps<Theme> => ({
    textTransform: 'capitalize',
    overflowWrap: 'anywhere',
    color,
  }),
  timestamp: {
    mt: 0.25,
  },
  energyBlock: {
    mt: 2.5,
  },
  energyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    mb: 0.75,
  },
  energyLabel: {
    fontWeight: 600,
  },
  energyValue: {
    fontWeight: 600,
    color: 'primary.main',
    fontVariantNumeric: 'tabular-nums',
  },
  transcriptBlock: {
    mt: 2.5,
  },
  transcriptLabel: {
    fontWeight: 600,
    mb: 0.5,
  },
  transcript: {
    p: 1.5,
    borderRadius: 1,
    bgcolor: 'action.hover',
    fontStyle: 'italic',
  },
};
