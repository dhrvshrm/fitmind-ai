import type { SxProps, Theme } from '@mui/material';

export const voiceRecorderStyles = {
  card: {
    p: { xs: 2.5, sm: 3 },
    borderRadius: 3,
    textAlign: 'center',
  },
  title: {
    fontWeight: 700,
  },
  hint: {
    mb: 2,
  },
  promptBox: {
    p: 1.5,
    mb: 2.5,
    borderRadius: 2,
    bgcolor: 'rgba(170, 59, 255, 0.06)',
    border: '1px dashed rgba(170, 59, 255, 0.35)',
    textAlign: 'left',
  },
  promptLabel: {
    fontWeight: 700,
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
  micButton: (recording: boolean): SxProps<Theme> => ({
    width: 88,
    height: 88,
    color: '#fff',
    background: recording
      ? 'linear-gradient(150deg, #ef4444 0%, #b91c1c 100%)'
      : 'linear-gradient(150deg, #aa3bff 0%, #7a1fd0 100%)',
    boxShadow: recording
      ? '0px 8px 22px rgba(239, 68, 68, 0.4)'
      : '0px 8px 22px rgba(170, 59, 255, 0.36)',
    '&:hover': {
      background: recording
        ? 'linear-gradient(150deg, #dc2626 0%, #991b1b 100%)'
        : 'linear-gradient(150deg, #9b2ef2 0%, #6a15bd 100%)',
    },
  }),
  micIcon: {
    fontSize: 36,
  },
  duration: {
    fontWeight: 700,
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
  alert: {
    mt: 2,
    textAlign: 'left',
  },
} as const;

/** Framer-motion waveform bar look (plain CSS, animated via motion props). */
export const waveformBarStyle = {
  width: 5,
  height: 28,
  borderRadius: 3,
  background: 'linear-gradient(180deg, #aa3bff 0%, #7a1fd0 100%)',
} as const;

export const WAVEFORM_BAR_COUNT = 7;
