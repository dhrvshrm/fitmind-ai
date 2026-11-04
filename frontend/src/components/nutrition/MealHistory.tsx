import { Box, List, ListItem, ListItemText, Typography } from '@mui/material';
import { RestaurantRounded } from '@mui/icons-material';
import { STRINGS } from '../../constants/strings';
import { MEAL_TYPE_OPTIONS } from '../../constants/nutrition';
import type { Meal } from '../../types/nutrition';
import { SectionCard } from '../ui/SectionCard';
import { EmptyState } from '../ui/EmptyState';
import { mealHistoryStyles as styles } from './MealHistory.styles';

const S = STRINGS.nutrition.history;

type MealHistoryProps = {
  meals: Meal[];
};

/** Today's logged meals with calories and macro breakdown. */
export function MealHistory({ meals }: MealHistoryProps) {
  return (
    <SectionCard title={S.title} flush={meals.length > 0}>
      {meals.length === 0 ? (
        <EmptyState icon={RestaurantRounded} title={S.emptyTitle} description={S.empty} compact />
      ) : (
        <List disablePadding sx={styles.list}>
          {meals.map((meal, index) => {
            const TypeIcon = MEAL_TYPE_OPTIONS.find((o) => o.value === meal.meal_type)?.icon;
            return (
              <ListItem key={meal.id} divider={index < meals.length - 1} sx={styles.item}>
                {TypeIcon && (
                  <Box sx={styles.typeIcon}>
                    <TypeIcon fontSize="small" />
                  </Box>
                )}
                <ListItemText
                  primary={meal.name}
                  secondary={S.macros(meal.protein, meal.carbs, meal.fats)}
                  slotProps={{ primary: { sx: styles.mealName } }}
                />
                <Typography variant="body2" sx={styles.kcal}>
                  {S.kcal(Math.round(meal.calories))}
                </Typography>
              </ListItem>
            );
          })}
        </List>
      )}
    </SectionCard>
  );
}
