import { useState } from 'react';
import { Box, Button, IconButton, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { CloseRounded, SwapHorizRounded } from '@mui/icons-material';
import { STRINGS } from '../../constants/strings';
import type { EstimatedItem, Food, Nutrients } from '../../types/nutrition';
import { withFood, withManualNutrients, withQuantity } from '../../utils/nutrition';
import { SourceBadge } from './SourceBadge';
import { FoodPicker } from './FoodPicker';
import { estimatedItemRowStyles as styles } from './EstimatedItemRow.styles';

const S = STRINGS.nutrition.review;
const F = STRINGS.nutrition.form;

type ManualField = 'kcal' | 'protein' | 'carbs' | 'fat';

const MANUAL_FIELDS: { key: ManualField; label: string }[] = [
  { key: 'kcal', label: F.calories },
  { key: 'protein', label: F.protein },
  { key: 'carbs', label: F.carbs },
  { key: 'fat', label: F.fats },
];

type EstimatedItemRowProps = {
  item: EstimatedItem;
  onChange: (item: EstimatedItem) => void;
  onRemove: () => void;
  disabled?: boolean;
};

/** One food in the review list: quantity, source, nutrients, and a way to fix it. */
export function EstimatedItemRow({ item, onChange, onRemove, disabled = false }: EstimatedItemRowProps) {
  const [pickerAnchor, setPickerAnchor] = useState<HTMLElement | null>(null);
  const [quantityText, setQuantityText] = useState(String(item.quantity));
  const needsValues = item.source === 'unresolved';
  const manual = item.source === 'manual' && item.per_100g === null;

  function commitQuantity(raw: string) {
    setQuantityText(raw);
    const value = Number(raw);
    if (value > 0) onChange(withQuantity(item, value));
  }

  function handlePick(food: Food) {
    setPickerAnchor(null);
    const next = withFood(item, food);
    setQuantityText(String(next.quantity));
    onChange(next);
  }

  function setManual(key: ManualField, raw: string) {
    const current: Nutrients = item.nutrients ?? { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    onChange(withManualNutrients(item, { ...current, [key]: Math.max(0, Number(raw) || 0) }));
  }

  return (
    <Box sx={styles.root}>
      <Stack sx={styles.header}>
        <Box sx={styles.titleBlock}>
          <Typography variant="subtitle2" sx={styles.name}>
            {item.name}
          </Typography>
          <SourceBadge kind="item" source={item.source} />
        </Box>
        <Stack sx={styles.actions}>
          <Tooltip title={S.changeFood}>
            <IconButton
              size="small"
              aria-label={S.changeFood}
              onClick={(e) => setPickerAnchor(e.currentTarget)}
              disabled={disabled}
            >
              <SwapHorizRounded fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={S.removeItem}>
            <IconButton size="small" aria-label={S.removeItem} onClick={onRemove} disabled={disabled}>
              <CloseRounded fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <Stack sx={styles.amountRow}>
        <TextField
          size="small"
          type="number"
          label={S.quantityLabel}
          value={quantityText}
          onChange={(e) => commitQuantity(e.target.value)}
          disabled={disabled}
          sx={styles.quantity}
          slotProps={{ htmlInput: { min: 0, step: 0.5 } }}
        />
        <Typography variant="body2" color="text.secondary" sx={styles.unit}>
          {S.amount(item.unit, item.grams)}
        </Typography>
        {item.nutrients && (
          <Typography variant="subtitle2" sx={styles.kcal}>
            {S.kcal(item.nutrients.kcal)}
          </Typography>
        )}
      </Stack>

      {item.nutrients && !needsValues && !manual && (
        <Typography variant="caption" color="text.secondary" sx={styles.macros}>
          {S.macros(item.nutrients.protein, item.nutrients.carbs, item.nutrients.fat, item.nutrients.fiber)}
        </Typography>
      )}

      {item.quantity_assumed && !needsValues && (
        <Typography variant="caption" color="text.secondary" sx={styles.hint}>
          {S.assumedQuantity}
        </Typography>
      )}
      {item.note && (
        <Typography variant="caption" color="text.secondary" sx={styles.hint}>
          {item.note}
        </Typography>
      )}

      {(needsValues || manual) && (
        <Box>
          {needsValues && (
            <Typography variant="caption" color="error" sx={styles.hint}>
              {S.needsValues[item.unresolved_reason ?? 'ai_failed']}
            </Typography>
          )}
          <Box sx={styles.manualGrid}>
            {MANUAL_FIELDS.map((field) => (
              <TextField
                key={field.key}
                size="small"
                type="number"
                label={field.label}
                value={item.nutrients ? item.nutrients[field.key] : ''}
                onChange={(e) => setManual(field.key, e.target.value)}
                disabled={disabled}
                slotProps={{ htmlInput: { min: 0 } }}
              />
            ))}
          </Box>
        </Box>
      )}

      {pickerAnchor && (
        <FoodPicker
          anchorEl={pickerAnchor}
          initialQuery={item.query}
          alternatives={item.alternatives}
          onPick={handlePick}
          onClose={() => setPickerAnchor(null)}
        />
      )}
      {needsValues && item.alternatives.length > 0 && !pickerAnchor && (
        <Button size="small" onClick={(e) => setPickerAnchor(e.currentTarget)} sx={styles.suggestButton}>
          {S.suggestions}
        </Button>
      )}
    </Box>
  );
}
