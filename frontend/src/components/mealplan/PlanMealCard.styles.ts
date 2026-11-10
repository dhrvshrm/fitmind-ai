import type { SxProps, Theme } from '@mui/material';

export const planMealCardStyles = {
  card: {
    height: '100%',
    px: { xs: 1.5, sm: 2 },
    pt: 1.5,
    pb: 1.25,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 1,
  },
  title: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    minWidth: 0,
  },
  number: {
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
  },
  items: {
    listStyle: 'none',
    m: 0,
    mt: 1,
    p: 0,
    flex: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    py: 0.75,
    borderTop: '1px solid',
    borderColor: 'divider',
  },
  itemText: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontWeight: 500,
  },
  footer: {
    gap: 1,
    pt: 1,
    borderTop: '1px solid',
    borderColor: 'divider',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 1,
    '& .MuiButton-root': {
      whiteSpace: 'nowrap',
    },
  },
  logged: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0.5,
    color: 'success.main',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
} satisfies Record<string, SxProps<Theme>>;
