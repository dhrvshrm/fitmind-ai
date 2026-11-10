import { useMemo, useState } from 'react';
import { Box, Button, CircularProgress, Skeleton, Tab, Tabs, Typography } from '@mui/material';
import { AutorenewRounded, CalendarMonthRounded } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { WeeklyPlanView } from './WeeklyPlanView';
import { TodayWorkout } from './TodayWorkout';
import { WorkoutHistory } from './WorkoutHistory';
import { QuickSessionCard } from './QuickSessionCard';
import { ExerciseLibrary } from '../exercises/ExerciseLibrary';
import {
  useGeneratePlan,
  useTodayWorkout,
  useWeeklyPlan,
  useWorkoutHistory,
} from '../../hooks/queries/useWorkoutQueries';
import { queryErrorMessage } from '../../hooks/queries/queryHelpers';
import { resolveApiError } from '../../lib/apiClient';
import { STRINGS } from '../../constants/strings';
import { getCompletedDates, markDateCompleted } from '../../utils/workout';
import { toIsoDate } from '../../utils/date';
import { PageHeader } from '../ui/PageHeader';
import { SectionCard } from '../ui/SectionCard';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { workoutPageStyles as styles } from './WorkoutPage.styles';

const S = STRINGS.workout;
/** A year of history covers the month calendar and the streak. */
const COMPLETION_HISTORY_DAYS = 365;

type PageTab = 'plan' | 'library';

export function WorkoutPage() {
  const plan = useWeeklyPlan();
  const today = useTodayWorkout();
  const history = useWorkoutHistory(COMPLETION_HISTORY_DAYS);
  const generatePlan = useGeneratePlan();
  const [tab, setTab] = useState<PageTab>('plan');

  /**
   * Local mirror of completed dates. It seeds the first render, serves as the
   * offline fallback when history fails to load, and lights up today the
   * moment a workout is saved (before the history refetch lands).
   */
  const [localDates, setLocalDates] = useState<string[]>(() => getCompletedDates());
  const [loggedNow, setLoggedNow] = useState<string | null>(null);

  // Backend history (`GET /workouts/history`) is the source of truth so the
  // lock and calendar work across devices.
  const completedDates = useMemo(() => {
    if (!history.data) return localDates;
    const dates = new Set(history.data.map((log) => log.date));
    if (loggedNow) dates.add(loggedNow);
    return [...dates].sort();
  }, [history.data, localDates, loggedNow]);

  const planError = queryErrorMessage(plan.error, S.planError);
  const todayError = queryErrorMessage(today.error, S.today.error);
  const isGenerating = generatePlan.isPending;

  async function handleGenerate() {
    try {
      await generatePlan.mutateAsync({});
      toast.success(S.generated);
    } catch (error) {
      toast.error(resolveApiError(error, S.generateError));
    }
  }

  /** After a save: light up today immediately; the history query re-syncs behind it. */
  function handleWorkoutLogged() {
    const todayIso = toIsoDate(new Date());
    setLocalDates(markDateCompleted(todayIso));
    setLoggedNow(todayIso);
  }

  const showEmptyState = !plan.isPending && !planError && !plan.data;

  return (
    <Box>
      <PageHeader
        title={S.title}
        subtitle={S.subtitle}
        actions={
          <Box sx={styles.generateBox}>
            <Button
              variant="contained"
              onClick={handleGenerate}
              disabled={isGenerating}
              startIcon={
                isGenerating ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <AutorenewRounded />
                )
              }
            >
              {isGenerating ? S.generating : S.generate}
            </Button>
            <Typography variant="caption" color="text.secondary" sx={styles.generateHint}>
              {S.generateHint}
            </Typography>
          </Box>
        }
      />

      <Tabs value={tab} onChange={(_, value: PageTab) => setTab(value)} sx={styles.tabs}>
        <Tab value="plan" label={S.tabs.plan} />
        <Tab value="library" label={S.tabs.library} />
      </Tabs>

      {tab === 'library' && <ExerciseLibrary />}

      <Box sx={styles.content} hidden={tab !== 'plan'}>
        {plan.isPending && <Skeleton variant="rounded" sx={styles.planSkeleton} />}
        {planError && <ErrorState message={planError} onRetry={() => plan.refetch()} />}

        {showEmptyState && (
          <SectionCard>
            <EmptyState icon={CalendarMonthRounded} title={S.noPlanTitle} description={S.noPlanBody} />
          </SectionCard>
        )}

        {plan.data && <WeeklyPlanView week={plan.data.week} meta={plan.data.meta} />}

        <QuickSessionCard />

        <Box sx={styles.splitRow}>
          <TodayWorkout
            today={today.data}
            loading={today.isPending}
            error={todayError}
            onRetry={() => today.refetch()}
            alreadyLogged={completedDates.includes(toIsoDate(new Date()))}
            onLogged={handleWorkoutLogged}
          />
          <WorkoutHistory completedDates={completedDates} />
        </Box>
      </Box>
    </Box>
  );
}
