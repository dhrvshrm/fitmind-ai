import type { SxProps, Theme } from '@mui/material';

export const nextMealCardStyles = {
  mealName: {
    fontWeight: 700,
    lineHeight: 1.3,
  },
  items: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0.5,
    m: 0,
    p: 0,
    listStyle: 'none',
  },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 1.5,
    minWidth: 0,
  },
  itemName: {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  itemAmount: {
    flexShrink: 0,
    color: 'text.secondary',
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 1,
  },
  actions: {
    display: 'flex',
    flexDirection: { xs: 'column', sm: 'row' },
    gap: 1,
    mt: 'auto',
    pt: 0.5,
  },
  primary: {
    flex: { sm: 1 },
    py: 1.25,
  },
  pending: {
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
    color: 'text.secondary',
  },
  doneText: {
    color: 'text.secondary',
  },
} satisfies Record<string, SxProps<Theme>>;
