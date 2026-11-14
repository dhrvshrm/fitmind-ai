import { alpha, type SxProps, type Theme } from '@mui/material';
import { FONTS, RADIUS } from '../../theme';

export const conditionTileStyles = {
  // A ticked condition spans the full row so its questions have room.
  root:
    (selected: boolean): SxProps<Theme> =>
    (theme) => ({
      gridColumn: selected ? '1 / -1' : 'auto',
      borderRadius: `${RADIUS.md}px`,
      border: `1px ${selected ? 'solid' : 'dashed'} ${selected ? alpha(theme.palette.primary.main, 0.5) : theme.palette.divider}`,
      bgcolor: selected ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.1 : 0.05) : 'background.paper',
      transition: 'border-color 160ms ease, background-color 160ms ease',
      overflow: 'hidden',
    }),
  toggle: {
    width: '100%',
    justifyContent: 'flex-start',
    gap: 1.25,
    px: 1.5,
    py: 1.25,
    textAlign: 'left',
  },
  checkOn: {
    color: 'primary.main',
  },
  checkOff: {
    color: 'text.secondary',
  },
  label: {
    fontWeight: 600,
  },
  // Indented under the label, with a clay rule like a notebook margin.
  questions: ((theme) => ({
    display: 'grid',
    gap: 1.75,
    ml: 3.25,
    mr: 1.5,
    mb: 1.75,
    pl: 2,
    borderLeft: `2px solid ${alpha(theme.palette.secondary.main, 0.5)}`,
  })) satisfies SxProps<Theme>,
  provenance: {
    fontFamily: FONTS.hand,
    fontSize: '1.05rem',
    color: 'secondary.main',
  },
};
