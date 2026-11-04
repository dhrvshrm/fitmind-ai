import { alpha, type SxProps, type Theme } from '@mui/material';

export type IconBadgeTone =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral';

const SIZES = { small: 32, medium: 40, large: 52 } as const;

export const iconBadgeStyles = {
  root:
    (tone: IconBadgeTone, size: keyof typeof SIZES): SxProps<Theme> =>
    (theme) => {
      const color = tone === 'neutral' ? theme.palette.text.secondary : theme.palette[tone].main;
      return {
        width: SIZES[size],
        height: SIZES[size],
        flexShrink: 0,
        borderRadius: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color,
        bgcolor: alpha(color, theme.palette.mode === 'light' ? 0.1 : 0.16),
      };
    },
};
