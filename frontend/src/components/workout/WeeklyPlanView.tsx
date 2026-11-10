import { useState } from "react";
import { useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  Alert,
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { CloseRounded, HotelRounded } from "@mui/icons-material";
import { ExerciseCard } from "./ExerciseCard";
import { SwapExerciseDialog } from "./SwapExerciseDialog";
import { ExerciseDetailDialog } from "../exercises/ExerciseDetailDialog";
import { STRINGS } from "../../constants/strings";
import { getWorkoutTypeMeta } from "../../constants/workout";
import type { PlanMeta, WorkoutDay } from "../../types/workout";
import { SectionCard } from "../ui/SectionCard";
import { EmptyState } from "../ui/EmptyState";
import { weeklyPlanViewStyles as styles } from "./WeeklyPlanView.styles";

const S = STRINGS.workout.week;

/** Weekday name for "today" matching the backend's Monday-first convention. */
const TODAY_NAME = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
][new Date().getDay()];

type WeeklyPlanViewProps = {
  week: WorkoutDay[];
  meta?: PlanMeta | null;
};

type SwapTarget = { day: string; index: number; name: string };

/**
 * Responsive 7-day grid; each card is color-coded by workout type and opens
 * the day's exercises, where each exercise can be explained or swapped.
 */
export function WeeklyPlanView({ week, meta }: WeeklyPlanViewProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [swapTarget, setSwapTarget] = useState<SwapTarget | null>(null);
  // Read the day from the latest plan so a swap shows up straight away.
  const selected = week.find((d) => d.day === selectedDay) ?? null;
  const selectedMeta = selected
    ? getWorkoutTypeMeta(selected.workout_type)
    : null;

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
              onClick={() => setSelectedDay(day.day)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedDay(day.day);
                }
              }}
              sx={styles.dayCard(meta.tone, isToday)}
            >
              <Typography variant="body2" sx={styles.dayName}>
                {day.day.slice(0, 3)}
              </Typography>
              <Icon fontSize="small" sx={styles.typeIcon(meta.tone)} />
              <Typography variant="caption" sx={styles.typeLabel(meta.tone)}>
                {day.focus ?? meta.label}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={styles.exerciseCount}
              >
                {S.exercisesCount(day.exercises.length)}
              </Typography>
            </Paper>
          );
        })}
      </Box>

      <Dialog
        open={Boolean(selected)}
        onClose={() => setSelectedDay(null)}
        fullWidth
        maxWidth="md"
        fullScreen={fullScreen}
        scroll="paper"
      >
        {selected && selectedMeta && (
          <>
            <DialogTitle component="div" sx={styles.dialogTitle}>
              <Box>
                <Stack sx={styles.dialogTitleRow}>
                  <Typography variant="h6" component="h2">
                    {selected.day}
                  </Typography>
                  <Chip
                    label={selected.focus ?? selectedMeta.label}
                    size="small"
                    sx={styles.typeChip(selectedMeta.tone)}
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {STRINGS.workout.dayDialog.count(selected.exercises.length)}
                </Typography>
              </Box>
              <IconButton aria-label={STRINGS.workout.dayDialog.close} onClick={() => setSelectedDay(null)}>
                <CloseRounded />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              {selected.exercises.length === 0 ? (
                <EmptyState
                  icon={HotelRounded}
                  title={STRINGS.workout.today.restDayTitle}
                  description={STRINGS.workout.today.restDay}
                  compact
                />
              ) : (
                <Box sx={styles.dialogList}>
                  {selected.exercises.map((exercise, index) => (
                    <ExerciseCard
                      key={`${exercise.name}-${index}`}
                      exercise={exercise}
                      onDetails={
                        exercise.exercise_id
                          ? () => setDetailId(exercise.exercise_id ?? null)
                          : undefined
                      }
                      onSwap={
                        exercise.exercise_id && exercise.pattern !== "mobility"
                          ? () =>
                              setSwapTarget({
                                day: selected.day,
                                index,
                                name: exercise.name,
                              })
                          : undefined
                      }
                    />
                  ))}
                </Box>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>

      <Box sx={styles.footer}>
        {/* Plans saved before the exercise catalogue have no meta (and no
            exercise details or swaps); suggest making a new one. */}
        {meta?.basis ? (
          <>
            {(meta.notes ?? []).map((note) => (
              <Alert key={note} severity="info" variant="outlined">
                {STRINGS.workout.planNotes[note]}
              </Alert>
            ))}
            <Typography variant="caption" color="text.secondary">
              {STRINGS.workout.basis(meta.basis)}
            </Typography>
          </>
        ) : (
          <Alert severity="info" variant="outlined">
            {STRINGS.workout.legacyPlan}
          </Alert>
        )}
      </Box>

      <ExerciseDetailDialog
        exerciseId={detailId}
        onClose={() => setDetailId(null)}
        onOpenExercise={setDetailId}
      />
      {swapTarget && (
        <SwapExerciseDialog
          day={swapTarget.day}
          index={swapTarget.index}
          name={swapTarget.name}
          onClose={() => setSwapTarget(null)}
        />
      )}
    </SectionCard>
  );
}
