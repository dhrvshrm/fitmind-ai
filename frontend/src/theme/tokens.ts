/**
 * Design tokens: the single source of every color, radius and font in the app.
 * Components never use raw hex values; they read these through the MUI theme
 * (`primary.main`, `background.paper`, `divider`, ...) or `useChartTheme()`.
 *
 * Light and dark are each selected steps of the same hues (not an automatic
 * inversion), checked for contrast against their own surfaces.
 */
export type ColorMode = 'light' | 'dark';

export const FONTS = {
  display: "'Sora', system-ui, 'Segoe UI', sans-serif",
  body: "'Inter', system-ui, 'Segoe UI', Roboto, sans-serif",
} as const;

/** Corner radii in px. `md` is the theme's base `shape.borderRadius`. */
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

type ModeTokens = {
  brand: { main: string; light: string; dark: string; soft: string; contrastText: string };
  accent: { main: string; light: string; dark: string; soft: string; contrastText: string };
  success: string;
  warning: string;
  error: string;
  info: string;
  background: { default: string; paper: string; raised: string };
  text: { primary: string; secondary: string; disabled: string };
  divider: string;
  border: string;
  hover: string;
  shadow: string;
};

/**
 * Brand violet stays the identity color; it is a slightly deeper step than
 * the original #aa3bff so text and icons on white meet WCAG AA (5.4:1).
 */
export const MODE_TOKENS: Record<ColorMode, ModeTokens> = {
  light: {
    brand: { main: '#9333ea', light: '#b47cf5', dark: '#7322c4', soft: 'rgba(147, 51, 234, 0.08)', contrastText: '#ffffff' },
    accent: { main: '#0d9488', light: '#2dd4bf', dark: '#0f766e', soft: 'rgba(13, 148, 136, 0.10)', contrastText: '#ffffff' },
    success: '#15803d',
    warning: '#b45309',
    error: '#dc2626',
    info: '#2563eb',
    background: { default: '#f7f7fa', paper: '#ffffff', raised: '#fbfbfd' },
    text: { primary: '#16121f', secondary: '#5f5a70', disabled: '#a5a1b3' },
    divider: 'rgba(22, 18, 31, 0.08)',
    border: 'rgba(22, 18, 31, 0.10)',
    hover: 'rgba(22, 18, 31, 0.04)',
    shadow: 'rgba(22, 18, 31, 0.06)',
  },
  dark: {
    brand: { main: '#c084fc', light: '#d8b4fe', dark: '#a855f7', soft: 'rgba(192, 132, 252, 0.12)', contrastText: '#16121f' },
    accent: { main: '#2dd4bf', light: '#5eead4', dark: '#14b8a6', soft: 'rgba(45, 212, 191, 0.12)', contrastText: '#16121f' },
    success: '#4ade80',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#60a5fa',
    background: { default: '#0f0d15', paper: '#17141f', raised: '#1e1a28' },
    text: { primary: '#ecebf2', secondary: '#a19cb3', disabled: '#6b667a' },
    divider: 'rgba(255, 255, 255, 0.08)',
    border: 'rgba(255, 255, 255, 0.10)',
    hover: 'rgba(255, 255, 255, 0.05)',
    shadow: 'rgba(0, 0, 0, 0.40)',
  },
};

/**
 * Chart colors. Macro series use the first three slots of the validated
 * categorical palette (blue, orange, aqua), which pass every color-vision
 * check for all pairs in both modes. Single-series charts use the brand color.
 * Light aqua sits below 3:1 on white, so macro charts always show labels.
 */
export const CHART_TOKENS: Record<ColorMode, {
  primary: string;
  primaryMuted: string;
  protein: string;
  carbs: string;
  fats: string;
  water: string;
  grid: string;
  axis: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
}> = {
  light: {
    primary: '#9333ea',
    primaryMuted: 'rgba(147, 51, 234, 0.30)',
    protein: '#2a78d6',
    carbs: '#eb6834',
    fats: '#1baf7a',
    water: '#2a78d6',
    grid: 'rgba(22, 18, 31, 0.07)',
    axis: '#5f5a70',
    tooltipBg: '#ffffff',
    tooltipBorder: 'rgba(22, 18, 31, 0.10)',
    tooltipText: '#16121f',
  },
  dark: {
    primary: '#c084fc',
    primaryMuted: 'rgba(192, 132, 252, 0.35)',
    protein: '#3987e5',
    carbs: '#d95926',
    fats: '#199e70',
    water: '#3987e5',
    grid: 'rgba(255, 255, 255, 0.07)',
    axis: '#a19cb3',
    tooltipBg: '#1e1a28',
    tooltipBorder: 'rgba(255, 255, 255, 0.10)',
    tooltipText: '#ecebf2',
  },
};
