import { useEffect, useState, type ComponentType } from 'react';
import {
  Alert,
  Box,
  Button,
  Paper,
  Skeleton,
  Typography,
} from '@mui/material';
import type { SvgIconProps } from '@mui/material';
import {
  BoltRounded,
  FitnessCenterRounded,
  LocalFireDepartmentRounded,
  MicRounded,
  MilitaryTechRounded,
  MonitorHeartRounded,
  PersonRounded,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { dashboardService } from '../../services/dashboardService';
import { resolveApiError } from '../../lib/apiClient';
import { STRINGS } from '../../constants/strings';
import { ROUTES } from '../../constants/routes';
import type { DashboardSummary } from '../../types/dashboard';
import { dashboardStyles as styles } from './Dashboard.styles';

const S = STRINGS.dashboard;

type StatTile = {
  label: string;
  value: (summary: DashboardSummary) => number;
  icon: ComponentType<SvgIconProps>;
};

const STAT_TILES: StatTile[] = [
  { label: S.stats.level, value: (s) => s.level, icon: MilitaryTechRounded },
  { label: S.stats.xp, value: (s) => s.xp, icon: BoltRounded },
  { label: S.stats.streak, value: (s) => s.streak, icon: LocalFireDepartmentRounded },
  { label: S.stats.workoutsToday, value: (s) => s.workouts_today, icon: FitnessCenterRounded },
];

type QuickAction = {
  label: string;
  path: string;
  icon: ComponentType<SvgIconProps>;
};

const QUICK_ACTIONS: QuickAction[] = [
  { label: S.actions.startWorkout, path: ROUTES.WORKOUTS, icon: FitnessCenterRounded },
  { label: S.actions.logRecovery, path: ROUTES.RECOVERY, icon: MonitorHeartRounded },
  { label: S.actions.voiceCheckin, path: ROUTES.VOICE_CHECKIN, icon: MicRounded },
  { label: S.actions.viewProfile, path: ROUTES.PROFILE, icon: PersonRounded },
];

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const displayName = user?.email?.split('@')[0] ?? '';

  useEffect(() => {
    let active = true;

    dashboardService
      .getSummary()
      .then((data) => {
        if (active) setSummary(data);
      })
      .catch((err: unknown) => {
        if (active) setError(resolveApiError(err, S.loadError));
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <Box>
      <Typography variant="h5" sx={styles.welcome}>
        {S.welcome(displayName)}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {S.subtitle}
      </Typography>

      {error && (
        <Alert severity="error" sx={styles.sectionTitle}>
          {error}
        </Alert>
      )}

      <Box sx={styles.statsGrid}>
        {STAT_TILES.map((tile) => {
          const Icon = tile.icon;
          if (!summary && !error) {
            return <Skeleton key={tile.label} variant="rounded" sx={styles.statSkeleton} />;
          }
          return (
            <Paper key={tile.label} elevation={0} variant="outlined" sx={styles.statCard}>
              <Box sx={styles.statIcon}>
                <Icon fontSize="small" />
              </Box>
              <Typography variant="h4" sx={styles.statValue}>
                {summary ? tile.value(summary) : '—'}
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
    </Box>
  );
}
