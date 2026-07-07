import { createTheme } from '@mui/material/styles';

/**
 * MUI theme aligned with the purple accent already used in `index.css`.
 * Kept in one place so every component shares the same palette and shape.
 */
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#aa3bff',
      light: '#c084fc',
      dark: '#7a1fd0',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f7f6fb',
      paper: '#ffffff',
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif",
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
    },
  },
});
