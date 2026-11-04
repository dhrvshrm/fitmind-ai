import { alpha, type SxProps, type Theme } from '@mui/material';

export const badgeWallStyles = {
  hint: {
    mb: 2,
  },
  grid: {
    display: 'grid',
    gap: 1.5,
    gridTemplateColumns: {
      xs: 'repeat(2, minmax(0, 1fr))',
      sm: 'repeat(3, minmax(0, 1fr))',
      md: 'repeat(6, minmax(0, 1fr))',
    },
  },
  badgeCard:
    (earned: boolean): SxProps<Theme> =>
    (theme) => ({
      p: 2,
      height: '100%',
      borderRadius: 1,
      textAlign: 'center',
      cursor: 'pointer',
      borderColor: earned ? alpha(theme.palette.primary.main, 0.35) : 'divider',
      bgcolor: earned ? alpha(theme.palette.primary.main, 0.06) : 'background.paper',
      transition: theme.transitions.create(['border-color', 'background-color'], {
        duration: theme.transitions.duration.shorter,
      }),
      '&:hover': {
        borderColor: earned ? 'primary.main' : 'text.disabled',
        bgcolor: earned ? alpha(theme.palette.primary.main, 0.1) : 'action.hover',
      },
    }),
  iconWrap: (earned: boolean): SxProps<Theme> => ({
    width: 52,
    height: 52,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    mx: 'auto',
    mb: 1,
    color: earned ? 'primary.contrastText' : 'text.disabled',
    bgcolor: earned ? 'primary.main' : 'action.disabledBackground',
  }),
  badgeName: (earned: boolean): SxProps<Theme> => ({
    fontWeight: 600,
    fontSize: '0.8rem',
    color: earned ? 'text.primary' : 'text.secondary',
  }),
  newChip: {
    mt: 0.75,
  },
};
