import { alpha, type SxProps, type Theme } from '@mui/material';

export const planUpdatePromptStyles = {
  root: ((theme) => ({
    display: 'flex',
    gap: 1.5,
    p: 2,
    borderRadius: 2,
    border: `1px solid ${alpha(theme.palette.primary.main, 0.35)}`,
    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.1 : 0.05),
  })) satisfies SxProps<Theme>,
  icon: {
    color: 'primary.main',
    mt: '2px',
  },
  body: {
    minWidth: 0,
    display: 'grid',
    gap: 0.75,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
    mt: 0.5,
  },
};
