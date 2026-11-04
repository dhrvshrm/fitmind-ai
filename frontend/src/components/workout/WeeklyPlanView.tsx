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
import { HotelRounded } from '@mui/icons-material';
import { ExerciseCard } from './ExerciseCard';
import { STRINGS } from '../../constants/strings';
import { getWorkoutTypeMeta } from '../../constants/workout';
import type { WorkoutDay } from '../../types/workout';
import { SectionCard } from '../ui/SectionCard';
import { EmptyState } from '../ui/EmptyState';
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
  const selectedMeta = selected ? getWorkoutTypeMeta(selected.workout_type) : null;

  return (
    <SectionCard title={S.title}>
      <Box sx={styles.grid}>
        {week.map((day) => {
          const meta = getWorkoutTypeMeta(day.workout_type);
          const Icon = meta.icon;
          const isToday = day.day.toLowerCase() === TODAY_NAME.toLowerCase();
          return (
            <Paper
              key={day.day}
              variant="outlined"
              role="button"
              tabIndex={0}
              aria-label={S.dayAria(day.day, meta.label)}
              onClick={() => setSelected(day)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelected(day);
                }
              }}
              sx={styles.dayCard(meta.tone, isToday)}
            >
              <Typography variant="body2" sx={styles.dayName}>
                {day.day.slice(0, 3)}
              </Typography>
              <Icon fontSize="small" sx={styles.typeIcon(meta.tone)} />
              <Typography variant="caption" sx={styles.typeLabel(meta.tone)}>
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
        {selected && selectedMeta && (
          <>
            <DialogTitle>
              <Stack sx={styles.dialogTitleRow}>
                {selected.day}
                <Chip label={selectedMeta.label} size="small" sx={styles.typeChip(selectedMeta.tone)} />
              </Stack>
            </DialogTitle>
            <DialogContent>
              {selected.exercises.length === 0 ? (
                <EmptyState
                  icon={HotelRounded}
                  title={STRINGS.workout.today.restDayTitle}
                  description={STRINGS.workout.today.restDay}
                  compact
                />
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
    </SectionCard>
  );
}
