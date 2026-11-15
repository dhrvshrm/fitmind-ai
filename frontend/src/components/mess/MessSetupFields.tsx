import { Box, Chip, Typography } from '@mui/material';
import { CheckRounded } from '@mui/icons-material';
import { MESS_MEALS, SHELF_DAIRY, SHELF_KEYS } from '../../constants/mess';
import { MESS_STRINGS } from '../../constants/messStrings';
import type { DietType } from '../../types/onboarding';
import type { MessMeal, MessSetup, ShelfKey } from '../../types/mess';
import { messSetupFieldsStyles as styles } from './MessSetupFields.styles';

const S = MESS_STRINGS;

type MessSetupFieldsProps = {
  value: MessSetup;
  onChange: (value: MessSetup) => void;
  /** Hides shelf foods the diet rules out (no eggs for vegetarians, no dairy for vegans). */
  dietType?: DietType;
};

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

function shelfFor(dietType?: DietType): ShelfKey[] {
  return SHELF_KEYS.filter((key) => {
    if (key === 'eggs' && (dietType === 'vegetarian' || dietType === 'jain' || dietType === 'vegan')) return false;
    if (dietType === 'vegan' && SHELF_DAIRY.includes(key)) return false;
    return true;
  });
}

/** Which meals the mess serves, and what's on the shelf: both as tap-to-pick chips. */
export function MessSetupFields({ value, onChange, dietType }: MessSetupFieldsProps) {
  function chip<T extends string>(key: T, label: string, selected: boolean, onClick: () => void) {
    return (
      <Chip
        key={key}
        label={label}
        clickable
        aria-pressed={selected}
        icon={selected ? <CheckRounded /> : undefined}
        color={selected ? 'primary' : 'default'}
        variant={selected ? 'filled' : 'outlined'}
        onClick={onClick}
      />
    );
  }

  return (
    <Box sx={styles.root}>
      <Box role="group" aria-label={S.dialog.mealsLabel}>
        <Typography variant="subtitle2" sx={styles.label}>
          {S.dialog.mealsLabel}
        </Typography>
        <Box sx={styles.chips}>
          {MESS_MEALS.map((meal: MessMeal) =>
            chip(meal, S.meals[meal], value.mess_meals.includes(meal), () =>
              onChange({ ...value, mess_meals: toggle(value.mess_meals, meal) }),
            ),
          )}
        </Box>
      </Box>
      <Box role="group" aria-label={S.dialog.shelfLabel}>
        <Typography variant="subtitle2" sx={styles.label}>
          {S.dialog.shelfLabel}
        </Typography>
        <Typography variant="caption" color="text.secondary" component="p" sx={styles.help}>
          {S.dialog.shelfHelp}
        </Typography>
        <Box sx={styles.chips}>
          {shelfFor(dietType).map((key) =>
            chip(key, S.shelf[key], value.shelf.includes(key), () =>
              onChange({ ...value, shelf: toggle(value.shelf, key) }),
            ),
          )}
        </Box>
      </Box>
    </Box>
  );
}
