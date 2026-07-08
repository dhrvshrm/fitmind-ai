import type { SxProps, Theme } from '@mui/material';

export const onboardingFlowStyles = {
  root: {
    minHeight: '100svh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    p: 2,
    background: 'linear-gradient(160deg, #f7f6fb 0%, #efe6fb 100%)',
  },
  card: {
    width: '100%',
    maxWidth: 560,
    borderRadius: 3,
  },
  content: {
    p: { xs: 3, sm: 4 },
  },
  header: {
    mb: 2,
  },
  brand: {
    fontWeight: 700,
  },
  progress: {
    height: 8,
    borderRadius: 4,
    mb: 3,
  },
  alert: {
    mb: 2,
  },
  actions: {
    mt: 4,
  },
} satisfies Record<string, SxProps<Theme>>;
