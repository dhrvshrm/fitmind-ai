import { useState } from 'react';
import { Button, CircularProgress, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { TimerRounded } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { STRINGS } from '../../constants/strings';
import { useStartQuickSession } from '../../hooks/queries/useWorkoutQueries';
import { resolveApiError } from '../../lib/apiClient';
import type { QuickPlace, QuickSessionPayload } from '../../types/workout';
import { SectionCard } from '../ui/SectionCard';
import { quickSessionCardStyles as styles } from './QuickSessionCard.styles';

const S = STRINGS.workout.quick;
const MINUTE_OPTIONS: QuickSessionPayload['minutes'][] = [10, 15, 20];
const PLACES: QuickPlace[] = ['home', 'gym'];

/** "Short on time?": replace today's session with a 10, 15 or 20 minute circuit. */
export function QuickSessionCard() {
  const [minutes, setMinutes] = useState<QuickSessionPayload['minutes']>(15);
  const [place, setPlace] = useState<QuickPlace>('home');
  const start = useStartQuickSession();

  async function handleStart() {
    try {
      await start.mutateAsync({ minutes, place });
      toast.success(S.started);
    } catch (error) {
      toast.error(resolveApiError(error, S.error));
    }
  }

  return (
    <SectionCard title={S.title} subtitle={S.subtitle}>
      <Stack sx={styles.controls}>
        <Stack sx={styles.group}>
          <Typography variant="caption" color="text.secondary">
            {S.minutesLabel}
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={minutes}
            onChange={(_, value) => value && setMinutes(value)}
            aria-label={S.minutesLabel}
          >
            {MINUTE_OPTIONS.map((m) => (
              <ToggleButton key={m} value={m}>
                {S.minutes(m)}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>
        <Stack sx={styles.group}>
          <Typography variant="caption" color="text.secondary">
            {S.placeLabel}
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={place}
            onChange={(_, value) => value && setPlace(value)}
            aria-label={S.placeLabel}
          >
            {PLACES.map((p) => (
              <ToggleButton key={p} value={p}>
                {S[p]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>
        <Button
          variant="outlined"
          onClick={handleStart}
          disabled={start.isPending}
          startIcon={start.isPending ? <CircularProgress size={18} color="inherit" /> : <TimerRounded />}
          sx={styles.start}
        >
          {S.start}
        </Button>
      </Stack>
    </SectionCard>
  );
}
