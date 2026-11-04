import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Skeleton,
  TextField,
  Typography,
} from '@mui/material';
import { AddRounded, DeleteOutlineRounded, MenuBookRounded } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { STRINGS } from '../../constants/strings';
import {
  useCreateUserFood,
  useDeleteUserFood,
  useUserFoods,
} from '../../hooks/queries/useNutritionQueries';
import { resolveApiError } from '../../lib/apiClient';
import type { UserFoodPayload } from '../../types/nutrition';
import { SectionCard } from '../ui/SectionCard';
import { EmptyState } from '../ui/EmptyState';
import { myFoodsStyles as styles } from './MyFoods.styles';

const S = STRINGS.nutrition.myFoods;
const F = STRINGS.nutrition.form;
const A = STRINGS.nutrition.mealActions;

type FormState = Record<keyof UserFoodPayload, string>;

const EMPTY_FORM: FormState = {
  name: '',
  serving_unit: 'serving',
  serving_grams: '100',
  calories: '',
  protein: '',
  carbs: '',
  fats: '',
  fiber: '',
};

const NUTRIENT_FIELDS: { key: keyof UserFoodPayload; label: string }[] = [
  { key: 'calories', label: F.calories },
  { key: 'protein', label: F.protein },
  { key: 'carbs', label: F.carbs },
  { key: 'fats', label: F.fats },
  { key: 'fiber', label: A.fiber },
];

/** The user's own foods and recipes; matched before the public databases. */
export function MyFoods() {
  const foods = useUserFoods();
  const createFood = useCreateUserFood();
  const deleteFood = useDeleteUserFood();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const nameMissing = !form.name.trim();
  const caloriesMissing = form.calories === '';

  function update(key: keyof UserFoodPayload, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCreate() {
    createFood.mutate(
      {
        name: form.name.trim(),
        serving_unit: form.serving_unit.trim() || EMPTY_FORM.serving_unit,
        serving_grams: Number(form.serving_grams) || 100,
        calories: Number(form.calories) || 0,
        protein: Number(form.protein) || 0,
        carbs: Number(form.carbs) || 0,
        fats: Number(form.fats) || 0,
        fiber: Number(form.fiber) || 0,
      },
      {
        onSuccess: () => {
          toast.success(S.added);
          setForm(EMPTY_FORM);
          setOpen(false);
        },
        onError: (error) => toast.error(resolveApiError(error, S.error)),
      },
    );
  }

  const list = foods.data ?? [];

  return (
    <SectionCard
      title={S.title}
      subtitle={S.subtitle}
      action={
        <Button size="small" startIcon={<AddRounded />} onClick={() => setOpen(true)}>
          {S.add}
        </Button>
      }
      flush={list.length > 0}
    >
      {foods.isPending && <Skeleton variant="rounded" sx={styles.skeleton} />}
      {!foods.isPending && list.length === 0 && (
        <EmptyState icon={MenuBookRounded} title={S.emptyTitle} description={S.empty} compact />
      )}
      {list.length > 0 && (
        <List disablePadding sx={styles.list}>
          {list.map((food, index) => (
            <ListItem
              key={food.id}
              divider={index < list.length - 1}
              sx={styles.item}
              secondaryAction={
                <IconButton
                  edge="end"
                  size="small"
                  aria-label={S.deleteAria(food.name)}
                  onClick={() =>
                    deleteFood.mutate(food.id, {
                      onSuccess: () => toast.success(S.deleted),
                      onError: (error) => toast.error(resolveApiError(error, S.error)),
                    })
                  }
                  disabled={deleteFood.isPending}
                >
                  <DeleteOutlineRounded fontSize="small" />
                </IconButton>
              }
            >
              <ListItemText
                primary={food.name}
                secondary={S.perServingSummary(food.per_serving.kcal, food.serving_unit)}
              />
            </ListItem>
          ))}
        </List>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{S.dialogTitle}</DialogTitle>
        <DialogContent>
          <Box sx={styles.form}>
            <TextField
              label={S.name}
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              fullWidth
              sx={styles.fullRow}
            />
            <TextField
              label={S.servingUnit}
              value={form.serving_unit}
              onChange={(e) => update('serving_unit', e.target.value)}
            />
            <TextField
              label={S.servingGrams}
              type="number"
              value={form.serving_grams}
              onChange={(e) => update('serving_grams', e.target.value)}
              slotProps={{ htmlInput: { min: 1 } }}
            />
            <Typography variant="subtitle2" sx={styles.fullRow}>
              {S.perServing}
            </Typography>
            {NUTRIENT_FIELDS.map(({ key, label }) => (
              <TextField
                key={key}
                label={label}
                type="number"
                value={form[key]}
                onChange={(e) => update(key, e.target.value)}
                slotProps={{ htmlInput: { min: 0 } }}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={styles.actions}>
          <Button color="inherit" onClick={() => setOpen(false)} disabled={createFood.isPending}>
            {A.cancel}
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={nameMissing || caloriesMissing || createFood.isPending}
          >
            {S.save}
          </Button>
        </DialogActions>
      </Dialog>
    </SectionCard>
  );
}
