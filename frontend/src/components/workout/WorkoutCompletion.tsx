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
import { animate, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { workoutService } from '../../services/workoutService';
import { resolveApiError } from '../../lib/apiClient';
import { STRINGS } from '../../constants/strings';
import { formatDuration } from '../../utils/date';
import type {
  Exercise,
  Intensity,
  LoggedExercise,
  WorkoutLogResult,
} from '../../types/workout';
import { workoutCompletionStyles as styles } from './WorkoutCompletion.styles';

const S = STRINGS.workout.completion;
const INTENSITIES: Intensity[] = ['low', 'medium', 'high'];

/** Animated 0 → xp counter shown after a successful save. */
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
  exercises: Exercise[];
  /** Completed set indices per exercise name. */
  doneSetsByExercise: Record<string, ReadonlySet<number>>;
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
  exercises,
  doneSetsByExercise,
  durationSeconds,
  onLogged,
}: WorkoutCompletionProps) {
  const [intensity, setIntensity] = useState<Intensity>('medium');
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<WorkoutLogResult | null>(null);

  const summary: LoggedExercise[] = exercises.map((exercise) => ({
    name: exercise.name,
    sets_completed: doneSetsByExercise[exercise.name]?.size ?? 0,
    sets_total: Math.max(1, exercise.sets),
  }));

  async function handleSave() {
    setIsSaving(true);
    try {
      const logResult = await workoutService.logWorkout({
        exercises: summary,
        duration_minutes: Math.max(1, Math.round(durationSeconds / 60)),
        intensity,
      });
      setResult(logResult);
      toast.success(S.saved);
      onLogged(logResult);
    } catch (error) {
      toast.error(resolveApiError(error, S.saveError));
    } finally {
      setIsSaving(false);
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
            <XpCounter xp={result.xp_earned} />
            <Typography variant="body2" color="text.secondary" sx={styles.totalXp}>
              {S.totalXp(result.total_xp)}
            </Typography>
            {result.leveled_up && (
              <Typography variant="subtitle1" sx={styles.levelUp}>
                {S.levelUp(result.new_level)}
              </Typography>
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
