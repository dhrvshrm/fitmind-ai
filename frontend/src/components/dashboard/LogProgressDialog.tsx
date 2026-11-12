import { useState, type FormEvent } from 'react';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import toast from 'react-hot-toast';
import { PROGRESS_STRINGS } from '../../constants/progressStrings';
import { STRINGS } from '../../constants/strings';
import { useLogMeasurement, useLogWeight } from '../../hooks/queries/useProgressQueries';
import { resolveApiError } from '../../lib/apiClient';
import { toIsoDate } from '../../utils/date';
import { logProgressDialogStyles as styles } from './LogProgressDialog.styles';

const S = PROGRESS_STRINGS.logDialog;
const BACKFILL_DAYS = 7;

type LogProgressDialogProps = {
  open: boolean;
  mode: 'weight' | 'measurement';
  onClose: () => void;
};

function dateOptions(): { value: string; label: string }[] {
  const today = new Date();
  return Array.from({ length: BACKFILL_DAYS + 1 }, (_, n) => {
    const day = new Date(today);
    day.setDate(today.getDate() - n);
    return { value: toIsoDate(day), label: n === 0 ? S.today : S.daysAgo(n) };
  });
}

function parse(value: string, min: number, max: number): number | null {
  if (value.trim() === '') return null;
  const n = Number(value.replace(',', '.'));
  return Number.isFinite(n) && n >= min && n <= max ? n : Number.NaN;
}

/** Add a weigh-in, or a waist (and optional hip) measurement, for today or the last week. */
export function LogProgressDialog({ open, mode, onClose }: LogProgressDialogProps) {
  const options = dateOptions();
  const [date, setDate] = useState(options[0].value);
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const logWeight = useLogWeight();
  const logMeasurement = useLogMeasurement();
  const busy = logWeight.isPending || logMeasurement.isPending;

  function close() {
    setFirst('');
    setSecond('');
    onClose();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      if (mode === 'weight') {
        const weight = parse(first, 30, 300);
        if (weight === null || Number.isNaN(weight)) {
          toast.error(S.invalidWeight);
          return;
        }
        await logWeight.mutateAsync({ weight_kg: weight, date });
        toast.success(S.weightSaved);
      } else {
        const waist = parse(first, 40, 250);
        const hip = parse(second, 50, 250);
        if (waist === null || Number.isNaN(waist)) {
          toast.error(S.invalidWaist);
          return;
        }
        if (hip !== null && Number.isNaN(hip)) {
          toast.error(S.invalidHip);
          return;
        }
        await logMeasurement.mutateAsync({ waist_cm: waist, hip_cm: hip ?? undefined, date });
        toast.success(S.measurementSaved);
      }
      close();
    } catch (err) {
      toast.error(resolveApiError(err, S.error));
    }
  }

  return (
    <Dialog open={open} onClose={busy ? undefined : close} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit} noValidate>
        <DialogTitle>{mode === 'weight' ? S.weightTitle : S.measurementTitle}</DialogTitle>
        <DialogContent>
          <Stack sx={styles.fields}>
            <TextField
              autoFocus
              label={mode === 'weight' ? S.weightLabel : S.waistLabel}
              value={first}
              onChange={(e) => setFirst(e.target.value)}
              disabled={busy}
              slotProps={{ htmlInput: { inputMode: 'decimal', maxLength: 6 } }}
            />
            {mode === 'measurement' && (
              <TextField
                label={S.hipLabel}
                value={second}
                onChange={(e) => setSecond(e.target.value)}
                disabled={busy}
                slotProps={{ htmlInput: { inputMode: 'decimal', maxLength: 6 } }}
              />
            )}
            <TextField select label={S.dateLabel} value={date} onChange={(e) => setDate(e.target.value)} disabled={busy}>
              {options.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={styles.actions}>
          <Button onClick={close} disabled={busy} color="inherit">
            {STRINGS.ui.cancel}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={busy || first.trim() === ''}
            startIcon={busy ? <CircularProgress size={18} color="inherit" /> : undefined}
          >
            {busy ? S.saving : S.save}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
