import { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import {
  EventAvailableRounded,
  FitnessCenterRounded,
  IosShareRounded,
  LocalFireDepartmentRounded,
  MonitorWeightRounded,
  ShowChartRounded,
} from '@mui/icons-material';
import { PROGRESS_STRINGS } from '../../constants/progressStrings';
import { STRINGS } from '../../constants/strings';
import { useAuth } from '../../hooks/useAuth';
import { useRecoveryTrend, useWorkoutRate } from '../../hooks/queries/useDashboardQueries';
import { useWeekSummary, useWeightProgress } from '../../hooks/queries/useProgressQueries';
import { queryErrorMessage } from '../../hooks/queries/queryHelpers';
import { firstName } from '../../utils/user';
import { PageHeader } from '../ui/PageHeader';
import { Reveal } from '../ui/Reveal';
import { StatTile } from '../ui/StatTile';
import { AdaptiveTargetCard } from './AdaptiveTargetCard';
import { ChallengesCard } from './ChallengesCard';
import { FlexibleWeekCard } from './FlexibleWeekCard';
import { MeasurementsCard } from './MeasurementsCard';
import { PatternsCard } from './PatternsCard';
import { ProgressPhotosCard } from './ProgressPhotosCard';
import { RecoveryTrendChart } from './RecoveryTrendChart';
import { ShareWeekDialog } from './ShareWeekDialog';
import { StrengthCard } from './StrengthCard';
import { TipOfTheDay } from './TipOfTheDay';
import { WeeklyInsightCard } from './WeeklyInsightCard';
import { WeightProgressCard } from './WeightProgressCard';
import { WorkoutRateChart } from './WorkoutRateChart';
import { dashboardStyles as styles } from './Dashboard.styles';

const P = PROGRESS_STRINGS;
const T = P.stats;
const C = STRINGS.dashboard.charts;

/**
 * The progress overview: trends, what to adjust, and what's coming up this
 * week. Daily logging lives on the Today screen; this page is about how the
 * weeks are adding up.
 */
export function Dashboard() {
  const { user } = useAuth();
  const [shareOpen, setShareOpen] = useState(false);
  const weight = useWeightProgress();
  const week = useWeekSummary();
  const workoutRate = useWorkoutRate();
  const recoveryTrend = useRecoveryTrend();

  const weightSummary = weight.data?.summary;
  const stats = week.data;
  const tiles = [
    {
      label: T.trendWeight,
      icon: MonitorWeightRounded,
      tone: 'primary' as const,
      loading: weight.isPending,
      value: weightSummary?.current_trend != null ? T.kg(weightSummary.current_trend) : null,
      hint: weightSummary?.direction ? P.direction[weightSummary.direction] : undefined,
    },
    {
      label: T.weeklyRate,
      icon: ShowChartRounded,
      tone: 'secondary' as const,
      loading: weight.isPending,
      value: weightSummary?.weekly_rate != null ? T.rate(weightSummary.weekly_rate) : null,
      hint: weightSummary?.weekly_rate != null ? undefined : T.noRate,
    },
    {
      label: T.consistency,
      icon: EventAvailableRounded,
      tone: 'success' as const,
      loading: week.isPending,
      value: stats ? T.consistencyValue(stats.active_days) : null,
    },
    {
      label: T.workouts,
      icon: FitnessCenterRounded,
      tone: 'secondary' as const,
      loading: week.isPending,
      value: stats ? T.workoutsValue(stats.workouts_done, stats.workouts_planned) : null,
    },
    {
      label: T.streak,
      icon: LocalFireDepartmentRounded,
      tone: 'warning' as const,
      loading: week.isPending,
      value: stats ? stats.streak : null,
    },
  ];

  return (
    <Box>
      <PageHeader
        title={P.page.welcome(firstName(user))}
        subtitle={P.page.subtitle}
        actions={
          <Button variant="outlined" startIcon={<IosShareRounded />} onClick={() => setShareOpen(true)}>
            {P.page.share}
          </Button>
        }
      />
      <TipOfTheDay />

      <Box sx={styles.statsGrid}>
        {tiles.map((tile, index) => (
          <Reveal key={tile.label} index={index} fill>
            <StatTile
              label={tile.label}
              icon={tile.icon}
              tone={tile.tone}
              loading={tile.loading}
              value={tile.value}
              hint={tile.hint}
            />
          </Reveal>
        ))}
      </Box>

      <Box sx={styles.twoColumn}>
        <Reveal index={0} fill>
          <WeeklyInsightCard />
        </Reveal>
        <Reveal index={1} fill>
          <AdaptiveTargetCard />
        </Reveal>
      </Box>

      <Box sx={styles.twoColumn}>
        <Reveal index={0} fill>
          <WeightProgressCard />
        </Reveal>
        <Reveal index={1} fill>
          <MeasurementsCard />
        </Reveal>
      </Box>

      <Box sx={styles.section}>
        <StrengthCard />
      </Box>

      <Box sx={styles.section}>
        <FlexibleWeekCard />
      </Box>

      <Box sx={styles.twoColumn}>
        <Reveal index={0} fill>
          <PatternsCard />
        </Reveal>
        <Reveal index={1} fill>
          <ChallengesCard />
        </Reveal>
      </Box>

      <Box sx={styles.section}>
        <ProgressPhotosCard />
      </Box>

      <Typography variant="h6" component="h2" sx={styles.sectionTitle}>
        {P.page.moreTrends}
      </Typography>
      <Box sx={styles.chartsGrid}>
        <WorkoutRateChart
          result={workoutRate.data ?? null}
          loading={workoutRate.isPending}
          error={queryErrorMessage(workoutRate.error, C.workoutRate.error)}
        />
        <RecoveryTrendChart
          result={recoveryTrend.data ?? null}
          loading={recoveryTrend.isPending}
          error={queryErrorMessage(recoveryTrend.error, C.recoveryTrend.error)}
        />
      </Box>

      {shareOpen && <ShareWeekDialog open={shareOpen} onClose={() => setShareOpen(false)} />}
    </Box>
  );
}
