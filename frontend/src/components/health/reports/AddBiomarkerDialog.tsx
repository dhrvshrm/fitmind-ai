import { useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import toast from 'react-hot-toast';
import { todayIso } from '../../../constants/labReports';
import { LAB_REPORT_STRINGS } from '../../../constants/labReportStrings';
import { useAddBiomarker, useBiomarkerCatalog } from '../../../hooks/queries/useLabReportQueries';
import { resolveApiError } from '../../../lib/apiClient';
import type { CatalogBiomarker } from '../../../types/labReports';
import { addBiomarkerDialogStyles as styles } from './AddBiomarkerDialog.styles';

const S = LAB_REPORT_STRINGS.add;
const C = LAB_REPORT_STRINGS.results.categories;

/** Add one result from a past test by hand: pick the test, type the value. */
export function AddBiomarkerDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const catalog = useBiomarkerCatalog();
  const add = useAddBiomarker();
  const [test, setTest] = useState<CatalogBiomarker | null>(null);
  const [value, setValue] = useState('');
  const [date, setDate] = useState(todayIso());
  const number = Number(value.replace(',', '.'));
  const valid = Boolean(test) && value.trim() !== '' && Number.isFinite(number) && number >= 0;
  const usual = test ? LAB_REPORT_STRINGS.fmtRange(test.reference.low, test.reference.high, test.unit) : '';

  async function handleSave() {
    if (!test || !valid) {
      toast.error(S.required);
      return;
    }
    try {
      await add.mutateAsync({ code: test.code, name: test.name, value: number, unit: test.unit, measured_at: date });
      toast.success(S.saved);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(resolveApiError(err, S.error));
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{S.title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={styles.subtitle}>
          {S.subtitle}
        </Typography>
        <Box sx={styles.fields}>
          <Autocomplete
            options={[...(catalog.data ?? [])].sort((a, b) => a.category.localeCompare(b.category))}
            groupBy={(option) => C[option.category] ?? C.other}
            getOptionLabel={(option) => option.name}
            value={test}
            onChange={(_, next) => setTest(next)}
            loading={catalog.isPending}
            noOptionsText={S.noOptions}
            renderInput={(params) => <TextField {...params} label={S.biomarker} autoFocus />}
          />
          <TextField
            label={S.value}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            helperText={usual ? S.usual(usual) : test?.about}
            slotProps={{
              htmlInput: { inputMode: 'decimal' },
              input: test?.unit
                ? { endAdornment: <InputAdornment position="end">{test.unit}</InputAdornment> }
                : undefined,
            }}
          />
          <TextField
            type="date"
            label={S.date}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: todayIso() } }}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={styles.actions}>
        <Button onClick={onClose}>{S.cancel}</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!valid || add.isPending}
          startIcon={add.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {add.isPending ? S.saving : S.save}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
