import { alpha, type SxProps, type Theme } from '@mui/material';
import { RADIUS } from '../../../theme';

export const mySupplementsCardStyles = {
  list: {
    listStyle: 'none',
    m: 0,
    p: 0,
    gap: 0.75,
  },
  row:
    (taken: boolean): SxProps<Theme> =>
    (theme) => ({
      display: 'flex',
      alignItems: 'center',
      gap: 0.5,
      pr: 0.5,
      borderRadius: `${RADIUS.md}px`,
      border: `1px solid ${taken ? alpha(theme.palette.success.main, 0.4) : theme.palette.divider}`,
      bgcolor: taken ? alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.1 : 0.05) : 'transparent',
      transition: 'background-color 160ms ease, border-color 160ms ease',
    }),
  text: {
    flex: 1,
    minWidth: 0,
    py: 1,
  },
  name:
    (taken: boolean): SxProps<Theme> => ({
      fontWeight: 600,
      textDecoration: taken ? 'line-through' : 'none',
      textDecorationColor: 'rgba(0,0,0,0.25)',
    }),
  history: {
    mt: 2.5,
  },
  historyTitle: {
    display: 'block',
    fontWeight: 700,
    mb: 1,
  },
  strip: {
    display: 'flex',
    gap: 0.75,
    flexWrap: 'wrap',
  },
  // A dot per day, filled by how much of the list was taken.
  dot:
    (share: number): SxProps<Theme> =>
    (theme) => ({
      width: 18,
      height: 18,
      borderRadius: '50%',
      border: `1.5px solid ${alpha(theme.palette.primary.main, 0.4)}`,
      background:
        share <= 0
          ? 'transparent'
          : `conic-gradient(${theme.palette.primary.main} ${Math.round(share * 360)}deg, transparent 0deg)`,
    }),
};
