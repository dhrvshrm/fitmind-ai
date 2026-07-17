import { Box, Checkbox, Chip, IconButton, Link, Paper, Stack, Typography } from '@mui/material';
import { PlayCircleOutlineRounded } from '@mui/icons-material';
import { STRINGS } from '../../constants/strings';
import { DIFFICULTY_CHIP_COLOR, getDifficultyBucket } from '../../utils/workout';
import type { Exercise } from '../../types/workout';
import { exerciseCardStyles as styles } from './ExerciseCard.styles';

const S = STRINGS.workout.exercise;

type ExerciseCardProps = {
  exercise: Exercise;
  /** When provided, renders a completion checkbox (today's workout view). */
  checked?: boolean;
  onToggle?: () => void;
};

/** One exercise row: name, sets × reps, rest, color-coded difficulty, video link. */
export function ExerciseCard({ exercise, checked = false, onToggle }: ExerciseCardProps) {
  const bucket = getDifficultyBucket(exercise.difficulty);
  const done = Boolean(onToggle) && checked;

  return (
    <Paper variant="outlined" sx={styles.card(done)}>
      {onToggle && (
        <Checkbox
          checked={checked}
          onChange={onToggle}
          slotProps={{ input: { 'aria-label': S.doneAria(exercise.name) } }}
        />
      )}

      <Box sx={styles.body}>
        <Typography variant="body1" sx={styles.name(done)} noWrap>
          {exercise.name}
        </Typography>
        <Stack sx={styles.metaRow}>
          <Typography variant="body2" sx={styles.setsReps}>
            {S.setsReps(exercise.sets, exercise.reps)}
          </Typography>
          <Chip label={`${S.restLabel} ${exercise.rest}`} size="small" variant="outlined" />
          <Chip
            label={exercise.difficulty}
            size="small"
            color={DIFFICULTY_CHIP_COLOR[bucket]}
            variant="outlined"
          />
        </Stack>
      </Box>

      {exercise.video_url && (
        <IconButton
          component={Link}
          href={exercise.video_url}
          target="_blank"
          rel="noopener"
          aria-label={S.videoAria}
          color="primary"
        >
          <PlayCircleOutlineRounded />
        </IconButton>
      )}
    </Paper>
  );
}
