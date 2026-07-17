import { useState } from 'react';
import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { ExerciseCard } from './ExerciseCard';
import { STRINGS } from '../../constants/strings';
import { getWorkoutTypeMeta } from '../../constants/workout';
import type { WorkoutDay } from '../../types/workout';
import { weeklyPlanViewStyles as styles } from './WeeklyPlanView.styles';

const S = STRINGS.workout.week;

/** Weekday name for "today" matching the backend's Monday-first convention. */
const TODAY_NAME = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
][new Date().getDay()];

type WeeklyPlanViewProps = {
  week: WorkoutDay[];
};

/** Responsive 7-day grid; each card is color-coded by workout type and opens details. */
export function WeeklyPlanView({ week }: WeeklyPlanViewProps) {
  const [selected, setSelected] = useState<WorkoutDay | null>(null);

  return (
    <Paper variant="outlined" sx={styles.card}>
      <Typography variant="h6" sx={styles.title}>
        {S.title}
      </Typography>

      <Box sx={styles.grid}>
        {week.map((day) => {
          const meta = getWorkoutTypeMeta(day.workout_type);
          const Icon = meta.icon;
          const isToday = day.day.toLowerCase() === TODAY_NAME.toLowerCase();
          return (
            <Paper
              key={day.day}
              variant="outlined"
              onClick={() => setSelected(day)}
              sx={styles.dayCard(meta.color, isToday)}
            >
              <Typography variant="body2" sx={styles.dayName}>
                {day.day.slice(0, 3)}
              </Typography>
              <Icon fontSize="small" sx={styles.typeIcon(meta.color)} />
              <Typography variant="caption" sx={styles.typeLabel(meta.color)}>
                {meta.label}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={styles.exerciseCount}>
                {S.exercisesCount(day.exercises.length)}
              </Typography>
            </Paper>
          );
        })}
      </Box>

      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} fullWidth maxWidth="sm">
        {selected && (
          <>
            <DialogTitle>
              <Stack sx={styles.dialogTitleRow}>
                {selected.day}
                <Chip
                  label={getWorkoutTypeMeta(selected.workout_type).label}
                  size="small"
                  sx={styles.typeChip(getWorkoutTypeMeta(selected.workout_type).color)}
                />
              </Stack>
            </DialogTitle>
            <DialogContent>
              {selected.exercises.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={styles.dialogRest}>
                  {STRINGS.workout.today.restDay}
                </Typography>
              ) : (
                <Box sx={styles.dialogList}>
                  {selected.exercises.map((exercise) => (
                    <ExerciseCard key={exercise.name} exercise={exercise} />
                  ))}
                </Box>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>
    </Paper>
  );
}
