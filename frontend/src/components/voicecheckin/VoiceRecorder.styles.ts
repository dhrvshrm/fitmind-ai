import { alpha, type SxProps, type Theme } from '@mui/material';

export const WAVEFORM_BAR_COUNT = 7;

export const voiceRecorderStyles = {
  body: {
    textAlign: 'center',
  },
  hint: {
    mb: 2,
  },
  promptBox: (theme: Theme) => ({
    p: 1.5,
    mb: 2.5,
    borderRadius: 1,
    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'light' ? 0.06 : 0.1),
    border: '1px dashed',
    borderColor: alpha(theme.palette.primary.main, 0.35),
    textAlign: 'left',
  }),
  promptLabel: {
    fontWeight: 600,
    color: 'primary.main',
    display: 'block',
    mb: 0.5,
  },
  promptText: {
    fontStyle: 'italic',
  },
  micWrap: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    my: 1,
  },
  pulseRing: (theme: Theme) => ({
    position: 'absolute',
    inset: -10,
    borderRadius: '50%',
    border: '3px solid',
    borderColor: alpha(theme.palette.error.main, 0.45),
    pointerEvents: 'none',
  }),
  micButton: (recording: boolean): SxProps<Theme> => ({
    width: 88,
    height: 88,
    borderRadius: '50%',
    color: recording ? 'error.contrastText' : 'primary.contrastText',
    bgcolor: recording ? 'error.main' : 'primary.main',
    '&:hover': {
      bgcolor: recording ? 'error.dark' : 'primary.dark',
    },
    '&.Mui-disabled': {
      color: 'primary.contrastText',
      bgcolor: 'primary.main',
      opacity: 0.6,
    },
  }),
  micIcon: {
    fontSize: 36,
  },
  duration: {
    fontVariantNumeric: 'tabular-nums',
    mt: 1.5,
  },
  statusText: {
    mt: 1,
  },
  waveform: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0.75,
    height: 36,
    mt: 2,
  },
  waveformBar: {
    width: 5,
    height: 28,
    borderRadius: 0.25,
    bgcolor: 'primary.main',
  },
  alert: {
    mt: 2,
    textAlign: 'left',
  },
};
