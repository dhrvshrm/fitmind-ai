import { alpha, type SxProps, type Theme } from '@mui/material';

export const actionCardStyles = {
  card: (pending: boolean): SxProps<Theme> => (theme) => ({
    mt: 1,
    p: 1.5,
    width: '100%',
    maxWidth: 420,
    borderRadius: 2,
    border: '1px solid',
    borderColor: pending ? alpha(theme.palette.primary.main, 0.5) : theme.palette.divider,
    bgcolor: pending
      ? alpha(theme.palette.primary.main, theme.palette.mode === 'light' ? 0.04 : 0.08)
      : theme.palette.background.paper,
  }),
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 1,
    mb: 0.5,
  },
  title: {
    fontWeight: 700,
  },
  chip: {
    flexShrink: 0,
  },
  changes: {
    m: 0,
    mt: 1,
    display: 'grid',
    gap: 0.5,
  },
  changeRow: {
    display: 'grid',
    gridTemplateColumns: 'minmax(72px, auto) 1fr',
    gap: 1,
    alignItems: 'baseline',
  },
  changeLabel: {
    m: 0,
  },
  changeValue: {
    m: 0,
    fontWeight: 600,
    wordBreak: 'break-word',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 1,
    mt: 1.5,
  },
  result: {
    mt: 1.25,
    gap: 0.75,
    alignItems: 'flex-start',
  },
} satisfies Record<string, SxProps<Theme> | ((pending: boolean) => SxProps<Theme>)>;
