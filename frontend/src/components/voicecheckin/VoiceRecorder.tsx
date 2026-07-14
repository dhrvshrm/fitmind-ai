import { useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  IconButton,
  Paper,
  Typography,
} from '@mui/material';
import { MicRounded, StopRounded } from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useVoiceRecording } from '../../hooks/useVoiceRecording';
import { voiceService } from '../../services/voiceService';
import { resolveApiError } from '../../lib/apiClient';
import { STRINGS } from '../../constants/strings';
import { formatDuration } from '../../utils/date';
import { getRandomPrompt } from '../../utils/voiceCheckin';
import type { VoiceCheckinResult } from '../../types/voiceCheckin';
import {
  voiceRecorderStyles as styles,
  waveformBarStyle,
  WAVEFORM_BAR_COUNT,
} from './VoiceRecorder.styles';

const S = STRINGS.voiceCheckin.recorder;

/** Animated bars shown while the mic is live. */
function Waveform() {
  return (
    <Box sx={styles.waveform}>
      {Array.from({ length: WAVEFORM_BAR_COUNT }, (_, index) => (
        <motion.div
          key={index}
          style={waveformBarStyle}
          animate={{ scaleY: [0.35, 1, 0.35] }}
          transition={{
            repeat: Infinity,
            duration: 0.9,
            delay: index * 0.1,
            ease: 'easeInOut',
          }}
        />
      ))}
    </Box>
  );
}

type VoiceRecorderProps = {
  /** Called with the analysis once the backend has processed the audio. */
  onResult: (result: VoiceCheckinResult) => void;
};

/**
 * Records audio via MediaRecorder and uploads it for mood analysis.
 * Stop doubles as "send": stopping the recording immediately uploads it.
 */
export function VoiceRecorder({ onResult }: VoiceRecorderProps) {
  const { status, duration, error, startRecording, stopRecording } =
    useVoiceRecording();
  const [isUploading, setIsUploading] = useState(false);
  // Random speaking template; re-rolled after each check-in for variety.
  const [prompt, setPrompt] = useState(() => getRandomPrompt());

  const isRecording = status === 'recording';
  const isBusy = status === 'requesting' || isUploading;

  async function handleStop() {
    const blob = await stopRecording();
    if (!blob) return;

    setIsUploading(true);
    try {
      const result = await voiceService.recordAndAnalyze(blob);
      toast.success(S.success);
      onResult(result);
      setPrompt((current) => getRandomPrompt(current));
    } catch (err) {
      toast.error(resolveApiError(err, S.error));
    } finally {
      setIsUploading(false);
    }
  }

  function handleToggle() {
    if (isRecording) void handleStop();
    else void startRecording();
  }

  return (
    <Paper variant="outlined" sx={styles.card}>
      <Typography variant="h6" sx={styles.title}>
        {S.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={styles.hint}>
        {S.hint}
      </Typography>

      <Box sx={styles.promptBox}>
        <Typography variant="caption" sx={styles.promptLabel}>
          {S.promptLabel}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={styles.promptText}>
          {prompt}
        </Typography>
      </Box>

      <Box sx={styles.micWrap}>
        {/* Pulsing ring while recording. */}
        {isRecording && (
          <motion.div
            style={{
              position: 'absolute',
              inset: -10,
              borderRadius: '50%',
              border: '3px solid rgba(239, 68, 68, 0.45)',
            }}
            animate={{ scale: [1, 1.18, 1], opacity: [0.9, 0.2, 0.9] }}
            transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
          />
        )}
        <IconButton
          aria-label={isRecording ? S.stopAria : S.startAria}
          onClick={handleToggle}
          disabled={isBusy}
          sx={styles.micButton(isRecording)}
        >
          {isUploading ? (
            <CircularProgress size={32} color="inherit" />
          ) : isRecording ? (
            <StopRounded sx={styles.micIcon} />
          ) : (
            <MicRounded sx={styles.micIcon} />
          )}
        </IconButton>
      </Box>

      {isRecording && (
        <>
          <Typography variant="h6" sx={styles.duration}>
            {formatDuration(duration)}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={styles.statusText}>
            {S.recording}
          </Typography>
          <Waveform />
        </>
      )}

      {isUploading && (
        <Typography variant="body2" color="text.secondary" sx={styles.statusText}>
          {S.uploading}
        </Typography>
      )}

      {error && (
        <Alert severity="error" sx={styles.alert}>
          {error}
        </Alert>
      )}
    </Paper>
  );
}
