import { Box, Checkbox, Chip, Paper, Stack, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { STRINGS } from '../../constants/strings';
import { DIFFICULTY_CHIP_COLOR, getDifficultyBucket } from '../../utils/workout';
import type { Exercise } from '../../types/workout';
import { exerciseLoggerStyles as styles } from './ExerciseLogger.styles';

const S = STRINGS.workout;

type ExerciseLoggerProps = {
  exercise: Exercise;
  /** Indices (0-based) of completed sets. */
  doneSets: ReadonlySet<number>;
  onToggleSet: (setIndex: number) => void;
};

/**
 * One exercise with a checkbox per set. When every set is ticked the card
 * pulses green and shows a "Done" chip (parent syncs completion to the API).
 */
export function ExerciseLogger({ exercise, doneSets, onToggleSet }: ExerciseLoggerProps) {
  const setCount = Math.max(1, exercise.sets);
  const completed = doneSets.size >= setCount;
  const bucket = getDifficultyBucket(exercise.difficulty);

  return (
    <motion.div
      // Celebration pulse each time the exercise flips to complete.
      animate={completed ? { scale: [1, 1.03, 1] } : { scale: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      <Paper variant="outlined" sx={styles.card(completed)}>
        <Stack sx={styles.headerRow}>
          <Typography variant="body1" sx={styles.name(completed)} noWrap>
            {exercise.name}
          </Typography>
          {completed && (
            <motion.div
              initial={{ scale: 0, rotate: -12 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            >
              <Chip label={S.logger.exerciseDone} color="success" size="small" sx={styles.doneChip} />
            </motion.div>
          )}
        </Stack>

        <Stack sx={styles.metaRow}>
          <Typography variant="body2" sx={styles.setsReps}>
            {S.exercise.setsReps(exercise.sets, exercise.reps)}
          </Typography>
          <Chip label={`${S.exercise.restLabel} ${exercise.rest}`} size="small" variant="outlined" />
          <Chip
            label={exercise.difficulty}
            size="small"
            color={DIFFICULTY_CHIP_COLOR[bucket]}
            variant="outlined"
          />
        </Stack>

        <Stack sx={styles.setsRow}>
          {Array.from({ length: setCount }, (_, index) => (
            <Box key={index} sx={styles.setCheck}>
              <Checkbox
                checked={doneSets.has(index)}
                onChange={() => onToggleSet(index)}
                color="success"
                slotProps={{
                  input: { 'aria-label': S.logger.setAria(exercise.name, index + 1) },
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={styles.setLabel}>
                {S.logger.setLabel(index + 1)}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Paper>
    </motion.div>
  );
}
