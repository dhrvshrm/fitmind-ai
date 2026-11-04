import { useState, type FormEvent } from 'react';
import { Box, Button, CircularProgress, Tab, Tabs, TextField } from '@mui/material';
import { AutoAwesomeRounded } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { STRINGS } from '../../constants/strings';
import { useEstimateMeal } from '../../hooks/queries/useNutritionQueries';
import { resolveApiError } from '../../lib/apiClient';
import type { MealEstimate } from '../../types/nutrition';
import { SectionCard } from '../ui/SectionCard';
import { EstimateReview } from './EstimateReview';
import { MealForm } from './MealForm';
import { quickLogStyles as styles } from './QuickLog.styles';

const S = STRINGS.nutrition.quickLog;
const MIN_TEXT_LENGTH = 2;

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
            helperText={S.subtitle}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              // Enter submits; Shift+Enter adds a new line.
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                calculate();
              }
            }}
            disabled={estimateMeal.isPending}
            slotProps={{ htmlInput: { maxLength: 300 } }}
          />
          <Box sx={styles.actions}>
            <Button
              type="submit"
              variant="contained"
              disabled={estimateMeal.isPending}
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
