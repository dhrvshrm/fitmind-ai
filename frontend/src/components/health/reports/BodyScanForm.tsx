import { useState, type ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  DialogActions,
  DialogContent,
  FormControlLabel,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import toast from 'react-hot-toast';
import { BODY_SCAN_STRINGS } from '../../../constants/bodyScanStrings';
import { todayIso } from '../../../constants/labReports';
import { resolveApiError } from '../../../lib/apiClient';
import type {
  BodyScanFieldKey,
  BodyScanRequest,
  BodyScanValues,
  SavedBodyScan,
  ScanSegment,
  SegmentKey,
} from '../../../types/bodyScan';
import { bodyScanFormStyles as styles } from './BodyScanForm.styles';

const S = BODY_SCAN_STRINGS;
const MAIN_FIELDS: BodyScanFieldKey[] = [
  'weight_kg',
  'skeletal_muscle_mass_kg',
  'body_fat_percent',
  'body_fat_mass_kg',
  'visceral_fat_level',
  'bmr_kcal',
  'fat_free_mass_kg',
  'total_body_water_l',
];
const SEGMENT_KEYS: SegmentKey[] = ['left_arm', 'right_arm', 'trunk', 'left_leg', 'right_leg'];

type SegmentDraft = { lean_kg: string; lean_percent: string };

type BodyScanFormProps = {
  /** Values read from the printout, or empty for typing one in. */
  initial?: BodyScanValues | null;
  /** Shown above the fields (AI read it, or nothing could be read). */
  notice?: string | null;
  submit: (body: BodyScanRequest) => Promise<SavedBodyScan>;
  saving: boolean;
  /** Closes the form (after a save or on cancel). */
  onDone: () => void;
  /** Called once the scan is saved. */
  onSaved?: () => void;
  cancelLabel: string;
  /** Optional extra action (open the printout). */
  extra?: ReactNode;
};

const text = (value: number | null | undefined) => (value === null || value === undefined ? '' : String(value));

/** Parses a typed number: null when blank, NaN when not a number. */
const parse = (value: string) => {
  const trimmed = value.trim().replace(',', '.');
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0 ? n : Number.NaN;
};

/** The scan's numbers to check or type in: main results, then muscle by body part. */
export function BodyScanForm({
  initial,
  notice,
  submit,
  saving,
  onDone,
  onSaved,
  cancelLabel,
  extra,
}: BodyScanFormProps) {
  const [date, setDate] = useState(initial?.measured_at ?? todayIso());
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(MAIN_FIELDS.map((key) => [key, text(initial?.[key])])),
  );
  const [segments, setSegments] = useState<Record<SegmentKey, SegmentDraft>>(
    () =>
      Object.fromEntries(
        SEGMENT_KEYS.map((key) => {
          const seg: ScanSegment = initial?.segments?.[key] ?? {};
          return [key, { lean_kg: text(seg.lean_kg), lean_percent: text(seg.lean_percent) }];
        }),
      ) as Record<SegmentKey, SegmentDraft>,
  );
  const [useForProfile, setUseForProfile] = useState(true);

  const bad = (value: string) => Number.isNaN(parse(value) as number);
  const invalid =
    MAIN_FIELDS.some((key) => bad(values[key])) ||
    SEGMENT_KEYS.some((key) => bad(segments[key].lean_kg) || bad(segments[key].lean_percent));

  async function handleSave() {
    if (invalid) {
      toast.error(S.form.invalid);
      return;
    }
    const scan: BodyScanValues = { measured_at: date || null, device: initial?.device ?? null, segments: {} };
    for (const key of MAIN_FIELDS) {
      const n = parse(values[key]);
      if (n !== null) scan[key] = n;
    }
    // Fields the form doesn't show (protein, minerals, score) are kept as read.
    for (const key of ['protein_kg', 'minerals_kg', 'score'] as BodyScanFieldKey[]) {
      if (initial?.[key] !== undefined && initial?.[key] !== null) scan[key] = initial[key];
    }
    for (const key of SEGMENT_KEYS) {
      const lean = parse(segments[key].lean_kg);
      const pct = parse(segments[key].lean_percent);
      if (lean !== null || pct !== null) scan.segments![key] = { lean_kg: lean, lean_percent: pct };
    }
    const hasAny = MAIN_FIELDS.some((key) => scan[key] !== undefined) || Object.keys(scan.segments!).length > 0;
    if (!hasAny) {
      toast.error(S.form.empty);
      return;
    }
    try {
      const saved = await submit({ scan, use_for_profile: useForProfile });
      toast.success(saved.profile_updated.length ? S.form.savedProfile : S.form.saved);
      onSaved?.();
      onDone();
    } catch (err) {
      toast.error(resolveApiError(err, S.form.error));
    }
  }

  return (
    <>
      <DialogContent dividers>
        <Box sx={styles.toolbar}>
          <TextField
            type="date"
            size="small"
            label={S.fields.measured_at}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: todayIso() } }}
            sx={styles.date}
          />
          {extra}
        </Box>
        {notice && (
          <Alert severity="info" variant="outlined" sx={styles.notice}>
            {notice}
          </Alert>
        )}

        <Typography variant="subtitle2" sx={styles.section}>
          {S.form.main}
        </Typography>
        <Box sx={styles.grid}>
          {MAIN_FIELDS.map((key) => (
            <TextField
              key={key}
              size="small"
              label={S.fields[key]}
              value={values[key]}
              error={bad(values[key])}
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
              slotProps={{
                htmlInput: { inputMode: 'decimal' },
                input: S.units[key]
                  ? { endAdornment: <InputAdornment position="end">{S.units[key]}</InputAdornment> }
                  : undefined,
              }}
            />
          ))}
        </Box>

        <Typography variant="subtitle2" sx={styles.section}>
          {S.form.segmentTitle}
        </Typography>
        <Typography variant="caption" color="text.secondary" component="p" sx={styles.help}>
          {S.form.segmentHelp}
        </Typography>
        <Box sx={styles.segments}>
          {SEGMENT_KEYS.map((key) => (
            <Box key={key} sx={styles.segmentRow}>
              <Typography variant="body2" sx={styles.segmentName}>
                {S.segments[key]}
              </Typography>
              <TextField
                size="small"
                label={S.form.leanKg}
                value={segments[key].lean_kg}
                error={bad(segments[key].lean_kg)}
                onChange={(e) => setSegments((s) => ({ ...s, [key]: { ...s[key], lean_kg: e.target.value } }))}
                slotProps={{ htmlInput: { inputMode: 'decimal' } }}
              />
              <TextField
                size="small"
                label={S.form.leanPercent}
                value={segments[key].lean_percent}
                error={bad(segments[key].lean_percent)}
                onChange={(e) => setSegments((s) => ({ ...s, [key]: { ...s[key], lean_percent: e.target.value } }))}
                slotProps={{ htmlInput: { inputMode: 'decimal' } }}
              />
            </Box>
          ))}
        </Box>

        <FormControlLabel
          sx={styles.profile}
          control={<Checkbox checked={useForProfile} onChange={(e) => setUseForProfile(e.target.checked)} />}
          label={
            <Box>
              <Typography variant="body2" sx={styles.profileLabel}>
                {S.form.useForProfile}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {S.form.useForProfileHelp}
              </Typography>
            </Box>
          }
        />
      </DialogContent>
      <DialogActions sx={styles.actions}>
        <Button onClick={onDone}>{cancelLabel}</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {saving ? S.form.saving : S.form.save}
        </Button>
      </DialogActions>
    </>
  );
}
