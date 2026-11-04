import { alpha, createTheme, type Shadows, type Theme } from '@mui/material/styles';
import { FONTS, MODE_TOKENS, RADIUS, type ColorMode } from './tokens';

export { CHART_TOKENS, FONTS, MODE_TOKENS, RADIUS } from './tokens';
export type { ColorMode } from './tokens';

/** Flat, low-contrast shadows: depth comes from borders, not heavy blur. */
function buildShadows(shadowColor: string): Shadows {
  const levels = Array.from({ length: 24 }, (_, i) => {
    const y = Math.min(1 + i, 16);
    const blur = 2 + i * 2;
    return `0px ${y}px ${blur}px ${shadowColor}`;
  });
  return ['none', ...levels] as Shadows;
}

/**
 * Builds the app theme for one color mode. Every screen shares this palette,
 * type scale and component styling, so pages don't restyle MUI themselves.
 */
export function createAppTheme(mode: ColorMode): Theme {
  const t = MODE_TOKENS[mode];

  return createTheme({
    palette: {
      mode,
      primary: { main: t.brand.main, light: t.brand.light, dark: t.brand.dark, contrastText: t.brand.contrastText },
      secondary: { main: t.accent.main, light: t.accent.light, dark: t.accent.dark, contrastText: t.accent.contrastText },
      success: { main: t.success },
      warning: { main: t.warning },
      error: { main: t.error },
      info: { main: t.info },
      background: { default: t.background.default, paper: t.background.paper },
      text: t.text,
      divider: t.divider,
      action: { hover: t.hover },
    },

    shape: { borderRadius: RADIUS.md },

    shadows: buildShadows(t.shadow),

    typography: {
      fontFamily: FONTS.body,
      h1: { fontFamily: FONTS.display, fontWeight: 700, fontSize: '2.4rem', lineHeight: 1.15, letterSpacing: '-0.02em' },
      h2: { fontFamily: FONTS.display, fontWeight: 700, fontSize: '2rem', lineHeight: 1.2, letterSpacing: '-0.02em' },
      h3: { fontFamily: FONTS.display, fontWeight: 700, fontSize: '1.6rem', lineHeight: 1.2, letterSpacing: '-0.015em' },
      h4: { fontFamily: FONTS.display, fontWeight: 700, fontSize: '1.35rem', lineHeight: 1.25, letterSpacing: '-0.01em' },
      h5: { fontFamily: FONTS.display, fontWeight: 700, fontSize: '1.2rem', lineHeight: 1.3, letterSpacing: '-0.01em' },
      h6: { fontFamily: FONTS.display, fontWeight: 600, fontSize: '1rem', lineHeight: 1.35 },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600, fontSize: '0.875rem' },
      body1: { lineHeight: 1.6 },
      body2: { lineHeight: 1.55 },
      caption: { lineHeight: 1.45 },
      button: { textTransform: 'none', fontWeight: 600 },
      overline: { fontWeight: 600, letterSpacing: '0.08em', fontSize: '0.7rem' },
    },

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: t.background.default },
          '*::selection': { backgroundColor: alpha(t.brand.main, 0.25) },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: RADIUS.sm, paddingInline: 16 },
          outlined: { borderColor: t.border },
          sizeLarge: { paddingBlock: 10, fontSize: '0.95rem' },
        },
      },
      MuiIconButton: {
        styleOverrides: { root: { borderRadius: RADIUS.sm } },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: { backgroundImage: 'none' },
          // Outlined paper is the app's card surface; match Card's radius and border.
          outlined: { borderRadius: RADIUS.lg, borderColor: t.border },
        },
      },
      MuiCard: {
        defaultProps: { variant: 'outlined' },
        styleOverrides: {
          root: { borderRadius: RADIUS.lg, borderColor: t.border },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { borderRadius: RADIUS.sm },
          notchedOutline: { borderColor: t.border },
        },
      },
      MuiChip: {
        styleOverrides: { root: { fontWeight: 600, borderRadius: RADIUS.sm } },
      },
      MuiAlert: {
        styleOverrides: { root: { borderRadius: RADIUS.md } },
      },
      MuiDialog: {
        styleOverrides: { paper: { borderRadius: RADIUS.lg, border: `1px solid ${t.border}` } },
      },
      MuiMenu: {
        styleOverrides: { paper: { border: `1px solid ${t.border}` } },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: { borderRadius: RADIUS.pill, height: 8, backgroundColor: t.hover },
          bar: { borderRadius: RADIUS.pill },
        },
      },
      MuiSkeleton: {
        styleOverrides: { rounded: { borderRadius: RADIUS.lg } },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            fontSize: '0.75rem',
            borderRadius: RADIUS.sm,
            backgroundColor: mode === 'light' ? t.text.primary : t.background.raised,
            color: mode === 'light' ? t.background.paper : t.text.primary,
            border: mode === 'light' ? 'none' : `1px solid ${t.border}`,
          },
        },
      },
    },
  });
}
