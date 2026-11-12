import type { SxProps, Theme } from '@mui/material';

export const deskRoutinePlayerStyles = {
  title: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 2,
  },
  thumb: {
    width: 48,
    height: 48,
    bgcolor: 'action.hover',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepName: {
    mb: 1.5,
  },
  clock: {
    textAlign: 'center',
    mt: 2,
  },
  clockNumber: {
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1,
  },
  side: {
    textAlign: 'center',
    mt: 0.5,
  },
  progress: {
    my: 2,
    height: 6,
    borderRadius: 3,
  },
  cue: {
    mb: 1,
  },
  done: {
    alignItems: 'center',
    textAlign: 'center',
    gap: 1,
    py: 4,
  },
  doneIcon: {
    fontSize: 56,
  },
  actions: {
    justifyContent: 'center',
    gap: 1,
    px: 3,
    pb: 2.5,
  },
} satisfies Record<string, SxProps<Theme>>;
