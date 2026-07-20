import {
  Chip,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import { STRINGS } from '../../constants/strings';
import { MEAL_TYPE_OPTIONS } from '../../constants/nutrition';
import type { Meal } from '../../types/nutrition';
import { mealHistoryStyles as styles } from './MealHistory.styles';

const S = STRINGS.nutrition.history;

type MealHistoryProps = {
  meals: Meal[];
};

/** Today's logged meals with calories and macro breakdown. */
export function MealHistory({ meals }: MealHistoryProps) {
  return (
    <Paper variant="outlined" sx={styles.card}>
      <Typography variant="h6" sx={styles.title}>
        {S.title}
      </Typography>

      {meals.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={styles.empty}>
          {S.empty}
        </Typography>
      ) : (
        <List disablePadding>
          {meals.map((meal, index) => {
            const typeOption = MEAL_TYPE_OPTIONS.find(
              (option) => option.value === meal.meal_type,
            );
            return (
              <ListItem key={meal.id} divider={index < meals.length - 1} disableGutters>
                <ListItemText
                  primary={
                    <Typography component="span" sx={styles.mealName}>
                      {typeOption ? `${typeOption.icon} ` : ''}
                      {meal.name}
                    </Typography>
                  }
                  secondary={S.macros(meal.protein, meal.carbs, meal.fats)}
                />
                <Chip
                  label={S.kcal(Math.round(meal.calories))}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={styles.kcalChip}
                />
              </ListItem>
            );
          })}
        </List>
      )}
    </Paper>
  );
}
