import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import {
  GetAppRounded,
  MonitorHeartRounded,
  NotificationsActiveRounded,
  WbSunnyRounded,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import { TODAY_STRINGS } from '../../constants/todayStrings';
import { useAuth } from '../../hooks/useAuth';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import { useEnableReminders, useTodayStatus } from '../../hooks/queries/useHabitQueries';
import { useNutritionToday } from '../../hooks/queries/useNutritionQueries';
import { queryErrorMessage } from '../../hooks/queries/queryHelpers';
import { resolveApiError } from '../../lib/apiClient';
import { trackEvent } from '../../lib/analytics';
import { pushSupport } from '../../lib/push';
import type { SetupResult } from '../../types/habit';
import { firstName } from '../../utils/user';
import { dayPart, formatToday, readDismissed, writeDismissed } from '../../utils/today';
import { ErrorState } from '../ui/ErrorState';
import { PageHeader } from '../ui/PageHeader';
import { Reveal } from '../ui/Reveal';
import { NextMealCard } from './NextMealCard';
import { NudgeBanner } from './NudgeBanner';
import { TargetsLeftCard } from './TargetsLeftCard';
import { WaterCard } from './WaterCard';
import { WorkoutCard } from './WorkoutCard';
import { todayPageStyles as styles } from './TodayPage.styles';

const S = TODAY_STRINGS;
const DISMISS_KEYS = {
  restart: 'fitmind-today-restart-dismissed',
  reminders: 'fitmind-today-reminders-dismissed',
  install: 'fitmind-today-install-dismissed',
} as const;
type DismissKey = keyof typeof DISMISS_KEYS;
const REMINDER_SOURCE = 'reminder';

/** Where onboarding leaves the setup result for Today to pick up. */
export type TodayLocationState = { setup?: SetupResult } | null;

/** One screen for the day: next meal, workout, water, what's left, and gentle prompts. */
export function TodayPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const status = useTodayStatus();
  const nutrition = useNutritionToday();
  const enableReminders = useEnableReminders();
  const { canInstall, install } = useInstallPrompt();
  const today = status.data?.date ?? '';
  const [dismissed, setDismissed] = useState<Record<DismissKey, string | null>>(() => ({
    restart: readDismissed(DISMISS_KEYS.restart),
    reminders: readDismissed(DISMISS_KEYS.reminders),
    install: readDismissed(DISMISS_KEYS.install),
  }));

  const setup = (location.state as TodayLocationState)?.setup;
  const planPending = setup?.meal_plan === 'pending';

  useEffect(() => {
    trackEvent('today_viewed');
    if (params.get('from') === REMINDER_SOURCE) {
      trackEvent('reminder_opened');
      params.delete('from');
      setParams(params, { replace: true });
    }
    // Once per visit to the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (setup && !planPending) toast.success(S.setup.ready, { id: 'instant-setup' });
  }, [setup, planPending]);

  function dismiss(key: DismissKey, value: string) {
    writeDismissed(DISMISS_KEYS[key], value);
    setDismissed((prev) => ({ ...prev, [key]: value }));
  }

  function handleRestart() {
    trackEvent('restart_action');
    dismiss('restart', today);
    document.getElementById('today-next-meal')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleEnableReminders() {
    enableReminders.mutate(undefined, {
      onSuccess: (result) => {
        if (result === 'on') toast.success(S.reminders.on);
        else toast.error(S.reminders.blocked);
      },
      onError: (error) => toast.error(resolveApiError(error, S.reminders.error)),
    });
  }

  const data = status.data;
  const restart = data?.restart;
  const showRestart = Boolean(restart?.show) && dismissed.restart !== today;
  const showReminders =
    Boolean(data?.push_available) &&
    !data?.push_subscribed &&
    pushSupport() === 'supported' &&
    !dismissed.reminders;
  const showInstall = canInstall && !dismissed.install;
  const showCheckIn = data ? !data.recovery_checked_in : false;
  const name = firstName(user);
  const statusError = queryErrorMessage(status.error, S.loadError);

  return (
    <Box sx={styles.root}>
      <Typography variant="overline" sx={styles.date}>
        {formatToday()}
      </Typography>
      <PageHeader title={S.greeting[dayPart()](name)} subtitle={S.subtitle} />

      {statusError && (
        <Box sx={styles.section}>
          <ErrorState message={statusError} onRetry={() => status.refetch()} />
        </Box>
      )}

      <Box sx={styles.nudges}>
        {showRestart && restart && (
          <Reveal>
            <NudgeBanner
              icon={WbSunnyRounded}
              tone="warning"
              title={S.restart.title}
              body={S.restart.body(restart.missed_days)}
              actionLabel={S.restart.action}
              onAction={handleRestart}
              dismissLabel={S.restart.dismiss}
              onDismiss={() => dismiss('restart', today)}
            />
          </Reveal>
        )}
        {showCheckIn && (
          <Reveal index={1}>
            <NudgeBanner
              icon={MonitorHeartRounded}
              tone="secondary"
              title={S.recovery.title}
              body={S.recovery.body}
              actionLabel={S.recovery.action}
              onAction={() => navigate(ROUTES.RECOVERY)}
            />
          </Reveal>
        )}
      </Box>

      <Box sx={styles.grid}>
        <Box sx={styles.wide} id="today-next-meal">
          <Reveal index={0} fill>
            <NextMealCard planPending={planPending} />
          </Reveal>
        </Box>
        <Box sx={styles.narrow}>
          <Reveal index={1} fill>
            <TargetsLeftCard summary={nutrition.data} loading={nutrition.isPending} />
          </Reveal>
        </Box>
        <Box sx={styles.wide}>
          <Reveal index={2} fill>
            <WorkoutCard />
          </Reveal>
        </Box>
        <Box sx={styles.narrow}>
          <Reveal index={3} fill>
            <WaterCard waterMl={nutrition.data?.water_ml ?? 0} goalMl={nutrition.data?.water_goal_ml ?? null} />
          </Reveal>
        </Box>
        {showReminders && (
          <Box sx={styles.full}>
            <Reveal index={4}>
              <NudgeBanner
                icon={NotificationsActiveRounded}
                title={S.remindersCard.title}
                body={S.remindersCard.body}
                actionLabel={enableReminders.isPending ? S.remindersCard.working : S.remindersCard.action}
                onAction={handleEnableReminders}
                busy={enableReminders.isPending}
                dismissLabel={S.remindersCard.dismiss}
                onDismiss={() => dismiss('reminders', today || '1')}
              />
            </Reveal>
          </Box>
        )}
        {showInstall && (
          <Box sx={styles.full}>
            <Reveal index={5}>
              <NudgeBanner
                icon={GetAppRounded}
                tone="info"
                title={S.install.title}
                body={S.install.body}
                actionLabel={S.install.action}
                onAction={() => void install()}
                dismissLabel={S.install.dismiss}
                onDismiss={() => dismiss('install', today || '1')}
              />
            </Reveal>
          </Box>
        )}
      </Box>
    </Box>
  );
}
