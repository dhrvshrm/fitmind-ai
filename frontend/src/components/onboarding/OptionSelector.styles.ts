import { alpha, type SxProps, type Theme } from '@mui/material';

export const optionSelectorStyles = {
  grid: (columns: number): SxProps<Theme> => ({
    display: 'grid',
    gap: 1.5,
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: `repeat(${columns}, minmax(0, 1fr))` },
  }),
  card: (selected: boolean): SxProps<Theme> => (theme) => ({
    p: 2,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
    minWidth: 0,
    border: 1,
    borderColor: selected ? theme.palette.primary.main : theme.palette.divider,
    bgcolor: selected
      ? alpha(theme.palette.primary.main, theme.palette.mode === 'light' ? 0.06 : 0.12)
      : theme.palette.background.paper,
    color: theme.palette.text.primary,
    transition: 'border-color .15s, background-color .15s',
    '&:hover': {
      borderColor: theme.palette.primary.main,
      bgcolor: selected
        ? alpha(theme.palette.primary.main, theme.palette.mode === 'light' ? 0.08 : 0.16)
        : theme.palette.action.hover,
    },
    '&:focus-visible': {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: 2,
    },
  }),
  icon: (selected: boolean): SxProps<Theme> => ({
    fontSize: 28,
    flexShrink: 0,
    color: selected ? 'primary.main' : 'text.secondary',
  }),
  text: { minWidth: 0 } satisfies SxProps<Theme>,
  label: { fontWeight: 600 } satisfies SxProps<Theme>,
  description: {
    color: 'text.secondary',
  } satisfies SxProps<Theme>,
};
