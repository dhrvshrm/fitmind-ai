import { useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { AutoAwesomeRounded } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { SUPPLEMENT_TIMINGS } from '../../../constants/supplements';
import { SUPPLEMENT_STRINGS } from '../../../constants/supplementStrings';
import {
  useAddSupplement,
  useEstimateLabel,
  useUpdateSupplement,
} from '../../../hooks/queries/useSupplementQueries';
import { resolveApiError } from '../../../lib/apiClient';
import type {
  CatalogSupplement,
  SupplementMacros,
  SupplementTiming,
  UserSupplement,
} from '../../../types/supplements';
import { supplementDialogStyles as styles } from './SupplementDialog.styles';

const S = SUPPLEMENT_STRINGS.dialog;

type SupplementDialogProps = {
  /** Add this catalogue supplement... */
  catalog?: CatalogSupplement;
  /** ...or edit this tracked one; with neither, add a custom one. */
  editing?: UserSupplement;
  onClose: () => void;
};

/** Catalogue categories that carry calories, and the one for the person's own products. */
const CALORIE_CATEGORY = 'protein';
const CUSTOM_CATEGORY = 'custom';

const EMPTY_MACROS: SupplementMacros = { calories: 0, protein: 0, carbs: 0, fats: 0 };
const MACRO_KEYS: (keyof SupplementMacros)[] = ['calories', 'protein', 'carbs', 'fats'];

/** Track a supplement: dose, when, an optional reminder, and macros for protein powders. */
export function SupplementDialog({ catalog, editing, onClose }: SupplementDialogProps) {
  const add = useAddSupplement();
  const update = useUpdateSupplement();
  const busy = add.isPending || update.isPending;
  const startMacros = editing?.macros_per_serving ?? catalog?.macros_per_serving ?? null;

  const [name, setName] = useState(editing?.name ?? catalog?.name ?? '');
  const [dose, setDose] = useState(editing?.dose ?? catalog?.default_dose ?? '');
  const [product, setProduct] = useState('');
  const [estimateNote, setEstimateNote] = useState<string | null>(null);
  const estimate = useEstimateLabel();
  const [timing, setTiming] = useState<SupplementTiming>(
    editing?.timing ?? catalog?.suggested_timing ?? catalog?.default_timing ?? 'any',
  );
  const [reminder, setReminder] = useState(editing?.reminder_time ?? '');
  const [addsNutrition, setAddsNutrition] = useState(Boolean(startMacros));
  const [macros, setMacros] = useState<SupplementMacros>(
    startMacros
      ? { calories: startMacros.calories, protein: startMacros.protein, carbs: startMacros.carbs, fats: startMacros.fats }
      : EMPTY_MACROS,
  );
  const custom = !catalog && !editing;
  // Only protein powders, gainers and the person's own products carry calories:
  // creatine, vitamins and minerals never show the nutrition switch.
  const category = catalog?.category ?? editing?.category;
  const [canAddNutrition, setCanAddNutrition] = useState(
    custom || Boolean(startMacros) || category === CALORIE_CATEGORY || category === CUSTOM_CATEGORY,
  );
  const title = editing ? S.editTitle(editing.name) : catalog ? S.addTitle(catalog.name) : S.customTitle;

  /** Fill the serving and macros from the product name (an estimate the person can edit). */
  async function handleEstimate() {
    const name = product.trim();
    if (!name) {
      toast.error(S.needProduct);
      return;
    }
    try {
      const label = await estimate.mutateAsync({
        product: name,
        supplementId: catalog?.id ?? (editing?.category !== CUSTOM_CATEGORY ? editing?.supplement_id : null),
      });
      if (!label.matches_type) {
        // Whey's dialog with a creatine product: fill nothing, say why.
        setEstimateNote(S.mismatch(label.type_name ?? '', label.note));
        return;
      }
      setDose(label.serving_label);
      setAddsNutrition(label.adds_nutrition);
      if (label.adds_nutrition) {
        setCanAddNutrition(true);
        setMacros({ calories: label.calories, protein: label.protein, carbs: label.carbs, fats: label.fats });
      }
      setEstimateNote(S.estimated(label.confidence));
    } catch (err) {
      toast.error(resolveApiError(err, S.estimateError));
    }
  }

  async function handleSave() {
    if (custom && !name.trim()) {
      toast.error(S.nameRequired);
      return;
    }
    const shared = {
      dose: dose.trim(),
      timing,
      reminder_time: reminder || null,
      macros_per_serving: canAddNutrition && addsNutrition ? macros : null,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, changes: { ...shared, reminder_time: reminder || '' } });
        toast.success(S.saved);
      } else {
        await add.mutateAsync({
          ...shared,
          supplement_id: catalog?.id ?? null,
          name: custom ? name.trim() : null,
        });
        toast.success(S.added);
      }
      onClose();
    } catch (err) {
      toast.error(resolveApiError(err, S.error));
    }
  }

  return (
    <Dialog open onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box sx={styles.fields}>
          {custom && (
            <TextField
              label={S.name}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              slotProps={{ htmlInput: { maxLength: 80 } }}
            />
          )}
          <Box sx={styles.product}>
            <TextField
              label={S.productLabel}
              helperText={S.productHelp}
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              fullWidth
              slotProps={{ htmlInput: { maxLength: 80 } }}
            />
            <Button
              variant="outlined"
              onClick={handleEstimate}
              disabled={estimate.isPending}
              startIcon={estimate.isPending ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeRounded />}
              sx={styles.estimate}
            >
              {estimate.isPending ? S.estimating : S.estimate}
            </Button>
          </Box>
          {estimateNote && (
            <Typography variant="caption" color="secondary" component="p" sx={styles.estimateNote}>
              {estimateNote}
            </Typography>
          )}
          <TextField
            label={S.dose}
            helperText={S.doseHelp}
            value={dose}
            onChange={(e) => setDose(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 60 } }}
          />
          <TextField
            select
            label={S.timing}
            value={timing}
            onChange={(e) => setTiming(e.target.value as SupplementTiming)}
            helperText={catalog?.timing_reason ? S.suggestedWhy(catalog.timing_reason) : undefined}
          >
            {SUPPLEMENT_TIMINGS.map((t) => (
              <MenuItem key={t} value={t}>
                {SUPPLEMENT_STRINGS.timings[t]}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            type="time"
            label={S.reminder}
            helperText={S.reminderHelp}
            value={reminder}
            onChange={(e) => setReminder(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          {canAddNutrition && (
            <FormControlLabel
              control={<Switch checked={addsNutrition} onChange={(e) => setAddsNutrition(e.target.checked)} />}
              label={S.addsNutrition}
            />
          )}
          <Collapse in={canAddNutrition && addsNutrition} unmountOnExit>
            <Typography variant="caption" color="text.secondary" component="p" sx={styles.macrosHelp}>
              {S.macrosHelp}
            </Typography>
            <Box sx={styles.macros}>
              {MACRO_KEYS.map((key) => (
                <TextField
                  key={key}
                  type="number"
                  size="small"
                  label={S[key]}
                  value={macros[key]}
                  onChange={(e) => setMacros({ ...macros, [key]: Math.max(0, Number(e.target.value) || 0) })}
                  slotProps={{ htmlInput: { min: 0, step: key === 'calories' ? 5 : 0.5 } }}
                />
              ))}
            </Box>
          </Collapse>
        </Box>
      </DialogContent>
      <DialogActions sx={styles.actions}>
        <Button color="inherit" onClick={onClose} disabled={busy}>
          {S.cancel}
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={busy}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {busy ? S.saving : S.save}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
