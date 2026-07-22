import { createTheme } from "@mui/material/styles";

/** Font stacks - Sora for display headings, Inter for body/UI text. */
const DISPLAY_FONT = "'Sora', system-ui, 'Segoe UI', sans-serif";
const BODY_FONT = "'Inter', system-ui, 'Segoe UI', Roboto, sans-serif";

/**
 * Soft, purple-tinted shadow scale. MUI expects exactly 25 entries
 * (index 0 = "none"); we generate progressively deeper, low-opacity
 * shadows so cards and menus feel light rather than heavy.
 */
const softShadow = (y: number, blur: number, alpha: number): string =>
  `0px ${y}px ${blur}px rgba(76, 29, 149, ${alpha})`;

const shadows = [
  "none",
  softShadow(1, 2, 0.06),
  softShadow(2, 6, 0.07),
  softShadow(4, 12, 0.08),
  softShadow(6, 16, 0.09),
  softShadow(8, 20, 0.1),
  softShadow(10, 24, 0.1),
  softShadow(12, 28, 0.11),
  softShadow(14, 32, 0.11),
  softShadow(16, 36, 0.12),
  softShadow(18, 40, 0.12),
  softShadow(20, 44, 0.13),
  softShadow(22, 48, 0.13),
  softShadow(24, 52, 0.14),
  softShadow(26, 56, 0.14),
  softShadow(28, 60, 0.15),
  softShadow(30, 64, 0.15),
  softShadow(32, 68, 0.16),
  softShadow(34, 72, 0.16),
  softShadow(36, 76, 0.17),
  softShadow(38, 80, 0.17),
  softShadow(40, 84, 0.18),
  softShadow(42, 88, 0.18),
  softShadow(44, 92, 0.19),
  softShadow(46, 96, 0.2),
] as const;

/**
 * MUI theme for FitMind AI. Centralises palette, typography, shape and
 * component styling so every screen shares one cohesive, modern look.
 */
export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#aa3bff",
      light: "#c98bff",
      dark: "#7a1fd0",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#12b8a6",
      light: "#5fe0d2",
      dark: "#0c8578",
      contrastText: "#ffffff",
    },
    success: { main: "#16a34a" },
    warning: { main: "#f59e0b" },
    error: { main: "#ef4444" },
    info: { main: "#6366f1" },
    background: {
      default: "#f6f5fb",
      paper: "#ffffff",
    },
    text: {
      primary: "#1c1530",
      secondary: "#6b6484",
    },
    divider: "rgba(28, 21, 48, 0.08)",
  },

  shape: {
    borderRadius: 14,
  },

  shadows: shadows as unknown as typeof shadows & string[],

  typography: {
    fontFamily: BODY_FONT,
    h1: {
      fontFamily: DISPLAY_FONT,
      fontWeight: 800,
      fontSize: "2.6rem",
      lineHeight: 1.12,
      letterSpacing: "-0.022em",
    },
    h2: {
      fontFamily: DISPLAY_FONT,
      fontWeight: 800,
      fontSize: "2.1rem",
      lineHeight: 1.15,
      letterSpacing: "-0.02em",
    },
    h3: {
      fontFamily: DISPLAY_FONT,
      fontWeight: 700,
      fontSize: "1.7rem",
      lineHeight: 1.18,
      letterSpacing: "-0.018em",
    },
    h4: {
      fontFamily: DISPLAY_FONT,
      fontWeight: 700,
      fontSize: "1.4rem",
      lineHeight: 1.2,
      letterSpacing: "-0.015em",
    },
    h5: {
      fontFamily: DISPLAY_FONT,
      fontWeight: 700,
      fontSize: "1.2rem",
      lineHeight: 1.25,
      letterSpacing: "-0.01em",
    },
    h6: {
      fontFamily: DISPLAY_FONT,
      fontWeight: 700,
      fontSize: "1.05rem",
      lineHeight: 1.3,
      letterSpacing: "-0.005em",
    },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    body1: { lineHeight: 1.6 },
    body2: { lineHeight: 1.55 },
    button: {
      textTransform: "none",
      fontWeight: 600,
      letterSpacing: "0.01em",
    },
    overline: {
      fontWeight: 700,
      letterSpacing: "0.12em",
    },
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: "#f6f5fb" },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 10,
          paddingInline: 18,
          "&.MuiButton-containedPrimary": {
            boxShadow: "0px 6px 16px rgba(170, 59, 255, 0.28)",
          },
          "&.MuiButton-containedPrimary:hover": {
            boxShadow: "0px 8px 22px rgba(170, 59, 255, 0.36)",
          },
        },
        sizeLarge: {
          paddingBlock: 11,
          fontSize: "1rem",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          border: "1px solid rgba(28, 21, 48, 0.06)",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600 },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontSize: "0.75rem",
          borderRadius: 8,
          backgroundColor: "#1c1530",
        },
      },
    },
  },
});
