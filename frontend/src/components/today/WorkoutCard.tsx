import { Box, Button, Chip, CircularProgress, Skeleton, Typography } from '@mui/material';
import {
  BoltRounded,
  CheckCircleRounded,
  FitnessCenterRounded,
  PlayArrowRounded,
  SelfImprovementRounded,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import { TODAY_STRINGS } from '../../constants/todayStrings';
import {
  useGeneratePlan,
  useStartQuickSession,
  useTodayWorkout,
  useWorkoutHistory,
} from '../../hooks/queries/useWorkoutQueries';
import { resolveApiError } from '../../lib/apiClient';
import { toIsoDate } from '../../utils/date';
import { TodayCard } from './TodayCard';
import { workoutCardStyles as styles } from './WorkoutCard.styles';

const S = TODAY_STRINGS.workout;
const QUICK_MINUTES = 15;
const HISTORY_DAYS = 7;
const PREVIEW_EXERCISES = 4;

/** Today's session: start it, or swap in a 15-minute one when time is short. */
export function WorkoutCard() {
  const navigate = useNavigate();
  const today = useTodayWorkout();
  const history = useWorkoutHistory(HISTORY_DAYS);
  const quick = useStartQuickSession();
  const generate = useGeneratePlan();

  const doneToday = (history.data ?? []).some((w) => w.date === toIsoDate(new Date()));

  function startQuick() {
    quick.mutate(
      { minutes: QUICK_MINUTES, place: 'home' },
      {
        onSuccess: () => navigate(ROUTES.WORKOUTS),
        onError: (error) => toast.error(resolveApiError(error, S.quickError)),
      },
    );
  }

  function createPlan() {
    generate.mutate(
      {},
      { onError: (error) => toast.error(resolveApiError(error, S.createError)) },
    );
  }

  if (today.isPending) {
    return (
      <TodayCard title={S.title} icon={FitnessCenterRounded} tone="secondary">
        <Skeleton variant="text" width="50%" height={32} />
        <Skeleton variant="rounded" height={40} />
      </TodayCard>
    );
  }

  const session = today.data;

  if (doneToday) {
    return (
      <TodayCard title={S.title} icon={FitnessCenterRounded} tone="success">
        <Box sx={styles.status}>
          <CheckCircleRounded color="success" />
          <Typography variant="h6" component="p" sx={styles.focus}>
            {S.doneTitle}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {S.doneBody}
        </Typography>
      </TodayCard>
    );
  }

  if (!session || !session.has_plan) {
    return (
      <TodayCard title={S.title} icon={FitnessCenterRounded} tone="secondary">
        <Typography variant="h6" component="p" sx={styles.focus}>
          {S.noPlanTitle}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {S.noPlanBody}
        </Typography>
        <Box sx={styles.actions}>
          <Button
            variant="contained"
            color="secondary"
            sx={styles.primary}
            onClick={createPlan}
            disabled={generate.isPending}
            startIcon={generate.isPending ? <CircularProgress size={18} color="inherit" /> : <FitnessCenterRounded />}
          >
            {generate.isPending ? S.creatingPlan : S.createPlan}
          </Button>
        </Box>
      </TodayCard>
    );
  }

  const isRest = session.workout_type === 'rest' || session.exercises.length === 0;

  if (isRest) {
    return (
      <TodayCard title={S.title} icon={SelfImprovementRounded} tone="secondary">
        <Typography variant="h6" component="p" sx={styles.focus}>
          {S.restTitle}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {S.restBody}
        </Typography>
        <Box sx={styles.actions}>
          <Button variant="outlined" startIcon={<BoltRounded />} onClick={startQuick} disabled={quick.isPending}>
            {quick.isPending ? S.quickStarting : S.quick}
          </Button>
        </Box>
      </TodayCard>
    );
  }

  const names = session.exercises.slice(0, PREVIEW_EXERCISES).map((e) => e.name).join(', ');

  return (
    <TodayCard title={S.title} icon={FitnessCenterRounded} tone="secondary" interactive>
      <Typography variant="h6" component="p" sx={styles.focus}>
        {session.quick && session.minutes ? S.quickLabel(session.minutes) : session.focus}
      </Typography>
      <Box sx={styles.meta}>
        <Chip size="small" label={S.exercises(session.exercises.length)} />
        {session.mode !== 'normal' && <Chip size="small" color="warning" variant="outlined" label={S.lightDay} />}
      </Box>
      <Typography variant="body2" sx={styles.exercises}>
        {names}
      </Typography>
      <Box sx={styles.actions}>
        <Button
          variant="contained"
          color="secondary"
          sx={styles.primary}
          startIcon={<PlayArrowRounded />}
          onClick={() => navigate(ROUTES.WORKOUTS)}
        >
          {S.start}
        </Button>
        {!session.quick && (
          <Button
            variant="outlined"
            color="secondary"
            startIcon={quick.isPending ? <CircularProgress size={16} color="inherit" /> : <BoltRounded />}
            onClick={startQuick}
            disabled={quick.isPending}
          >
            {quick.isPending ? S.quickStarting : S.quick}
          </Button>
        )}
      </Box>
    </TodayCard>
  );
}
