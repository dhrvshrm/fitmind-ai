import type { SxProps, Theme } from '@mui/material';

export const dayReviewStyles = {
  subtitle: {
    mb: 1.5,
  },
  groups: {
    gap: 1.5,
  },
  group: {
    px: { xs: 1.5, sm: 2 },
    pt: 1.5,
    pb: 1,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 1,
    pb: 0.5,
  },
  groupTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  time: {
    width: 150,
    flexShrink: 0,
  },
  groupTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    pt: 1,
    borderTop: '1px solid',
    borderColor: 'divider',
  },
  number: {
    fontVariantNumeric: 'tabular-nums',
  },
  dayTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
    mt: 2,
    p: 1.5,
    borderRadius: 1,
    bgcolor: 'action.hover',
  },
  dayNumbers: {
    textAlign: 'right',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 1,
    mt: 2.5,
  },
} satisfies Record<string, SxProps<Theme>>;
