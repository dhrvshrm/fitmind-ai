import { useState } from 'react';
import { Alert, Box, Chip, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { ExerciseCard } from './ExerciseCard';
import { STRINGS } from '../../constants/strings';
import type { Exercise } from '../../types/workout';
import { todayWorkoutStyles as styles } from './TodayWorkout.styles';

const S = STRINGS.workout.today;

type TodayWorkoutProps = {
  exercises: Exercise[];
  loading: boolean;
  error: string | null;
};

/**
 * Today's exercise list with completion checkboxes. Checked state is local for
 * now; Day 8 sends it to `POST /workouts/log`.
 */
export function TodayWorkout({ exercises, loading, error }: TodayWorkoutProps) {
  const [done, setDone] = useState<Set<string>>(new Set());

  function toggle(name: string) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <Paper variant="outlined" sx={styles.card}>
      <Stack sx={styles.headerRow}>
        <Typography variant="h6" sx={styles.title}>
          {S.title}
        </Typography>
        {!loading && !error && exercises.length > 0 && (
          <Chip
            label={S.progress(done.size, exercises.length)}
            color={done.size === exercises.length ? 'success' : 'primary'}
            variant="outlined"
            sx={styles.progressChip}
          />
        )}
      </Stack>

      {loading && <Skeleton variant="rounded" height={200} />}
      {!loading && error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && exercises.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={styles.restDay}>
          {S.restDay}
        </Typography>
      )}

      {!loading && !error && exercises.length > 0 && (
        <Box sx={styles.list}>
          {exercises.map((exercise) => (
            <ExerciseCard
              key={exercise.name}
              exercise={exercise}
              checked={done.has(exercise.name)}
              onToggle={() => toggle(exercise.name)}
            />
          ))}
        </Box>
      )}
    </Paper>
  );
}
