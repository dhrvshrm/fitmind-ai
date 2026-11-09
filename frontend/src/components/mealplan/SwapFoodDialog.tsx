import { useDeferredValue, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import toast from 'react-hot-toast';
import { STRINGS } from '../../constants/strings';
import { usePlanSwapOptions, useSwapPlanItem } from '../../hooks/queries/useDietPlanQueries';
import { queryErrorMessage } from '../../hooks/queries/queryHelpers';
import { resolveApiError } from '../../lib/apiClient';
import type { PlanItem, PlanSlot } from '../../types/dietPlan';
import { swapFoodDialogStyles as styles } from './SwapFoodDialog.styles';

const S = STRINGS.mealPlan;

type SwapFoodDialogProps = {
  mealId: PlanSlot;
  index: number;
  item: PlanItem;
  onClose: () => void;
};

/** Replace one planned food with an allowed one of about the same calories. */
export function SwapFoodDialog({ mealId, index, item, onClose }: SwapFoodDialogProps) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const options = usePlanSwapOptions(mealId, index, deferredQuery, true);
  const swap = useSwapPlanItem();
  const error = queryErrorMessage(options.error, S.swapError);

  async function choose(option: PlanItem) {
    try {
      await swap.mutateAsync({ mealId, index, foodId: option.food_id });
      toast.success(S.swapped);
      onClose();
    } catch (err) {
      toast.error(resolveApiError(err, S.error));
    }
  }

  return (
    <Dialog open onClose={swap.isPending ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>{S.swapTitle(item.name)}</DialogTitle>
      <DialogContent sx={styles.content}>
        <Typography variant="body2" color="text.secondary">
          {S.swapHint}
        </Typography>
        <TextField
          autoFocus
          fullWidth
          size="small"
          label={S.swapSearch}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={swap.isPending}
        />
        {options.isFetching && (
          <Box sx={styles.center}>
            <CircularProgress size={24} />
          </Box>
        )}
        {error && (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        )}
        {!options.isFetching && options.data?.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={styles.center}>
            {S.swapEmpty}
          </Typography>
        )}
        {!options.isFetching && options.data && options.data.length > 0 && (
          <List dense disablePadding sx={styles.list}>
            {options.data.map((option) => (
              <ListItemButton
                key={option.food_id}
                onClick={() => choose(option)}
                disabled={swap.isPending}
                sx={styles.option}
              >
                <ListItemText
                  primary={option.name}
                  secondary={S.amount(option.quantity, option.unit, option.grams)}
                />
                <Typography variant="body2" color="text.secondary" sx={styles.number}>
                  {S.kcal(option.nutrients.kcal)}
                </Typography>
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={swap.isPending}>
          {S.cancel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
