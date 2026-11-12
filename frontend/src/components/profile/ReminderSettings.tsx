import { useEffect, useState } from 'react';
import { Alert, Box, Button, Skeleton, Switch, TextField, Typography } from '@mui/material';
import { NotificationsActiveRounded, NotificationsOffRounded } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { TODAY_STRINGS } from '../../constants/todayStrings';
import {
  useDisableReminders,
  useEnableReminders,
  useReminders,
  useSendTestReminder,
  useUpdateReminders,
} from '../../hooks/queries/useHabitQueries';
import { queryErrorMessage } from '../../hooks/queries/queryHelpers';
import { resolveApiError } from '../../lib/apiClient';
import { currentSubscription, pushSupport, type PushSupport } from '../../lib/push';
import type { ReminderSettingsUpdate, ReminderToggle } from '../../types/habit';
import { ErrorState } from '../ui/ErrorState';
import { SectionCard } from '../ui/SectionCard';
import { reminderSettingsStyles as styles } from './ReminderSettings.styles';

const S = TODAY_STRINGS.reminders;
const TOGGLES: ReminderToggle[] = ['meals', 'workout', 'water', 'comeback'];
const HINTS: Record<ReminderToggle, string> = {
  meals: S.toggles.mealsHint,
  workout: S.toggles.workoutHint,
  water: S.toggles.waterHint,
  comeback: S.toggles.comebackHint,
};

/** Push reminders: this device on or off, which reminders, and their times. */
export function ReminderSettings() {
  const state = useReminders();
  const update = useUpdateReminders();
  const enable = useEnableReminders();
  const disable = useDisableReminders();
  const test = useSendTestReminder();
  const [support] = useState<PushSupport>(pushSupport);
  const [deviceOn, setDeviceOn] = useState(false);

  useEffect(() => {
    let active = true;
    currentSubscription()
      .then((sub) => active && setDeviceOn(Boolean(sub)))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [state.data?.subscribed]);

  function save(changes: ReminderSettingsUpdate) {
    update.mutate(changes, {
      onError: (error) => toast.error(resolveApiError(error, S.error)),
    });
  }

  function turnOn() {
    enable.mutate(undefined, {
      onSuccess: (result) => {
        if (result === 'on') {
          setDeviceOn(true);
          toast.success(S.on);
        } else {
          toast.error(S.blocked);
        }
      },
      onError: (error) => toast.error(resolveApiError(error, S.error)),
    });
  }

  function turnOff() {
    disable.mutate(undefined, {
      onSuccess: () => {
        setDeviceOn(false);
        toast.success(S.off);
      },
      onError: (error) => toast.error(resolveApiError(error, S.error)),
    });
  }

  function sendTest() {
    test.mutate(undefined, {
      onSuccess: (delivered) => (delivered > 0 ? toast.success(S.testSent) : toast.error(S.testNone)),
      onError: (error) => toast.error(resolveApiError(error, S.error)),
    });
  }

  const loadError = queryErrorMessage(state.error, S.error);
  const data = state.data;

  return (
    <SectionCard title={S.title} subtitle={S.subtitle}>
      {loadError && <ErrorState message={loadError} onRetry={() => state.refetch()} />}
      {state.isPending && <Skeleton variant="rounded" sx={styles.skeleton} />}

      {data && !data.push_available && <Alert severity="info">{S.unavailable}</Alert>}

      {data?.push_available && (
        <>
          {support === 'unsupported' && <Alert severity="info">{S.unsupported}</Alert>}
          {support === 'blocked' && <Alert severity="warning">{S.blocked}</Alert>}

          {support === 'supported' && (
            <Box sx={styles.device}>
              <Box sx={styles.deviceStatus}>
                {deviceOn ? (
                  <NotificationsActiveRounded color="primary" />
                ) : (
                  <NotificationsOffRounded color="disabled" />
                )}
                <Typography variant="body2">{deviceOn ? S.deviceOn : S.deviceOff}</Typography>
              </Box>
              <Box sx={styles.deviceActions}>
                {deviceOn ? (
                  <>
                    <Button variant="outlined" onClick={sendTest} disabled={test.isPending}>
                      {S.test}
                    </Button>
                    <Button color="inherit" onClick={turnOff} disabled={disable.isPending}>
                      {S.turnOff}
                    </Button>
                  </>
                ) : (
                  <Button variant="contained" onClick={turnOn} disabled={enable.isPending}>
                    {S.turnOn}
                  </Button>
                )}
              </Box>
            </Box>
          )}

          <Box sx={styles.toggles}>
            {TOGGLES.map((key) => (
              <Box key={key} sx={styles.toggleRow}>
                <Box sx={styles.toggleText}>
                  <Typography variant="body2" sx={styles.toggleLabel}>
                    {S.toggles[key]}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {HINTS[key]}
                  </Typography>
                </Box>
                <Switch
                  checked={data.settings[key]}
                  onChange={(e) => save({ [key]: e.target.checked })}
                  slotProps={{ input: { 'aria-label': S.toggles[key] } }}
                />
              </Box>
            ))}
          </Box>

          <Box sx={styles.times}>
            <TextField
              type="time"
              label={S.workoutTime}
              helperText={S.workoutTimeAuto}
              value={data.settings.workout_time ?? ''}
              onChange={(e) => save({ workout_time: e.target.value || null })}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              type="time"
              label={S.waterTime}
              value={data.settings.water_time}
              onChange={(e) => e.target.value && save({ water_time: e.target.value })}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Box>
        </>
      )}
    </SectionCard>
  );
}
