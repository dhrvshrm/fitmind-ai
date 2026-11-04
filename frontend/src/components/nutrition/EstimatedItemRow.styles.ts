import type { SxProps, Theme } from '@mui/material';

export const estimatedItemRowStyles = {
  root: {
    py: 1.75,
    borderBottom: '1px solid',
    borderColor: 'divider',
    '&:last-of-type': { borderBottom: 'none' },
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 1,
  },
  titleBlock: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 1,
    minWidth: 0,
  },
  name: {
    fontWeight: 600,
  },
  actions: {
    flexDirection: 'row',
    flexShrink: 0,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1.5,
    mt: 1.25,
  },
  quantity: {
    width: 84,
  },
  unit: {
    flexGrow: 1,
    minWidth: 0,
  },
  kcal: {
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
  },
  macros: {
    display: 'block',
    mt: 0.75,
    fontVariantNumeric: 'tabular-nums',
  },
  hint: {
    display: 'block',
    mt: 0.5,
  },
  manualGrid: {
    display: 'grid',
    gap: 1,
    mt: 1,
    gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' },
  },
  suggestButton: {
    mt: 0.5,
    px: 0,
  },
} satisfies Record<string, SxProps<Theme>>;
