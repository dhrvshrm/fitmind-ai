import { alpha, type SxProps, type Theme } from '@mui/material';

export type NudgeTone = 'primary' | 'secondary' | 'info' | 'warning' | 'success';

const base = {
  iconWrap: {
    width: 40,
    height: 40,
    flexShrink: 0,
    borderRadius: '50%',
    display: 'grid',
    placeItems: 'center',
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontWeight: 700,
    lineHeight: 1.35,
  },
  body: {
    color: 'text.secondary',
    mt: 0.25,
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 1,
    flexShrink: 0,
    width: { xs: '100%', sm: 'auto' },
  },
  primaryButton: {
    flex: { xs: 1, sm: 'none' },
  },
} satisfies Record<string, SxProps<Theme>>;

export const nudgeBannerStyles = {
  ...base,
  root:
    (tone: NudgeTone): SxProps<Theme> =>
    (theme: Theme) => {
      const color = theme.palette[tone].main;
      return {
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' },
        gap: { xs: 1.5, sm: 2 },
        p: { xs: 2, sm: 2.25 },
        borderRadius: 3,
        border: '1px solid',
        borderColor: alpha(color, theme.palette.mode === 'dark' ? 0.32 : 0.2),
        // Tint over an opaque paper base, so the page's doodles don't show through.
        background: `linear-gradient(110deg, ${alpha(color, theme.palette.mode === 'dark' ? 0.16 : 0.08)} 0%, ${alpha(color, 0)} 75%), ${theme.palette.background.paper}`,
      };
    },
  icon:
    (tone: NudgeTone): SxProps<Theme> =>
    (theme: Theme) => ({
      ...base.iconWrap,
      color: theme.palette[tone].main,
      bgcolor: alpha(theme.palette[tone].main, theme.palette.mode === 'dark' ? 0.22 : 0.12),
    }),
  row: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 1.5,
    flex: 1,
    minWidth: 0,
  } satisfies SxProps<Theme>,
};
