import type { SxProps, Theme } from '@mui/material';

export const foodPickerStyles = {
  paper: {
    width: { xs: 'calc(100vw - 32px)', sm: 380 },
    maxHeight: 440,
    display: 'flex',
    flexDirection: 'column',
  },
  searchBox: {
    p: 1.5,
    borderBottom: '1px solid',
    borderColor: 'divider',
  },
  subheader: {
    lineHeight: 2.4,
    bgcolor: 'background.paper',
  },
  results: {
    overflowY: 'auto',
    py: 0.5,
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    py: 2,
  },
  empty: {
    px: 2,
    py: 1.5,
  },
} satisfies Record<string, SxProps<Theme>>;
