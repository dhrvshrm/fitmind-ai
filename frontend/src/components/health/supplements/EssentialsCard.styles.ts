import { alpha, type SxProps, type Theme } from '@mui/material';
import { RADIUS } from '../../../theme';

export const essentialsCardStyles = {
  budget: {
    mb: 2,
  },
  budgetLabel: {
    display: 'block',
    fontWeight: 700,
    mb: 0.75,
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 0.75,
  },
  body: {
    display: 'grid',
    gap: 2,
  },
  list: {
    listStyle: 'none',
    m: 0,
    p: 0,
    display: 'grid',
    gap: 1,
  },
  item:
    (compact: boolean): SxProps<Theme> =>
    (theme) => ({
      display: 'grid',
      gap: 0.75,
      p: compact ? 1.25 : 1.75,
      borderRadius: `${RADIUS.md}px`,
      border: `1px solid ${compact ? theme.palette.divider : alpha(theme.palette.primary.main, 0.35)}`,
      bgcolor: compact ? 'transparent' : alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.08 : 0.04),
    }),
  itemHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 1.5,
  },
  itemText: {
    minWidth: 0,
  },
  track: {
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  label: {
    fontWeight: 700,
    color: 'text.primary',
  },
  food: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 0.75,
  },
  foodIcon: {
    color: 'secondary.main',
    mt: '2px',
  },
  sectionTitle: {
    display: 'block',
    fontWeight: 700,
    mb: 0.75,
  },
};
