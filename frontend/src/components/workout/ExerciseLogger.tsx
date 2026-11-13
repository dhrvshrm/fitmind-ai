import { Box, Checkbox, Chip, IconButton, InputAdornment, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { InfoOutlined, TrendingUpRounded } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { STRINGS } from '../../constants/strings';
import { PROGRESSION_STRINGS } from '../../constants/progressionStrings';
import { DIFFICULTY_CHIP_COLOR, getDifficultyBucket } from '../../utils/workout';
import { targetText, tracksSets, type SetDraft } from '../../utils/progression';
import type { Exercise, Felt } from '../../types/workout';
import { exerciseLoggerStyles as styles } from './ExerciseLogger.styles';

const S = STRINGS.workout;
const P = PROGRESSION_STRINGS;
const FELT: Felt[] = ['easy', 'right', 'hard'];

type ExerciseLoggerProps = {
  exercise: Exercise;
  /** One entry per set: weight and reps typed so far, and whether it's done. */
  drafts: SetDraft[];
  onChange: (setIndex: number, patch: Partial<SetDraft>) => void;
  felt?: Felt;
  onFelt: (felt: Felt) => void;
  /** Opens how-to details for catalogue exercises. */
  onDetails?: () => void;
};

/**
 * One exercise in today's session. Catalogue exercises with a rep range get a
 * row per set (weight, reps, done) pre-filled from today's target; timed or
 * older exercises keep a simple tick per set. When every set is ticked the card
 * pulses green and shows a "Done" chip.
 */
export function ExerciseLogger({ exercise, drafts, onChange, felt, onFelt, onDetails }: ExerciseLoggerProps) {
  const completed = drafts.length > 0 && drafts.every((d) => d.done);
  const anyDone = drafts.some((d) => d.done);
  const bucket = getDifficultyBucket(exercise.difficulty);
  const target = exercise.target;
  const detailed = tracksSets(exercise);
  const loaded = Boolean(target?.loaded);

  return (
    <motion.div
      // Celebration pulse each time the exercise flips to complete.
      animate={completed ? { scale: [1, 1.02, 1] } : { scale: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      <Paper variant="outlined" sx={styles.card(completed)}>
        <Stack sx={styles.headerRow}>
          <Stack sx={styles.titleRow}>
            <Typography variant="body1" sx={styles.name(completed)} noWrap>
              {exercise.name}
            </Typography>
            {onDetails && exercise.exercise_id && (
              <Tooltip title={S.exercise.detailsAria(exercise.name)}>
                <IconButton size="small" color="primary" aria-label={S.exercise.detailsAria(exercise.name)} onClick={onDetails}>
                  <InfoOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
          {completed && (
            <motion.div
              initial={{ scale: 0, rotate: -12 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            >
              <Chip label={S.logger.exerciseDone} color="success" size="small" />
            </motion.div>
          )}
        </Stack>

        <Stack sx={styles.metaRow}>
          <Typography variant="body2" sx={styles.setsReps}>
            {S.exercise.setsReps(exercise.sets, exercise.reps)}
          </Typography>
          <Chip label={S.exercise.rest(exercise.rest)} size="small" variant="outlined" />
          <Chip label={exercise.difficulty} size="small" color={DIFFICULTY_CHIP_COLOR[bucket]} variant="outlined" />
        </Stack>

        {target && detailed && (
          <Box sx={styles.target(target.action)}>
            <Stack sx={styles.targetHead}>
              <TrendingUpRounded fontSize="small" />
              <Typography variant="caption" sx={styles.targetChip}>
                {P.chips[target.action]}
              </Typography>
            </Stack>
            <Typography variant="body2">{targetText(target)}</Typography>
            {target.last && (
              <Typography variant="caption" color="text.secondary" component="p">
                {P.target.last(target.last.sets, loaded)}
              </Typography>
            )}
          </Box>
        )}

        {exercise.effort && (
          <Typography variant="caption" color="text.secondary" component="p" sx={styles.effort}>
            {exercise.effort}
          </Typography>
        )}

        {detailed ? (
          <Box sx={styles.setTable}>
            {drafts.map((draft, index) => (
              <Stack key={index} sx={styles.setRow(draft.done)}>
                <Typography variant="caption" color="text.secondary" sx={styles.setIndex}>
                  {P.logger.setLabel(index + 1)}
                </Typography>
                {loaded && (
                  <TextField
                    size="small"
                    value={draft.weight}
                    onChange={(e) => onChange(index, { weight: e.target.value })}
                    sx={styles.numberField}
                    slotProps={{
                      htmlInput: { inputMode: 'decimal', 'aria-label': P.logger.weightAria(exercise.name, index + 1) },
                      input: { endAdornment: <InputAdornment position="end">{P.logger.weight}</InputAdornment> },
                    }}
                  />
                )}
                <TextField
                  size="small"
                  value={draft.reps}
                  onChange={(e) => onChange(index, { reps: e.target.value })}
                  sx={styles.numberField}
                  slotProps={{
                    htmlInput: { inputMode: 'numeric', 'aria-label': P.logger.repsAria(exercise.name, index + 1) },
                    input: { endAdornment: <InputAdornment position="end">{P.logger.reps}</InputAdornment> },
                  }}
                />
                <Checkbox
                  checked={draft.done}
                  onChange={() => onChange(index, { done: !draft.done })}
                  color="success"
                  slotProps={{ input: { 'aria-label': P.logger.doneAria(exercise.name, index + 1) } }}
                />
              </Stack>
            ))}
          </Box>
        ) : (
          <Stack sx={styles.setsRow}>
            {drafts.map((draft, index) => (
              <Box key={index} sx={styles.setCheck}>
                <Checkbox
                  checked={draft.done}
                  onChange={() => onChange(index, { done: !draft.done })}
                  color="success"
                  slotProps={{ input: { 'aria-label': S.logger.setAria(exercise.name, index + 1) } }}
                />
                <Typography variant="caption" color="text.secondary" sx={styles.setLabel}>
                  {S.logger.setLabel(index + 1)}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}

        {detailed && anyDone && (
          <Stack sx={styles.feltRow}>
            <Typography variant="caption" color="text.secondary">
              {P.logger.feltLabel}
            </Typography>
            {FELT.map((value) => (
              <Chip
                key={value}
                size="small"
                label={P.logger.felt[value]}
                color={felt === value ? 'primary' : 'default'}
                variant={felt === value ? 'filled' : 'outlined'}
                onClick={() => onFelt(value)}
              />
            ))}
          </Stack>
        )}
      </Paper>
    </motion.div>
  );
}
