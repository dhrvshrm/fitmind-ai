import type { SxProps, Theme } from '@mui/material';

export const onboardingFlowStyles = {
  root: {
    minHeight: '100svh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    p: 2,
    bgcolor: 'background.default',
  },
  card: {
    width: '100%',
    maxWidth: 560,
  },
  content: {
    p: { xs: 3, sm: 4 },
  },
  header: {
    gap: 0.5,
    mb: 2,
  },
  progress: {
    mb: 3,
  },
  alert: {
    mb: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 2,
    mt: 4,
  },
  skip: {
    display: 'block',
    mx: 'auto',
    mt: 1.5,
  },
} satisfies Record<string, SxProps<Theme>>;
