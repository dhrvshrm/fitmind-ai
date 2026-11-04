import type { Theme } from '@mui/material';
import type { ToasterProps } from 'react-hot-toast';
import { RADIUS } from '../../theme';

export const appToasterStyles = (theme: Theme): ToasterProps['toastOptions'] => ({
  style: {
    background: theme.palette.background.paper,
    color: theme.palette.text.primary,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: RADIUS.md,
    boxShadow: theme.shadows[4],
    fontSize: '0.875rem',
  },
  success: {
    iconTheme: { primary: theme.palette.success.main, secondary: theme.palette.background.paper },
  },
  error: {
    iconTheme: { primary: theme.palette.error.main, secondary: theme.palette.background.paper },
  },
});
