import { alpha, type SxProps, type Theme } from '@mui/material';
import { hoverLift } from '../ui/interactive.styles';

const base = {
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
    minWidth: 0,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    display: 'block',
    fontWeight: 700,
    letterSpacing: 0.8,
    lineHeight: 1.4,
    color: 'text.secondary',
  },
  caption: {
    display: 'block',
    color: 'text.secondary',
  },
  action: {
    flexShrink: 0,
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1.5,
    flexGrow: 1,
    minWidth: 0,
  },
} satisfies Record<string, SxProps<Theme>>;

export const todayCardStyles = {
  ...base,
  card:
    (highlight: boolean, interactive: boolean): SxProps<Theme> =>
    (theme: Theme) => ({
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      p: { xs: 2, sm: 2.5 },
      minWidth: 0,
      ...(highlight && {
        borderColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.35 : 0.22),
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.07)} 0%, ${alpha(theme.palette.primary.main, 0)} 65%), ${theme.palette.background.paper}`,
      }),
      ...(interactive ? hoverLift : {}),
    }),
};
