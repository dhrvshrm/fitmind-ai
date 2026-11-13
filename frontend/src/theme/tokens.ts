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
 * "Haldi & Ink": turmeric as the identity color on warm cream paper, ink
 * for text, clay (terracotta) as the second color and neel (indigo) for
 * information. Every text color meets WCAG AA (4.5:1) on both the page
 * background and card surfaces in its own mode.
 */
export const MODE_TOKENS: Record<ColorMode, ModeTokens> = {
  light: {
    brand: { main: '#a35c00', light: '#e3a21a', dark: '#7a4400', soft: 'rgba(227, 162, 26, 0.14)', contrastText: '#ffffff' },
    accent: { main: '#a84a22', light: '#d9774c', dark: '#7f3517', soft: 'rgba(168, 74, 34, 0.10)', contrastText: '#ffffff' },
    success: '#2e7a3e',
    warning: '#b54708',
    error: '#b42318',
    info: '#33539e',
    background: { default: '#f6f0e4', paper: '#fffcf6', raised: '#fbf6ec' },
    text: { primary: '#221d16', secondary: '#6a5f50', disabled: '#aea38f' },
    divider: 'rgba(34, 29, 22, 0.09)',
    border: 'rgba(34, 29, 22, 0.12)',
    hover: 'rgba(163, 92, 0, 0.06)',
    shadow: 'rgba(78, 52, 18, 0.07)',
  },
  dark: {
    brand: { main: '#f0b23e', light: '#f6cb73', dark: '#c98a12', soft: 'rgba(240, 178, 62, 0.14)', contrastText: '#221d16' },
    accent: { main: '#e58a62', light: '#efab8b', dark: '#c66a42', soft: 'rgba(229, 138, 98, 0.14)', contrastText: '#221d16' },
    success: '#86c98a',
    warning: '#f7a35c',
    error: '#f2907f',
    info: '#9bb2ee',
    background: { default: '#15120e', paper: '#1e1a15', raised: '#26211a' },
    text: { primary: '#f3ebdc', secondary: '#bbae99', disabled: '#7a705f' },
    divider: 'rgba(243, 235, 220, 0.08)',
    border: 'rgba(243, 235, 220, 0.11)',
    hover: 'rgba(240, 178, 62, 0.07)',
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
    primary: '#a35c00',
    primaryMuted: 'rgba(163, 92, 0, 0.30)',
    protein: '#2a78d6',
    carbs: '#eb6834',
    fats: '#1baf7a',
    water: '#2a78d6',
    grid: 'rgba(34, 29, 22, 0.08)',
    axis: '#6a5f50',
    tooltipBg: '#fffcf6',
    tooltipBorder: 'rgba(34, 29, 22, 0.12)',
    tooltipText: '#221d16',
  },
  dark: {
    primary: '#f0b23e',
    primaryMuted: 'rgba(240, 178, 62, 0.35)',
    protein: '#3987e5',
    carbs: '#d95926',
    fats: '#199e70',
    water: '#3987e5',
    grid: 'rgba(243, 235, 220, 0.08)',
    axis: '#bbae99',
    tooltipBg: '#26211a',
    tooltipBorder: 'rgba(243, 235, 220, 0.11)',
    tooltipText: '#f3ebdc',
  },
};
