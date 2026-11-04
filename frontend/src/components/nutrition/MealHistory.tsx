import { useState, type MouseEvent } from 'react';
import {
  Box,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import {
  BookmarkAddRounded,
  DeleteOutlineRounded,
  EditRounded,
  MoreVertRounded,
  RestaurantRounded,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { STRINGS } from '../../constants/strings';
import { MEAL_TYPE_OPTIONS } from '../../constants/nutrition';
import { useDeleteMeal } from '../../hooks/queries/useNutritionQueries';
import { resolveApiError } from '../../lib/apiClient';
import type { Meal } from '../../types/nutrition';
import { SectionCard } from '../ui/SectionCard';
import { EmptyState } from '../ui/EmptyState';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { SourceBadge } from './SourceBadge';
import { EditMealDialog } from './EditMealDialog';
import { SaveMealDialog } from './SaveMealDialog';
import { mealHistoryStyles as styles } from './MealHistory.styles';

const S = STRINGS.nutrition.history;
const A = STRINGS.nutrition.mealActions;

type MealHistoryProps = {
  meals: Meal[];
};

type DialogState = { kind: 'edit' | 'save' | 'delete'; meal: Meal } | null;

/** Today's logged meals with totals, where the numbers came from, and actions. */
export function MealHistory({ meals }: MealHistoryProps) {
  const [menu, setMenu] = useState<{ anchor: HTMLElement; meal: Meal } | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const deleteMeal = useDeleteMeal();

  function openDialog(kind: 'edit' | 'save' | 'delete') {
    if (menu) setDialog({ kind, meal: menu.meal });
    setMenu(null);
  }

  function confirmDelete(meal: Meal) {
    deleteMeal.mutate(meal.id, {
      onSuccess: () => {
        toast.success(A.deleted);
        setDialog(null);
      },
      onError: (error) => toast.error(resolveApiError(error, A.error)),
    });
  }

  return (
    <SectionCard title={S.title} flush={meals.length > 0}>
      {meals.length === 0 ? (
        <EmptyState icon={RestaurantRounded} title={S.emptyTitle} description={S.empty} compact />
      ) : (
        <List disablePadding sx={styles.list}>
          {meals.map((meal, index) => {
            const typeOption = MEAL_TYPE_OPTIONS.find((o) => o.value === meal.meal_type);
            const TypeIcon = typeOption?.icon;
            return (
              <ListItem key={meal.id} divider={index < meals.length - 1} sx={styles.item}>
                {TypeIcon && (
                  <Box sx={styles.typeIcon}>
                    <TypeIcon fontSize="small" />
                  </Box>
                )}
                <ListItemText
                  primary={meal.name}
                  secondary={
                    <Stack component="span" sx={styles.secondary}>
                      <span>{S.macros(meal.protein, meal.carbs, meal.fats)}</span>
                      <span>{S.meta(typeOption?.label ?? null, meal.eaten_at ?? null)}</span>
                    </Stack>
                  }
                  slotProps={{ primary: { sx: styles.mealName } }}
                />
                <Stack sx={styles.right}>
                  <Typography variant="body2" sx={styles.kcal}>
                    {S.kcal(Math.round(meal.calories))}
                  </Typography>
                  <SourceBadge kind="meal" source={meal.source ?? 'manual'} edited={meal.edited} />
                </Stack>
                <IconButton
                  size="small"
                  aria-label={A.menuAria}
                  onClick={(e: MouseEvent<HTMLElement>) => setMenu({ anchor: e.currentTarget, meal })}
                >
                  <MoreVertRounded fontSize="small" />
                </IconButton>
              </ListItem>
            );
          })}
        </List>
      )}

      <Menu anchorEl={menu?.anchor} open={Boolean(menu)} onClose={() => setMenu(null)}>
        <MenuItem onClick={() => openDialog('edit')}>
          <ListItemIcon>
            <EditRounded fontSize="small" />
          </ListItemIcon>
          {A.edit}
        </MenuItem>
        <MenuItem onClick={() => openDialog('save')}>
          <ListItemIcon>
            <BookmarkAddRounded fontSize="small" />
          </ListItemIcon>
          {A.saveAsUsual}
        </MenuItem>
        <MenuItem onClick={() => openDialog('delete')} sx={styles.deleteItem}>
          <ListItemIcon>
            <DeleteOutlineRounded fontSize="small" color="error" />
          </ListItemIcon>
          {A.delete}
        </MenuItem>
      </Menu>

      {dialog?.kind === 'edit' && <EditMealDialog meal={dialog.meal} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'save' && <SaveMealDialog meal={dialog.meal} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'delete' && (
        <ConfirmDialog
          open
          destructive
          title={A.deleteTitle}
          description={A.deleteBody(dialog.meal.name)}
          confirmLabel={A.delete}
          loading={deleteMeal.isPending}
          onConfirm={() => confirmDelete(dialog.meal)}
          onClose={() => setDialog(null)}
        />
      )}
    </SectionCard>
  );
}
