import { alpha, type SxProps, type Theme } from '@mui/material';

export const reportUploadCardStyles = {
  // A dashed drop zone that lights up while a file is dragged over it.
  zone: (dragging: boolean, busy: boolean) =>
    ((theme: Theme) => ({
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 1.25,
      minHeight: 176,
      p: 3,
      textAlign: 'center',
      borderRadius: 2,
      border: `2px dashed ${dragging ? theme.palette.primary.main : theme.palette.divider}`,
      bgcolor: dragging ? alpha(theme.palette.primary.main, 0.06) : 'transparent',
      opacity: busy ? 0.85 : 1,
      transition: 'border-color 150ms ease, background-color 150ms ease',
    })) satisfies SxProps<Theme>,
  zoneIcon: {
    fontSize: 40,
    color: 'primary.main',
  },
  zoneActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  zoneText: {
    fontWeight: 600,
  },
  hiddenInput: {
    display: 'none',
  },
  what: {
    mt: 2,
  },
  whatToggle: {
    mt: 1.5,
  },
  whatTitle: {
    fontWeight: 700,
    mb: 0.25,
  },
  whatList: {
    listStyle: 'none',
    m: 0,
    my: 1.25,
    p: 0,
    display: 'grid',
    gap: 0.75,
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' },
  },
  whatItem: {
    display: 'flex',
    flexDirection: 'column',
    px: 1.25,
    py: 0.75,
    borderRadius: 1.5,
    border: '1px solid',
    borderColor: 'divider',
  },
  whatGroup: {
    fontWeight: 700,
  },
  aiToggle: {
    mt: 2,
    mx: 0,
    alignItems: 'flex-start',
    gap: 1,
    '& .MuiSwitch-root': { mt: -0.5 },
  },
  aiLabel: {
    fontWeight: 600,
  },
};
