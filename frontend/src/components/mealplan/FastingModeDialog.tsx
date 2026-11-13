import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import toast from 'react-hot-toast';
import { INDIA_FIRST_STRINGS } from '../../constants/indiaFirstStrings';
import { useAddFastingMode } from '../../hooks/queries/useDietPlanQueries';
import { resolveApiError } from '../../lib/apiClient';
import { addDaysIso, toIsoDate } from '../../utils/date';
import type { FastingCatalogueEntry, FastingModeKey } from '../../types/indiaFirst';
import { fastingModeDialogStyles as styles } from './FastingModeDialog.styles';

const S = INDIA_FIRST_STRINGS.fasting;
const D = S.dialog;
// Sample sehri and iftar times; the user should replace them with their local ones.
const DEFAULT_DAWN = '05:00';
const DEFAULT_SUNSET = '18:30';

type FastingModeDialogProps = {
  catalogue: FastingCatalogueEntry[];
  onClose: () => void;
};

/** Turn a fasting or festival mode on for the user's own dates. */
export function FastingModeDialog({ catalogue, onClose }: FastingModeDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const add = useAddFastingMode();
  const [mode, setMode] = useState<FastingModeKey>(catalogue[0]?.key ?? 'navratri');
  const [start, setStart] = useState(() => toIsoDate(new Date()));
  const [endEdited, setEndEdited] = useState<string | null>(null);
  const [dawn, setDawn] = useState(DEFAULT_DAWN);
  const [sunset, setSunset] = useState(DEFAULT_SUNSET);
  const entry = catalogue.find((c) => c.key === mode);
  const single = Boolean(entry?.single_day);
  const ramadan = entry?.timing === 'ramadan';
  // The end date follows the mode's usual length until the user changes it.
  const defaultEnd = useMemo(
    () => (entry ? addDaysIso(start, Math.max(1, entry.usual_days) - 1) : start),
    [entry, start],
  );
  const end = single ? start : (endEdited ?? defaultEnd);
  const invalid = !start || end < start || (ramadan && dawn >= sunset);

  function choose(key: FastingModeKey) {
    setMode(key);
    setEndEdited(null);
  }

  async function save() {
    try {
      await add.mutateAsync({
        mode,
        start_date: start,
        end_date: end,
        ...(ramadan ? { dawn_time: dawn, sunset_time: sunset } : {}),
      });
      toast.success(D.saved(INDIA_FIRST_STRINGS.modeNames[mode]));
      onClose();
    } catch (error) {
      toast.error(resolveApiError(error, S.error));
    }
  }

  return (
    <Dialog open onClose={add.isPending ? undefined : onClose} fullWidth maxWidth="sm" fullScreen={fullScreen}>
      <DialogTitle>{D.title}</DialogTitle>
      <DialogContent sx={styles.content}>
        <Typography variant="subtitle2">{D.modeLabel}</Typography>
        <Box sx={styles.modes} role="radiogroup" aria-label={D.modeLabel}>
          {catalogue.map((option) => (
            <Box
              key={option.key}
              component="button"
              type="button"
              role="radio"
              aria-checked={mode === option.key}
              onClick={() => choose(option.key)}
              sx={styles.mode(mode === option.key)}
            >
              <Typography variant="subtitle1" component="span" sx={styles.modeName}>
                {INDIA_FIRST_STRINGS.modeNames[option.key]}
              </Typography>
              <Typography variant="body2" color="text.secondary" component="span">
                {S.descriptions[option.key]}
              </Typography>
            </Box>
          ))}
        </Box>

        <Stack sx={styles.dates}>
          <TextField
            type="date"
            label={D.start}
            value={start}
            onChange={(e) => setStart(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />
          {!single && (
            <TextField
              type="date"
              label={D.end}
              value={end}
              onChange={(e) => setEndEdited(e.target.value)}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: start } }}
              fullWidth
            />
          )}
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {single ? D.singleDay : entry ? D.usualLength(entry.usual_days) : ''} {D.calendarHint}
        </Typography>

        {ramadan && (
          <>
            <Stack sx={styles.dates}>
              <TextField
                type="time"
                label={D.dawn}
                value={dawn}
                onChange={(e) => setDawn(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
              <TextField
                type="time"
                label={D.sunset}
                value={sunset}
                onChange={(e) => setSunset(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
            </Stack>
            <Alert severity="info" variant="outlined">
              {D.ramadanHint}
            </Alert>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={add.isPending}>
          {D.cancel}
        </Button>
        <Button
          variant="contained"
          onClick={save}
          disabled={invalid || add.isPending}
          startIcon={add.isPending ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {add.isPending ? D.saving : D.save}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
