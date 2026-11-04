import { useDeferredValue, useState } from 'react';
import {
  Box,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  ListSubheader,
  Popover,
  TextField,
  Typography,
} from '@mui/material';
import toast from 'react-hot-toast';
import { STRINGS } from '../../constants/strings';
import { useFoodSearch } from '../../hooks/queries/useNutritionQueries';
import { nutritionService } from '../../services/nutritionService';
import { resolveApiError } from '../../lib/apiClient';
import type { Food, FoodAlternative } from '../../types/nutrition';
import { SourceBadge } from './SourceBadge';
import { foodPickerStyles as styles } from './FoodPicker.styles';

const S = STRINGS.nutrition.review;

type FoodPickerProps = {
  anchorEl: HTMLElement | null;
  initialQuery: string;
  alternatives: FoodAlternative[];
  onPick: (food: Food) => void;
  onClose: () => void;
};

/** Lets the user swap a matched food for a suggestion or any searched food. */
export function FoodPicker({ anchorEl, initialQuery, alternatives, onPick, onClose }: FoodPickerProps) {
  const [query, setQuery] = useState(initialQuery);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);
  const search = useFoodSearch(deferredQuery);

  async function pickAlternative(foodId: string) {
    setLoadingId(foodId);
    try {
      onPick(await nutritionService.getFood(foodId));
    } catch (error) {
      toast.error(resolveApiError(error, STRINGS.ui.loadError));
    } finally {
      setLoadingId(null);
    }
  }

  const results = search.data ?? [];
  const showSuggestions = alternatives.length > 0 && query.trim() === initialQuery.trim();

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      slotProps={{ paper: { sx: styles.paper } }}
    >
      <Box sx={styles.searchBox}>
        <TextField
          autoFocus
          fullWidth
          size="small"
          label={S.searchLabel}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </Box>

      {showSuggestions && (
        <List dense subheader={<ListSubheader sx={styles.subheader}>{S.suggestions}</ListSubheader>}>
          {alternatives.map((alt) => (
            <ListItemButton
              key={alt.food_id}
              onClick={() => pickAlternative(alt.food_id)}
              disabled={loadingId !== null}
            >
              <ListItemText primary={alt.name} />
              {loadingId === alt.food_id && <CircularProgress size={16} />}
            </ListItemButton>
          ))}
        </List>
      )}

      <List dense sx={styles.results}>
        {search.isFetching && (
          <Box sx={styles.loading}>
            <CircularProgress size={20} />
          </Box>
        )}
        {!search.isFetching && deferredQuery.trim().length >= 2 && results.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={styles.empty}>
            {S.searchEmpty}
          </Typography>
        )}
        {results.map((food) => (
          <ListItemButton key={food.id} onClick={() => onPick(food)}>
            <ListItemText
              primary={food.name}
              secondary={S.perUnit(food.per_100g.kcal * (food.serving.grams / 100), food.serving.unit)}
            />
            <SourceBadge kind="item" source={food.source} />
          </ListItemButton>
        ))}
      </List>
    </Popover>
  );
}
