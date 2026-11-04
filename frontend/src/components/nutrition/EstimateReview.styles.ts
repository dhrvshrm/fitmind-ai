import type { SxProps, Theme } from '@mui/material';

export const estimateReviewStyles = {
  subtitle: {
    mb: 0.5,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
    mt: 1,
    p: 1.5,
    borderRadius: 1,
    bgcolor: 'action.hover',
  },
  totalNumbers: {
    textAlign: 'right',
  },
  totalKcal: {
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1.2,
  },
  fields: {
    flexDirection: { xs: 'column', sm: 'row' },
    gap: 1.5,
    mt: 2,
  },
  nameField: {
    flexGrow: 1,
  },
  timeField: {
    width: { xs: '100%', sm: 140 },
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
    mt: 2,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 1,
    mt: 2.5,
  },
} satisfies Record<string, SxProps<Theme>>;
