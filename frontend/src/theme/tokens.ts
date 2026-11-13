/**
 * Design tokens: the single source of every color, radius and font in the app.
 * Components never use raw hex values; they read these through the MUI theme
 * (`primary.main`, `background.paper`, `divider`, ...) or `useChartTheme()`.
 *
 * Light and dark are each selected steps of the same hues (not an automatic
 * inversion), checked for contrast against their own surfaces.
 */
export type ColorMode = 'light' | 'dark';

/**
 * Fraunces (a soft, warm serif) for headings gives the app a printed,
 * kitchen-notebook voice; Manrope keeps body text and numbers clean.
 */
export const FONTS = {
  display: "'Fraunces', Georgia, 'Times New Roman', serif",
  body: "'Manrope', system-ui, 'Segoe UI', Roboto, sans-serif",
  /** Handwriting, only for small notes on the landing page (sticky notes, margins). */
  hand: "'Caveat', 'Segoe Print', 'Comic Sans MS', cursive",
} as const;

/** Corner radii in px. `md` is the theme's base `shape.borderRadius`. */
export const RADIUS = {
  sm: 10,
  md: 14,
  lg: 20,
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
 * "Neel & Clay": indigo (neel, the block-print and fountain-pen ink) as the
 * identity color on warm off-white paper, clay (terracotta) as the second
 * color and teal for information. Every text color meets WCAG AA (4.5:1) on
 * both the page background and card surfaces in its own mode.
 */
export const MODE_TOKENS: Record<ColorMode, ModeTokens> = {
  light: {
    brand: { main: '#2f4a8a', light: '#6f88c9', dark: '#1f3366', soft: 'rgba(47, 74, 138, 0.10)', contrastText: '#ffffff' },
    accent: { main: '#a84a22', light: '#d9774c', dark: '#7f3517', soft: 'rgba(168, 74, 34, 0.10)', contrastText: '#ffffff' },
    success: '#2e7a3e',
    warning: '#b54708',
    error: '#b42318',
    info: '#1f6f8b',
    background: { default: '#f4f1ea', paper: '#fffdf9', raised: '#faf7f1' },
    text: { primary: '#1c1f26', secondary: '#5e6170', disabled: '#a6a8b3' },
    divider: 'rgba(28, 31, 38, 0.09)',
    border: 'rgba(28, 31, 38, 0.12)',
    hover: 'rgba(47, 74, 138, 0.06)',
    shadow: 'rgba(28, 31, 38, 0.07)',
  },
  dark: {
    brand: { main: '#9db4f2', light: '#c3d1f8', dark: '#6f88c9', soft: 'rgba(157, 180, 242, 0.14)', contrastText: '#11141b' },
    accent: { main: '#e58a62', light: '#efab8b', dark: '#c66a42', soft: 'rgba(229, 138, 98, 0.14)', contrastText: '#11141b' },
    success: '#86c98a',
    warning: '#f7a35c',
    error: '#f2907f',
    info: '#7cc6dd',
    background: { default: '#11141b', paper: '#181c25', raised: '#20252f' },
    text: { primary: '#ecedf2', secondary: '#a9adbc', disabled: '#6c7080' },
    divider: 'rgba(236, 237, 242, 0.08)',
    border: 'rgba(236, 237, 242, 0.11)',
    hover: 'rgba(157, 180, 242, 0.07)',
    shadow: 'rgba(0, 0, 0, 0.45)',
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
    primary: '#2f4a8a',
    primaryMuted: 'rgba(47, 74, 138, 0.30)',
    protein: '#2a78d6',
    carbs: '#eb6834',
    fats: '#1baf7a',
    water: '#2a78d6',
    grid: 'rgba(28, 31, 38, 0.08)',
    axis: '#5e6170',
    tooltipBg: '#fffdf9',
    tooltipBorder: 'rgba(28, 31, 38, 0.12)',
    tooltipText: '#1c1f26',
  },
  dark: {
    primary: '#9db4f2',
    primaryMuted: 'rgba(157, 180, 242, 0.35)',
    protein: '#3987e5',
    carbs: '#d95926',
    fats: '#199e70',
    water: '#3987e5',
    grid: 'rgba(236, 237, 242, 0.08)',
    axis: '#a9adbc',
    tooltipBg: '#20252f',
    tooltipBorder: 'rgba(236, 237, 242, 0.11)',
    tooltipText: '#ecedf2',
  },
};
