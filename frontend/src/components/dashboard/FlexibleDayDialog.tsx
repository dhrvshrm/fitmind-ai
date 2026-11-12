import { useState, type FormEvent } from 'react';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MenuItem,
  Slider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import toast from 'react-hot-toast';
import { PROGRESS_STRINGS } from '../../constants/progressStrings';
import { STRINGS } from '../../constants/strings';
import { useMarkFlexibleDay } from '../../hooks/queries/useProgressQueries';
import { resolveApiError } from '../../lib/apiClient';
import type { FlexibleWeek } from '../../types/progress';
import { toIsoDate } from '../../utils/date';
import { flexibleDayDialogStyles as styles } from './FlexibleDayDialog.styles';

const S = PROGRESS_STRINGS.flexible;
const DAYS_AHEAD = 60;
const EXTRA_STEP = 50;

type FlexibleDayDialogProps = {
  open: boolean;
  week: FlexibleWeek;
  onClose: () => void;
};

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

/** Pick a day, the occasion and how much extra to allow. */
export function FlexibleDayDialog({ open, week, onClose }: FlexibleDayDialogProps) {
  const today = toIsoDate(new Date());
  const { limits } = week;
  const [date, setDate] = useState(today);
  const [reason, setReason] = useState(limits.reasons[0] ?? 'weekend');
  const [extra, setExtra] = useState(limits.default_extra_kcal);
  const mark = useMarkFlexibleDay();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await mark.mutateAsync({ date, reason, extra_kcal: extra });
      toast.success(S.saved);
      onClose();
    } catch (err) {
      toast.error(resolveApiError(err, S.error));
    }
  }

  return (
    <Dialog open={open} onClose={mark.isPending ? undefined : onClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit} noValidate>
        <DialogTitle>{S.dialogTitle}</DialogTitle>
        <DialogContent>
          <DialogContentText variant="body2">{S.dialogBody}</DialogContentText>
          <Stack sx={styles.fields}>
            <TextField
              type="date"
              label={S.dayLabel}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={mark.isPending}
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { min: week.week_start, max: addDays(today, DAYS_AHEAD) },
              }}
            />
            <TextField
              select
              label={S.reasonLabel}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={mark.isPending}
            >
              {limits.reasons.map((r) => (
                <MenuItem key={r} value={r}>
                  {S.reasons[r] ?? r}
                </MenuItem>
              ))}
            </TextField>
            <Stack>
              <Stack sx={styles.sliderLabel}>
                <Typography variant="body2">{S.extraLabel}</Typography>
                <Typography variant="body2" sx={styles.extraValue}>
                  {S.extraValue(extra)}
                </Typography>
              </Stack>
              <Slider
                value={extra}
                min={limits.min_extra_kcal}
                max={limits.max_extra_kcal}
                step={EXTRA_STEP}
                onChange={(_, value) => setExtra(value as number)}
                disabled={mark.isPending}
                aria-label={S.extraLabel}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {S.limit(limits.max_per_week)}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={styles.actions}>
          <Button onClick={onClose} disabled={mark.isPending} color="inherit">
            {STRINGS.ui.cancel}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={mark.isPending || !date}
            startIcon={mark.isPending ? <CircularProgress size={18} color="inherit" /> : undefined}
          >
            {S.save}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
