import type { SxProps, Theme } from '@mui/material';

export const optionSelectorStyles = {
  grid: (columns: number): SxProps<Theme> => ({
    display: 'grid',
    gap: 1.5,
    gridTemplateColumns: { xs: '1fr', sm: `repeat(${columns}, 1fr)` },
  }),
  card: (selected: boolean): SxProps<Theme> => ({
    p: 2,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
    border: 2,
    borderColor: selected ? 'primary.main' : 'divider',
    bgcolor: selected ? 'primary.light' : 'background.paper',
    color: selected ? 'primary.contrastText' : 'text.primary',
    transition: 'border-color .15s, background-color .15s',
    '&:hover': { borderColor: 'primary.main' },
    '&:focus-visible': { outline: 2, outlineColor: 'primary.main' },
  }),
  icon: { fontSize: 28, lineHeight: 1 } satisfies SxProps<Theme>,
  label: { fontWeight: 600 } satisfies SxProps<Theme>,
  description: (selected: boolean): SxProps<Theme> => ({
    opacity: selected ? 0.9 : 0.7,
  }),
};
