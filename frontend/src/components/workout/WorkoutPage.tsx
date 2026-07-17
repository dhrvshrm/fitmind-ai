import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { AutoAwesomeRounded } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { WeeklyPlanView } from './WeeklyPlanView';
import { TodayWorkout } from './TodayWorkout';
import { WorkoutHistory } from './WorkoutHistory';
import { workoutService } from '../../services/workoutService';
import { resolveApiError } from '../../lib/apiClient';
import { STRINGS } from '../../constants/strings';
import { getCompletedDates } from '../../utils/workout';
import type { Exercise, WeeklyPlan } from '../../types/workout';
import { workoutPageStyles as styles } from './WorkoutPage.styles';

const S = STRINGS.workout;

export function WorkoutPage() {
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [planError, setPlanError] = useState<string | null>(null);

  const [todayExercises, setTodayExercises] = useState<Exercise[]>([]);
  const [todayLoading, setTodayLoading] = useState(true);
  const [todayError, setTodayError] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);

  // Local until Day 8 syncs completions with the backend.
  const [completedDates] = useState<string[]>(() => getCompletedDates());

  const loadToday = useCallback(async () => {
    setTodayLoading(true);
    setTodayError(null);
    try {
      setTodayExercises(await workoutService.getTodayWorkout());
    } catch (error) {
      setTodayError(resolveApiError(error, S.today.error));
    } finally {
      setTodayLoading(false);
    }
  }, []);

  const loadPlan = useCallback(async () => {
    setPlanLoading(true);
    setPlanError(null);
    try {
      setPlan(await workoutService.getWeeklyPlan());
    } catch (error) {
      setPlanError(resolveApiError(error, S.planError));
    } finally {
      setPlanLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlan();
    loadToday();
  }, [loadPlan, loadToday]);

  /** Plan generation can take several seconds (AI call server-side). */
  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const fresh = await workoutService.generateWorkoutPlan();
      setPlan(fresh);
      setPlanError(null);
      toast.success(S.generated);
      loadToday();
    } catch (error) {
      toast.error(resolveApiError(error, S.generateError));
    } finally {
      setIsGenerating(false);
    }
  }

  const showEmptyState = !planLoading && !planError && !plan;

  return (
    <Box>
      <Stack sx={styles.headerRow}>
        <Box>
          <Typography variant="h5" sx={styles.title}>
            {S.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {S.subtitle}
          </Typography>
        </Box>
        <Box>
          <Button
            variant="contained"
            size="large"
            onClick={handleGenerate}
            disabled={isGenerating}
            startIcon={
              isGenerating ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <AutoAwesomeRounded />
              )
            }
          >
            {isGenerating ? S.generating : S.generate}
          </Button>
          <Typography variant="caption" color="text.secondary" sx={styles.generateHint}>
            {S.generateHint}
          </Typography>
        </Box>
      </Stack>

      <Box sx={styles.content}>
        {planLoading && <Skeleton variant="rounded" sx={styles.planSkeleton} />}
        {!planLoading && planError && <Alert severity="error">{planError}</Alert>}

        {showEmptyState && (
          <Paper variant="outlined" sx={styles.emptyCard}>
            <Typography variant="h6" sx={styles.emptyTitle}>
              {S.noPlanTitle}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {S.noPlanBody}
            </Typography>
          </Paper>
        )}

        {plan && <WeeklyPlanView week={plan.week} />}

        <Box sx={styles.splitRow}>
          <TodayWorkout
            exercises={todayExercises}
            loading={todayLoading}
            error={todayError}
          />
          <WorkoutHistory completedDates={completedDates} />
        </Box>
      </Box>
    </Box>
  );
}
