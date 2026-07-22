import { useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import {
  CheckCircleRounded,
  FlagRounded,
  PauseRounded,
  PlayArrowRounded,
} from "@mui/icons-material";
import { AnimatePresence, motion } from "framer-motion";
import { ExerciseLogger } from "./ExerciseLogger";
import { WorkoutCompletion } from "./WorkoutCompletion";
import { useWorkoutTimer } from "../../hooks/useWorkoutTimer";
import { workoutService } from "../../services/workoutService";
import { STRINGS } from "../../constants/strings";
import { formatDuration } from "../../utils/date";
import type { Exercise, WorkoutLogResult } from "../../types/workout";
import { todayWorkoutStyles as styles } from "./TodayWorkout.styles";

const S = STRINGS.workout;
const CELEBRATION_MS = 2200;

type TodayWorkoutProps = {
  exercises: Exercise[];
  loading: boolean;
  error: string | null;
  /** True when today's workout has already been saved - locks the logger. */
  alreadyLogged: boolean;
  /** Called after the workout is saved on the backend. */
  onLogged: (result: WorkoutLogResult) => void;
};

/**
 * Today's session: per-set tracking for each exercise, a workout timer, and a
 * finish flow that saves the session (XP, level, badges) via the completion dialog.
 */
export function TodayWorkout({
  exercises,
  loading,
  error,
  alreadyLogged,
  onLogged,
}: TodayWorkoutProps) {
  const timer = useWorkoutTimer();
  const [doneSets, setDoneSets] = useState<Record<string, Set<number>>>({});
  const [completionOpen, setCompletionOpen] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  // Exercises already reported complete to the backend (avoid duplicate PUTs).
  const syncedRef = useRef<Set<string>>(new Set());

  const totalSets = useMemo(
    () =>
      exercises.reduce((sum, exercise) => sum + Math.max(1, exercise.sets), 0),
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
        workoutService.completeExercise(exercise.name).catch(() => {
          // Non-fatal: the final log still records completion.
          syncedRef.current.delete(exercise.name);
        });
      }

      // Full-workout celebration the moment the last set is ticked.
      const total = exercises.reduce((sum, e) => sum + Math.max(1, e.sets), 0);
      const done = Object.values(next).reduce(
        (sum, sets) => sum + sets.size,
        0,
      );
      if (total > 0 && done >= total) {
        setCelebrating(true);
        window.setTimeout(() => setCelebrating(false), CELEBRATION_MS);
      }
      return next;
    });
  }

  function handleLogged(result: WorkoutLogResult) {
    timer.reset();
    onLogged(result);
  }

  const showLogger =
    exercises.length > 0 && !loading && !error && !alreadyLogged;
  const showDonePanel = !loading && !error && alreadyLogged;

  return (
    <Paper variant="outlined" sx={styles.card}>
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
              initial={{ scale: 0.4, rotate: -8 }}
              animate={{ scale: [0.4, 1.15, 1], rotate: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <Typography variant="h4" sx={styles.celebrationText}>
                {S.today.celebration}
              </Typography>
            </motion.div>
          </Box>
        )}
      </AnimatePresence>

      <Stack sx={styles.headerRow}>
        <Typography variant="h6" sx={styles.title}>
          {S.today.title}
        </Typography>
        {showLogger && (
          <Chip
            label={S.today.progress(doneCount, totalSets)}
            color={allDone ? "success" : "primary"}
            variant="outlined"
            sx={styles.progressChip}
          />
        )}
      </Stack>

      {showLogger && (
        <LinearProgress
          variant="determinate"
          value={totalSets === 0 ? 0 : (doneCount / totalSets) * 100}
          color={allDone ? "success" : "primary"}
          sx={styles.progressBar}
        />
      )}

      {showLogger && (
        <Stack sx={styles.timerRow}>
          {timer.status === "idle" && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<PlayArrowRounded />}
              onClick={timer.start}
            >
              {S.timer.start}
            </Button>
          )}
          {timer.status !== "idle" && (
            <>
              <Typography variant="h6" sx={styles.timerText}>
                {formatDuration(timer.seconds)}
              </Typography>
              <IconButton
                size="small"
                color="primary"
                aria-label={
                  timer.status === "running" ? S.timer.pause : S.timer.resume
                }
                onClick={
                  timer.status === "running" ? timer.pause : timer.resume
                }
              >
                {timer.status === "running" ? (
                  <PauseRounded />
                ) : (
                  <PlayArrowRounded />
                )}
              </IconButton>
            </>
          )}
        </Stack>
      )}

      {loading && <Skeleton variant="rounded" height={220} />}
      {!loading && error && <Alert severity="error">{error}</Alert>}

      {/* Already saved today: lock the logger so it can't be logged twice. */}
      {showDonePanel && (
        <Box sx={styles.donePanel}>
          <CheckCircleRounded sx={styles.doneIcon} />
          <Typography variant="h6" sx={styles.doneTitle}>
            {S.today.alreadyDoneTitle}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {S.today.alreadyDoneBody}
          </Typography>
        </Box>
      )}

      {!loading && !error && !alreadyLogged && exercises.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={styles.restDay}>
          {S.today.restDay}
        </Typography>
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
              />
            ))}
          </Box>

          <Button
            variant="contained"
            fullWidth
            size="large"
            color={allDone ? "success" : "primary"}
            startIcon={<FlagRounded />}
            onClick={() => setCompletionOpen(true)}
            disabled={doneCount === 0}
            sx={styles.finishButton}
          >
            {S.today.finish}
          </Button>
        </>
      )}

      <WorkoutCompletion
        open={completionOpen}
        onClose={() => setCompletionOpen(false)}
        exercises={exercises}
        doneSetsByExercise={doneSets}
        durationSeconds={timer.seconds}
        onLogged={handleLogged}
      />
    </Paper>
  );
}
