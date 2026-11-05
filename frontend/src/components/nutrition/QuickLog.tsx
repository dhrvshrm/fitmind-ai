import { useState, type FormEvent } from 'react';
import { Box, Button, CircularProgress, Tab, Tabs, TextField, Typography } from '@mui/material';
import { AutoAwesomeRounded, MicRounded, StopRounded } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { STRINGS } from '../../constants/strings';
import { useEstimateMeal, useTranscribeMeal } from '../../hooks/queries/useNutritionQueries';
import { useVoiceRecording } from '../../hooks/useVoiceRecording';
import { resolveApiError } from '../../lib/apiClient';
import type { MealEstimate } from '../../types/nutrition';
import { SectionCard } from '../ui/SectionCard';
import { EstimateReview } from './EstimateReview';
import { MealForm } from './MealForm';
import { quickLogStyles as styles } from './QuickLog.styles';

const S = STRINGS.nutrition.quickLog;
const MIN_TEXT_LENGTH = 2;
const MAX_TEXT_LENGTH = 1000;

type Mode = 'describe' | 'manual';

/**
 * The main way to log food: describe the meal in words, review the
 * calculated foods, save. Manual macro entry stays available as a tab.
 */
export function QuickLog() {
  const [mode, setMode] = useState<Mode>('describe');
  const [text, setText] = useState('');
  const [estimate, setEstimate] = useState<MealEstimate | null>(null);
  const estimateMeal = useEstimateMeal();
  const transcribe = useTranscribeMeal();
  const recorder = useVoiceRecording();
  const recording = recorder.status === 'recording';
  const busy = estimateMeal.isPending || transcribe.isPending || recorder.status === 'requesting';

  async function toggleRecording() {
    if (!recording) {
      await recorder.startRecording();
      return;
    }
    const audio = await recorder.stopRecording();
    if (!audio) return;
    try {
      const spoken = await transcribe.mutateAsync(audio);
      // Added to anything already typed, so speaking can continue a description.
      setText((prev) => {
        const typed = prev.trim();
        return (typed ? `${typed}, ${spoken}` : spoken).slice(0, MAX_TEXT_LENGTH);
      });
    } catch (error) {
      toast.error(resolveApiError(error, S.transcribeError));
    }
  }

  async function calculate() {
    if (text.trim().length < MIN_TEXT_LENGTH) {
      toast.error(S.tooShort);
      return;
    }
    try {
      setEstimate(await estimateMeal.mutateAsync(text.trim()));
    } catch (error) {
      toast.error(resolveApiError(error, S.error));
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    calculate();
  }

  function handleDone() {
    setEstimate(null);
    setText('');
  }

  return (
    <SectionCard title={estimate ? STRINGS.nutrition.review.title : S.title}>
      {!estimate && (
        <Tabs value={mode} onChange={(_, value: Mode) => setMode(value)} sx={styles.tabs}>
          <Tab value="describe" label={S.tabDescribe} />
          <Tab value="manual" label={S.tabManual} />
        </Tabs>
      )}

      {estimate ? (
        <EstimateReview estimate={estimate} onDone={handleDone} />
      ) : mode === 'describe' ? (
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            fullWidth
            multiline
            minRows={2}
            maxRows={5}
            label={S.label}
            placeholder={S.placeholder}
            helperText={recording ? S.voiceHint : recorder.error ?? S.subtitle}
            error={Boolean(recorder.error)}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              // Enter submits; Shift+Enter adds a new line.
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                calculate();
              }
            }}
            disabled={busy || recording}
            slotProps={{ htmlInput: { maxLength: MAX_TEXT_LENGTH } }}
          />
          <Box sx={styles.actions}>
            {transcribe.isPending && (
              <Typography variant="body2" color="text.secondary" sx={styles.status}>
                {S.transcribing}
              </Typography>
            )}
            <Button
              variant={recording ? 'contained' : 'outlined'}
              color={recording ? 'error' : 'primary'}
              onClick={toggleRecording}
              disabled={estimateMeal.isPending || transcribe.isPending}
              aria-label={recording ? S.stopAria : S.speakAria}
              startIcon={
                transcribe.isPending ? (
                  <CircularProgress size={18} color="inherit" />
                ) : recording ? (
                  <StopRounded />
                ) : (
                  <MicRounded />
                )
              }
            >
              {recording ? S.stop(recorder.duration) : S.speak}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={busy || recording}
              startIcon={
                estimateMeal.isPending ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <AutoAwesomeRounded />
                )
              }
            >
              {estimateMeal.isPending ? S.estimating : S.estimate}
            </Button>
          </Box>
        </Box>
      ) : (
        <MealForm />
      )}
    </SectionCard>
  );
}
