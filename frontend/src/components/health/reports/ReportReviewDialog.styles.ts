import { alpha, type SxProps, type Theme } from '@mui/material';

export const reportReviewDialogStyles = {
  title: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 2,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 1.5,
    mb: 2,
  },
  date: {
    width: 190,
  },
  alert: {
    mb: 2,
  },
  noneTitle: {
    fontWeight: 600,
    mb: 0.5,
  },
  list: {
    listStyle: 'none',
    m: 0,
    p: 0,
    display: 'grid',
    gap: 1,
  },
  // One value; a removed one fades and keeps an undo.
  row: (removed: boolean) =>
    ((theme: Theme) => ({
      display: 'flex',
      flexDirection: { xs: 'column', sm: 'row' },
      alignItems: { xs: 'stretch', sm: 'center' },
      justifyContent: 'space-between',
      gap: 1.5,
      p: 1.5,
      borderRadius: 2,
      border: `1px solid ${theme.palette.divider}`,
      bgcolor: removed ? alpha(theme.palette.text.primary, 0.03) : theme.palette.background.paper,
      opacity: removed ? 0.6 : 1,
      '& .MuiTypography-root': removed ? { textDecoration: 'line-through' } : {},
    })) satisfies SxProps<Theme>,
  rowMain: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 0.25,
  },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    flexWrap: 'wrap',
  },
  name: {
    fontWeight: 600,
  },
  flag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0.5,
    color: 'warning.main',
  },
  flagIcon: {
    fontSize: 14,
  },
  fields: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    flexShrink: 0,
  },
  valueField: {
    width: { xs: '100%', sm: 110 },
  },
  unitField: {
    width: { xs: '100%', sm: 110 },
  },
  removedNote: {
    mt: 1.5,
  },
  actions: {
    px: 3,
    py: 2,
  },
};
