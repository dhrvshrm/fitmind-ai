import type { SxProps, Theme } from '@mui/material';

export const groceryListDialogStyles = {
  content: {
    display: 'grid',
    gap: 2,
    alignContent: 'start',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 1,
  },
  toggle: {
    px: 1.75,
    textTransform: 'none',
    fontWeight: 600,
  },
  aisle: {
    display: 'grid',
    gap: 0.25,
  },
  aisleTitle: {
    color: 'primary.main',
  },
  items: {
    listStyle: 'none',
    m: 0,
    p: 0,
  },
  // Ticked items fade and strike through, like crossing them off on paper.
  item:
    (done: boolean): SxProps<Theme> => ({
      display: 'flex',
      alignItems: 'center',
      gap: 0.5,
      py: 0.25,
      borderBottom: '1px solid',
      borderColor: 'divider',
      opacity: done ? 0.5 : 1,
      transition: 'opacity 0.15s ease',
      '& .grocery-name': { textDecoration: done ? 'line-through' : 'none' },
    }),
  itemText: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontWeight: 600,
  },
  amount: {
    whiteSpace: 'nowrap',
    fontVariantNumeric: 'tabular-nums',
    color: 'text.secondary',
    pr: 0.5,
  },
  actions: {
    px: 3,
    py: 1.5,
    gap: 1,
  },
  spacer: {
    flex: 1,
  },
};
