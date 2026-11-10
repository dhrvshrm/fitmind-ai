import {
  BoltRounded,
  FitnessCenterRounded,
  LocalFireDepartmentRounded,
  MicRounded,
  MilitaryTechRounded,
  MonitorHeartRounded,
  RestaurantRounded,
} from "@mui/icons-material";
import type { SvgIconProps } from "@mui/material";
import { Box, Button, Typography } from "@mui/material";
import type { ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { STRINGS } from "../../constants/strings";
import { useAuth } from "../../hooks/useAuth";
import {
  useDashboardSummary,
  useMoodPerformance,
  useRecoveryTrend,
  useWeightTrend,
  useWorkoutRate,
  useXpWeekly,
} from "../../hooks/queries/useDashboardQueries";
import { queryErrorMessage } from "../../hooks/queries/queryHelpers";
import type { DashboardSummary } from "../../types/dashboard";
import { joinMoodAndWorkouts } from "../../utils/dashboardCharts";
import { PageHeader } from "../ui/PageHeader";
import { StatTile } from "../ui/StatTile";
import { Reveal } from "../ui/Reveal";
import { ErrorState } from "../ui/ErrorState";
import type { IconBadgeTone } from "../ui/IconBadge.styles";
import { dashboardStyles as styles } from "./Dashboard.styles";
import { MoodPerformanceChart } from "./MoodPerformanceChart";
import { RecoveryTrendChart } from "./RecoveryTrendChart";
import { WeightTrendChart } from "./WeightTrendChart";
import { WorkoutRateChart } from "./WorkoutRateChart";
import { XPEarnedChart } from "./XPEarnedChart";

const S = STRINGS.dashboard;
const C = S.charts;

type StatTileConfig = {
  label: string;
  value: (summary: DashboardSummary) => number;
  icon: ComponentType<SvgIconProps>;
  tone: IconBadgeTone;
};

const STAT_TILES: StatTileConfig[] = [
  { label: S.stats.level, value: (s) => s.level, icon: MilitaryTechRounded, tone: "primary" },
  { label: S.stats.xp, value: (s) => s.xp, icon: BoltRounded, tone: "primary" },
  { label: S.stats.streak, value: (s) => s.streak, icon: LocalFireDepartmentRounded, tone: "warning" },
  { label: S.stats.workoutsToday, value: (s) => s.workouts_today, icon: FitnessCenterRounded, tone: "secondary" },
];

type QuickAction = {
  label: string;
  path: string;
  icon: ComponentType<SvgIconProps>;
};

const QUICK_ACTIONS: QuickAction[] = [
  { label: S.actions.logMeal, path: ROUTES.NUTRITION, icon: RestaurantRounded },
  { label: S.actions.startWorkout, path: ROUTES.WORKOUTS, icon: FitnessCenterRounded },
  { label: S.actions.logRecovery, path: ROUTES.RECOVERY, icon: MonitorHeartRounded },
  { label: S.actions.voiceCheckin, path: ROUTES.VOICE_CHECKIN, icon: MicRounded },
];

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.username ?? user?.email?.split("@")[0] ?? "";

  const summary = useDashboardSummary();
  const moodPerformance = useMoodPerformance();
  const weightTrend = useWeightTrend();
  const workoutRate = useWorkoutRate();
  const xpWeekly = useXpWeekly();
  const recoveryTrend = useRecoveryTrend();

  // Joined client-side: both endpoints already cover the same 30-day window.
  const moodWorkoutPoints = joinMoodAndWorkouts(
    moodPerformance.data?.data ?? [],
    workoutRate.data?.data ?? [],
  );

  const summaryError = queryErrorMessage(summary.error, S.loadError);

  return (
    <Box>
      <PageHeader title={S.welcome(displayName)} subtitle={S.subtitle} />

      {summaryError && (
        <Box sx={styles.section}>
          <ErrorState message={summaryError} onRetry={() => summary.refetch()} />
        </Box>
      )}

      <Box sx={styles.statsGrid}>
        {STAT_TILES.map((tile, index) => (
          <Reveal key={tile.label} index={index} fill>
            <StatTile
              label={tile.label}
              icon={tile.icon}
              tone={tile.tone}
              loading={summary.isPending}
              value={summary.data ? tile.value(summary.data) : null}
            />
          </Reveal>
        ))}
      </Box>

      <Box sx={styles.actionsRow}>
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.path}
              variant="outlined"
              color="inherit"
              startIcon={<Icon />}
              onClick={() => navigate(action.path)}
              sx={styles.actionButton}
            >
              {action.label}
            </Button>
          );
        })}
      </Box>

      <Typography variant="h6" component="h2" sx={styles.sectionTitle}>
        {C.sectionTitle}
      </Typography>
      <Box sx={styles.chartsGrid}>
        <MoodPerformanceChart
          points={moodWorkoutPoints}
          loading={moodPerformance.isPending || workoutRate.isPending}
          error={
            queryErrorMessage(moodPerformance.error, C.moodPerformance.error) ??
            queryErrorMessage(workoutRate.error, C.moodPerformance.error)
          }
        />
        <WeightTrendChart
          result={weightTrend.data ?? null}
          loading={weightTrend.isPending}
          error={queryErrorMessage(weightTrend.error, C.weightTrend.error)}
        />
        <WorkoutRateChart
          result={workoutRate.data ?? null}
          loading={workoutRate.isPending}
          error={queryErrorMessage(workoutRate.error, C.workoutRate.error)}
        />
        <XPEarnedChart
          result={xpWeekly.data ?? null}
          loading={xpWeekly.isPending}
          error={queryErrorMessage(xpWeekly.error, C.xpEarned.error)}
        />
        <RecoveryTrendChart
          result={recoveryTrend.data ?? null}
          loading={recoveryTrend.isPending}
          error={queryErrorMessage(recoveryTrend.error, C.recoveryTrend.error)}
        />
      </Box>
    </Box>
  );
}
