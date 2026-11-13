import { useState } from 'react';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import toast from 'react-hot-toast';
import { INDIA_FIRST_STRINGS } from '../../constants/indiaFirstStrings';
import { useUpdateShiftTimes } from '../../hooks/queries/useDietPlanQueries';
import { resolveApiError } from '../../lib/apiClient';
import type { Lifestyle } from '../../types/onboarding';
import type { ShiftSchedule } from '../../types/indiaFirst';
import { shiftTimesDialogStyles as styles } from './ShiftTimesDialog.styles';

const S = INDIA_FIRST_STRINGS.shift;
const SCHEDULES: ShiftSchedule[] = ['day', 'night_shift', 'rotating_shifts'];
const DEFAULT_WAKE = '07:00';
const DEFAULT_SLEEP = '23:00';
// Same window the server accepts (night shifts included).
const MIN_SLEEP_HOURS = 3;
const MAX_SLEEP_HOURS = 14;
const MINUTES_PER_DAY = 24 * 60;

function minutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Hours between going to sleep and waking, across midnight if needed. */
function sleepHours(wake: string, sleep: string): number {
  return (((minutes(wake) - minutes(sleep)) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY / 60;
}

type ShiftTimesDialogProps = {
  lifestyle: Lifestyle | undefined;
  onClose: () => void;
};

/** Wake and sleep times and work pattern; the plan's meal times follow them. */
export function ShiftTimesDialog({ lifestyle, onClose }: ShiftTimesDialogProps) {
  const update = useUpdateShiftTimes();
  const current = lifestyle?.work_schedule;
  const [schedule, setSchedule] = useState<string>(current ?? 'day');
  const [wake, setWake] = useState(lifestyle?.wake_time ?? DEFAULT_WAKE);
  const [sleep, setSleep] = useState(lifestyle?.sleep_time ?? DEFAULT_SLEEP);
  const hours = wake && sleep ? sleepHours(wake, sleep) : 0;
  const invalid = !wake || !sleep || hours < MIN_SLEEP_HOURS || hours > MAX_SLEEP_HOURS;
  // Keep a pattern from onboarding (student, at home...) selectable if it isn't a shift option.
  const options = current && !SCHEDULES.includes(current as ShiftSchedule) ? [current, ...SCHEDULES] : SCHEDULES;

  async function save() {
    try {
      await update.mutateAsync({ lifestyle: { work_schedule: schedule, wake_time: wake, sleep_time: sleep } });
      toast.success(S.saved);
      onClose();
    } catch (error) {
      toast.error(resolveApiError(error, S.error));
    }
  }

  return (
    <Dialog open onClose={update.isPending ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>{S.title}</DialogTitle>
      <DialogContent sx={styles.content}>
        <DialogContentText variant="body2">{S.description}</DialogContentText>
        <TextField select label={S.schedule} value={schedule} onChange={(e) => setSchedule(e.target.value)} fullWidth>
          {options.map((value) => (
            <MenuItem key={value} value={value}>
              {S.schedules[value as ShiftSchedule] ?? value}
            </MenuItem>
          ))}
        </TextField>
        <Stack sx={styles.times}>
          <TextField
            type="time"
            label={S.wake}
            value={wake}
            onChange={(e) => setWake(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />
          <TextField
            type="time"
            label={S.sleep}
            value={sleep}
            onChange={(e) => setSleep(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            error={invalid}
            helperText={invalid ? S.invalid : ' '}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={update.isPending}>
          {S.cancel}
        </Button>
        <Button
          variant="contained"
          onClick={save}
          disabled={invalid || update.isPending}
          startIcon={update.isPending ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {update.isPending ? S.saving : S.save}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
