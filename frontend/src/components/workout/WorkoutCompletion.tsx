import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { EmojiEventsRounded } from '@mui/icons-material';
import { animate, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useLogWorkout } from '../../hooks/queries/useWorkoutQueries';
import { resolveApiError } from '../../lib/apiClient';
import { STRINGS } from '../../constants/strings';
import { formatDuration } from '../../utils/date';
import type { Intensity, LoggedExercise, PersonalRecord, WorkoutLogResult } from '../../types/workout';
import { PROGRESSION_STRINGS } from '../../constants/progressionStrings';
import { workoutCompletionStyles as styles } from './WorkoutCompletion.styles';

const S = STRINGS.workout.completion;
const R = PROGRESSION_STRINGS.records;

function recordText(record: PersonalRecord): string {
  return R[record.kind](record.name, record.value, record.previous);
}
const INTENSITIES: Intensity[] = ['low', 'medium', 'high'];

/** Animated 0 -> xp counter shown after a successful save. */
function XpCounter({ xp }: { xp: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(0, xp, {
      duration: 0.9,
      ease: 'easeOut',
      onUpdate: (value) => setDisplay(Math.round(value)),
    });
    return () => controls.stop();
  }, [xp]);

  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <Typography component="div" sx={styles.xpText}>
        {S.xpEarned(display)}
      </Typography>
    </motion.div>
  );
}

type WorkoutCompletionProps = {
  open: boolean;
  onClose: () => void;
  /** What was done per exercise, with logged weight and reps where tracked. */
  summary: LoggedExercise[];
  durationSeconds: number;
  /** Called once the workout is saved on the backend. */
  onLogged: (result: WorkoutLogResult) => void;
};

/**
 * Post-workout dialog: summary + duration + intensity rating, then saves via
 * `POST /workouts/log` and reveals the XP award (with level-ups and badges).
 */
export function WorkoutCompletion({
  open,
  onClose,
  summary,
  durationSeconds,
  onLogged,
}: WorkoutCompletionProps) {
  const [intensity, setIntensity] = useState<Intensity>('medium');
  const logWorkout = useLogWorkout();
  const isSaving = logWorkout.isPending;
  const [result, setResult] = useState<WorkoutLogResult | null>(null);

  async function handleSave() {
    try {
      const logResult = await logWorkout.mutateAsync({
        exercises: summary,
        duration_minutes: Math.max(1, Math.round(durationSeconds / 60)),
        intensity,
      });
      setResult(logResult);
      toast.success(S.saved);
      onLogged(logResult);
    } catch (error) {
      toast.error(resolveApiError(error, S.saveError));
    }
  }

  function handleClose() {
    setResult(null);
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>{S.title}</DialogTitle>
      <DialogContent>
        {result ? (
          <Box sx={styles.resultBox}>
            {result.xp_earned > 0 ? (
              <XpCounter xp={result.xp_earned} />
            ) : (
              <Typography variant="body2" color="text.secondary" sx={styles.totalXp}>
                {S.xpAlreadyEarned}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary" sx={styles.totalXp}>
              {S.totalXp(result.total_xp)}
            </Typography>
            {result.leveled_up && (
              <Typography variant="subtitle1" sx={styles.levelUp}>
                {S.levelUp(result.new_level)}
              </Typography>
            )}
            {(result.new_records ?? []).length > 0 && (
              <Box sx={styles.records}>
                <Stack sx={styles.recordsTitle}>
                  <EmojiEventsRounded fontSize="small" />
                  <Typography variant="subtitle2">{R.title}</Typography>
                </Stack>
                {(result.new_records ?? []).map((record) => (
                  <Typography key={`${record.exercise_id}-${record.kind}`} variant="body2">
                    {recordText(record)}
                  </Typography>
                ))}
              </Box>
            )}
            {result.new_badges.map((badge) => (
              <Chip
                key={badge}
                label={S.newBadge(badge)}
                color="warning"
                sx={styles.badgeChip}
              />
            ))}
          </Box>
        ) : (
          <>
            <Typography variant="subtitle2" sx={styles.sectionLabel}>
              {S.summaryTitle}
            </Typography>
            {summary.map((item, index) => (
              <Box key={item.name}>
                {index > 0 && <Divider />}
                <Stack sx={styles.summaryRow}>
                  <Typography variant="body2" sx={styles.summaryName}>
                    {item.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {S.setsDone(item.sets_completed, item.sets_total)}
                  </Typography>
                </Stack>
              </Box>
            ))}

            <Typography variant="subtitle2" sx={styles.sectionLabel}>
              {S.durationLabel}
            </Typography>
            <Chip label={formatDuration(durationSeconds)} sx={styles.durationChip} />

            <Typography variant="subtitle2" sx={styles.sectionLabel}>
              {S.intensityLabel}
            </Typography>
            <Stack sx={styles.intensityRow}>
              {INTENSITIES.map((level) => (
                <Chip
                  key={level}
                  label={S.intensities[level]}
                  color={intensity === level ? 'primary' : 'default'}
                  variant={intensity === level ? 'filled' : 'outlined'}
                  onClick={() => setIntensity(level)}
                />
              ))}
            </Stack>
          </>
        )}
      </DialogContent>
      <DialogActions>
        {result ? (
          <Button variant="contained" onClick={handleClose} fullWidth>
            {S.done}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isSaving}
            fullWidth
            startIcon={isSaving ? <CircularProgress size={18} color="inherit" /> : null}
          >
            {isSaving ? S.saving : S.save}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
