import {
  BoltRounded,
  FitnessCenterRounded,
  LocalFireDepartmentRounded,
  MicRounded,
  MilitaryTechRounded,
  MonitorHeartRounded,
  PersonRounded,
} from "@mui/icons-material";
import type { SvgIconProps } from "@mui/material";
import { Alert, Box, Button, Paper, Skeleton, Typography } from "@mui/material";
import type { ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { STRINGS } from "../../constants/strings";
import { useAuth } from "../../hooks/useAuth";
import { useDashboardChart } from "../../hooks/useDashboardChart";
import { dashboardService } from "../../services/dashboardService";
import type { DashboardSummary } from "../../types/dashboard";
import { joinMoodAndWorkouts } from "../../utils/dashboardCharts";
import { dashboardStyles as styles } from "./Dashboard.styles";
import { MoodPerformanceChart } from "./MoodPerformanceChart";
import { RecoveryTrendChart } from "./RecoveryTrendChart";
import { WeightTrendChart } from "./WeightTrendChart";
import { WorkoutRateChart } from "./WorkoutRateChart";
import { XPEarnedChart } from "./XPEarnedChart";

const S = STRINGS.dashboard;

type StatTile = {
  label: string;
  value: (summary: DashboardSummary) => number;
  icon: ComponentType<SvgIconProps>;
};

const STAT_TILES: StatTile[] = [
  { label: S.stats.level, value: (s) => s.level, icon: MilitaryTechRounded },
  { label: S.stats.xp, value: (s) => s.xp, icon: BoltRounded },
  {
    label: S.stats.streak,
    value: (s) => s.streak,
    icon: LocalFireDepartmentRounded,
  },
  {
    label: S.stats.workoutsToday,
    value: (s) => s.workouts_today,
    icon: FitnessCenterRounded,
  },
];

type QuickAction = {
  label: string;
  path: string;
  icon: ComponentType<SvgIconProps>;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: S.actions.startWorkout,
    path: ROUTES.WORKOUTS,
    icon: FitnessCenterRounded,
  },
  {
    label: S.actions.logRecovery,
    path: ROUTES.RECOVERY,
    icon: MonitorHeartRounded,
  },
  {
    label: S.actions.voiceCheckin,
    path: ROUTES.VOICE_CHECKIN,
    icon: MicRounded,
  },
  { label: S.actions.viewProfile, path: ROUTES.PROFILE, icon: PersonRounded },
];

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const displayName = user?.email?.split("@")[0] ?? "";

  const {
    data: summary,
    loading: summaryLoading,
    error: summaryError,
  } = useDashboardChart(dashboardService.getSummary, S.loadError);

  const C = S.charts;
  const moodPerformance = useDashboardChart(
    dashboardService.getMoodPerformance,
    C.moodPerformance.error,
  );
  const weightTrend = useDashboardChart(
    dashboardService.getWeightTrend,
    C.weightTrend.error,
  );
  const workoutRate = useDashboardChart(
    dashboardService.getWorkoutRate,
    C.workoutRate.error,
  );
  const xpWeekly = useDashboardChart(
    dashboardService.getXpWeekly,
    C.xpEarned.error,
  );
  const recoveryTrend = useDashboardChart(
    dashboardService.getRecoveryTrend,
    C.recoveryTrend.error,
  );

  // Joined client-side: both endpoints already cover the same 30-day window.
  const moodWorkoutPoints = joinMoodAndWorkouts(
    moodPerformance.data?.data ?? [],
    workoutRate.data?.data ?? [],
  );

  return (
    <Box>
      <Typography variant="h5" sx={styles.welcome}>
        {S.welcome(displayName)}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {S.subtitle}
      </Typography>

      {summaryError && (
        <Alert severity="error" sx={styles.sectionTitle}>
          {summaryError}
        </Alert>
      )}

      <Box sx={styles.statsGrid}>
        {STAT_TILES.map((tile) => {
          const Icon = tile.icon;
          if (!summary && summaryLoading) {
            return (
              <Skeleton
                key={tile.label}
                variant="rounded"
                sx={styles.statSkeleton}
              />
            );
          }
          return (
            <Paper
              key={tile.label}
              elevation={0}
              variant="outlined"
              sx={styles.statCard}
            >
              <Box sx={styles.statIcon}>
                <Icon fontSize="small" />
              </Box>
              <Typography variant="h4" sx={styles.statValue}>
                {summary ? tile.value(summary) : "—"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {tile.label}
              </Typography>
            </Paper>
          );
        })}
      </Box>

      <Typography variant="h6" sx={styles.sectionTitle}>
        {S.quickActions}
      </Typography>
      <Box sx={styles.actionsGrid}>
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.path}
              variant="outlined"
              size="large"
              startIcon={<Icon />}
              onClick={() => navigate(action.path)}
              sx={styles.actionButton}
            >
              {action.label}
            </Button>
          );
        })}
      </Box>

      <Typography variant="h6" sx={styles.sectionTitle}>
        {C.sectionTitle}
      </Typography>
      <Box sx={styles.chartsGrid}>
        <MoodPerformanceChart
          points={moodWorkoutPoints}
          loading={moodPerformance.loading || workoutRate.loading}
          error={moodPerformance.error ?? workoutRate.error}
        />
        <WeightTrendChart
          result={weightTrend.data}
          loading={weightTrend.loading}
          error={weightTrend.error}
        />
        <WorkoutRateChart
          result={workoutRate.data}
          loading={workoutRate.loading}
          error={workoutRate.error}
        />
        <XPEarnedChart
          result={xpWeekly.data}
          loading={xpWeekly.loading}
          error={xpWeekly.error}
        />
        <RecoveryTrendChart
          result={recoveryTrend.data}
          loading={recoveryTrend.loading}
          error={recoveryTrend.error}
        />
      </Box>
    </Box>
  );
}
