import { useTheme } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import { appToasterStyles } from './AppToaster.styles';

/** Toast host styled from the active theme, so toasts match light and dark mode. */
export function AppToaster() {
  const theme = useTheme();
  return <Toaster position="top-center" toastOptions={appToasterStyles(theme)} />;
}
