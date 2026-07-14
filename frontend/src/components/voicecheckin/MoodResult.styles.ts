import type { SxProps, Theme } from '@mui/material';

export const moodResultStyles = {
  card: {
    p: { xs: 2.5, sm: 3 },
    borderRadius: 3,
  },
  title: {
    fontWeight: 700,
    mb: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  emoji: {
    fontSize: 56,
    lineHeight: 1,
  },
  moodLabel: (color: string): SxProps<Theme> => ({
    fontWeight: 700,
    textTransform: 'capitalize',
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
    fontWeight: 700,
    color: 'primary.main',
  },
  energyBar: {
    height: 10,
    borderRadius: 5,
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
    borderRadius: 2,
    bgcolor: 'action.hover',
    fontStyle: 'italic',
  },
} as const;
