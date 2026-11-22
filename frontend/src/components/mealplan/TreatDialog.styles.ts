import { alpha, type SxProps, type Theme } from '@mui/material';

export const treatDialogStyles = {
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1.5,
  },
  summary: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 1,
  },
  option: ((theme: Theme) => ({
    p: 1.75,
    borderRadius: 2,
    border: '1px solid',
    borderColor: 'divider',
    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.06 : 0.03),
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  })) satisfies SxProps<Theme>,
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 1,
    flexWrap: 'wrap',
  },
  name: {
    fontWeight: 600,
    minWidth: 0,
  },
  numbers: {
    display: 'flex',
    gap: 0.75,
    flexWrap: 'wrap',
  },
  items: {
    m: 0,
    pl: 2.5,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
};
