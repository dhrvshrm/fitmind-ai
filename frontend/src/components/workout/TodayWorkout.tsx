import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  LinearProgress,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import {
  CheckCircleRounded,
  FlagRounded,
  HotelRounded,
  PauseRounded,
  PlayArrowRounded,
} from '@mui/icons-material';
import { AnimatePresence, motion } from 'framer-motion';
import { ExerciseLogger } from './ExerciseLogger';
import { ExerciseDetailDialog } from '../exercises/ExerciseDetailDialog';
import { WorkoutCompletion } from './WorkoutCompletion';
import { useWorkoutTimer } from '../../hooks/useWorkoutTimer';
import toast from 'react-hot-toast';
import { useCompleteExercise, useEndQuickSession } from '../../hooks/queries/useWorkoutQueries';
import { resolveApiError } from '../../lib/apiClient';
import { STRINGS } from '../../constants/strings';
import { formatDuration } from '../../utils/date';
import type { Exercise, TodayWorkout as TodaySession, WorkoutLogResult } from '../../types/workout';
import { SectionCard } from '../ui/SectionCard';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { IconBadge } from '../ui/IconBadge';
import { todayWorkoutStyles as styles } from './TodayWorkout.styles';

const S = STRINGS.workout;
const CELEBRATION_MS = 2200;
const NO_EXERCISES: Exercise[] = [];

type TodayWorkoutProps = {
  today: TodaySession | undefined;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  /** True when today's workout has already been saved; locks the logger. */
  alreadyLogged: boolean;
  /** Called after the workout is saved, to mark today complete right away. */
  onLogged: (result: WorkoutLogResult) => void;
};

/**
 * Today's session: per-set tracking for each exercise, a workout timer, and a
 * finish flow that saves the session (XP, level, badges) via the completion dialog.
 */
export function TodayWorkout({
  today,
  loading,
  error,
  onRetry,
  alreadyLogged,
  onLogged,
}: TodayWorkoutProps) {
  const exercises = today?.exercises ?? NO_EXERCISES;
  const timer = useWorkoutTimer();
  const completeExercise = useCompleteExercise();
  const endQuick = useEndQuickSession();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [doneSets, setDoneSets] = useState<Record<string, Set<number>>>({});
  const [completionOpen, setCompletionOpen] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  // Exercises already reported complete to the backend (avoid duplicate PUTs).
  const syncedRef = useRef<Set<string>>(new Set());

  const totalSets = useMemo(
    () => exercises.reduce((sum, exercise) => sum + Math.max(1, exercise.sets), 0),
    [exercises],
  );
  const doneCount = useMemo(
    () => Object.values(doneSets).reduce((sum, sets) => sum + sets.size, 0),
    [doneSets],
  );
  const allDone = totalSets > 0 && doneCount >= totalSets;

  function toggleSet(exercise: Exercise, setIndex: number) {
    setDoneSets((prev) => {
      const current = new Set(prev[exercise.name] ?? []);
      if (current.has(setIndex)) current.delete(setIndex);
      else current.add(setIndex);
      const next = { ...prev, [exercise.name]: current };

      // Real-time sync: report the exercise once all its sets are ticked.
      const setCount = Math.max(1, exercise.sets);
      if (current.size >= setCount && !syncedRef.current.has(exercise.name)) {
        syncedRef.current.add(exercise.name);
        completeExercise.mutateAsync(exercise.name).catch(() => {
          // Non-fatal: the final log still records completion.
          syncedRef.current.delete(exercise.name);
        });
      }

      // Full-workout celebration the moment the last set is ticked.
      const total = exercises.reduce((sum, e) => sum + Math.max(1, e.sets), 0);
      const done = Object.values(next).reduce((sum, sets) => sum + sets.size, 0);
      if (total > 0 && done >= total) {
        setCelebrating(true);
        window.setTimeout(() => setCelebrating(false), CELEBRATION_MS);
      }
      return next;
    });
  }

  async function handleBackToPlan() {
    try {
      await endQuick.mutateAsync();
      toast.success(S.quick.ended);
    } catch (err) {
      toast.error(resolveApiError(err, S.quick.error));
    }
  }

  function handleLogged(result: WorkoutLogResult) {
    timer.reset();
    onLogged(result);
  }

  const ready = !loading && !error;
  const showLogger = ready && exercises.length > 0 && !alreadyLogged;
  const showDonePanel = ready && alreadyLogged;
  const showRestDay = ready && !alreadyLogged && exercises.length === 0;

  return (
    <Box sx={styles.root}>
      <SectionCard
        title={S.today.title}
        subtitle={today?.focus ?? undefined}
        action={
          showLogger && (
            <Chip
              label={S.today.progress(doneCount, totalSets)}
              color={allDone ? 'success' : 'primary'}
              variant="outlined"
              size="small"
              sx={styles.progressChip}
            />
          )
        }
      >
        {showLogger && (
          <>
            <LinearProgress
              variant="determinate"
              value={totalSets === 0 ? 0 : (doneCount / totalSets) * 100}
              color={allDone ? 'success' : 'primary'}
              sx={styles.progressBar}
            />
            <Stack sx={styles.timerRow}>
              {timer.status === 'idle' ? (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<PlayArrowRounded />}
                  onClick={timer.start}
                >
                  {S.timer.start}
                </Button>
              ) : (
                <>
                  <Typography variant="h6" component="p" sx={styles.timerText}>
                    {formatDuration(timer.seconds)}
                  </Typography>
                  <IconButton
                    size="small"
                    color="primary"
                    aria-label={timer.status === 'running' ? S.timer.pause : S.timer.resume}
                    onClick={timer.status === 'running' ? timer.pause : timer.resume}
                  >
                    {timer.status === 'running' ? <PauseRounded /> : <PlayArrowRounded />}
                  </IconButton>
                </>
              )}
            </Stack>
          </>
        )}

        {ready && today?.quick && today.minutes && (
          <Alert
            severity="info"
            sx={styles.notice}
            action={
              <Button color="inherit" size="small" onClick={handleBackToPlan} disabled={endQuick.isPending}>
                {S.today.backToPlan}
              </Button>
            }
          >
            {S.today.quickActive(today.minutes, today.rounds ?? 1)}
          </Alert>
        )}
        {ready && !alreadyLogged && today?.mode === 'light' && (
          <Alert severity="warning" variant="outlined" sx={styles.notice}>
            {S.today.lightDay}
          </Alert>
        )}
        {ready && !alreadyLogged && today?.mode === 'rest' && (
          <Alert severity="warning" variant="outlined" sx={styles.notice}>
            {S.today.mobilityDay(today.planned_focus)}
          </Alert>
        )}

        {loading && <Skeleton variant="rounded" sx={styles.skeleton} />}
        {!loading && error && <ErrorState message={error} onRetry={onRetry} />}

        {/* Already saved today: lock the logger so it can't be logged twice. */}
        {showDonePanel && (
          <Box sx={styles.donePanel}>
            <IconBadge icon={CheckCircleRounded} tone="success" size="large" />
            <Typography variant="subtitle1" sx={styles.doneTitle}>
              {S.today.alreadyDoneTitle}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {S.today.alreadyDoneBody}
            </Typography>
          </Box>
        )}

        {showRestDay && (
          <EmptyState
            icon={HotelRounded}
            title={S.today.restDayTitle}
            description={S.today.restDay}
            compact
          />
        )}

        {showLogger && (
          <>
            <Box sx={styles.list}>
              {exercises.map((exercise) => (
                <ExerciseLogger
                  key={exercise.name}
                  exercise={exercise}
                  doneSets={doneSets[exercise.name] ?? new Set()}
                  onToggleSet={(setIndex) => toggleSet(exercise, setIndex)}
                  onDetails={exercise.exercise_id ? () => setDetailId(exercise.exercise_id ?? null) : undefined}
                />
              ))}
            </Box>

            <Button
              variant="contained"
              fullWidth
              size="large"
              color={allDone ? 'success' : 'primary'}
              startIcon={<FlagRounded />}
              onClick={() => setCompletionOpen(true)}
              disabled={doneCount === 0}
              sx={styles.finishButton}
            >
              {S.today.finish}
            </Button>
          </>
        )}
      </SectionCard>

      {/* Celebration overlay when every set is done. */}
      <AnimatePresence>
        {celebrating && (
          <Box
            component={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            sx={styles.celebrationOverlay}
          >
            <motion.div
              initial={{ scale: 0.6 }}
              animate={{ scale: [0.6, 1.08, 1] }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <Typography variant="h4" component="p" sx={styles.celebrationText}>
                {S.today.celebration}
              </Typography>
            </motion.div>
          </Box>
        )}
      </AnimatePresence>

      <ExerciseDetailDialog exerciseId={detailId} onClose={() => setDetailId(null)} onOpenExercise={setDetailId} />

      <WorkoutCompletion
        open={completionOpen}
        onClose={() => setCompletionOpen(false)}
        exercises={exercises}
        doneSetsByExercise={doneSets}
        durationSeconds={timer.seconds}
        onLogged={handleLogged}
      />
    </Box>
  );
}
