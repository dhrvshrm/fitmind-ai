import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from '@mui/material';
import toast from 'react-hot-toast';
import { STRINGS } from '../../constants/strings';
import { useSaveMeal } from '../../hooks/queries/useNutritionQueries';
import { resolveApiError } from '../../lib/apiClient';
import type { Meal } from '../../types/nutrition';
import { saveMealDialogStyles as styles } from './SaveMealDialog.styles';

const S = STRINGS.nutrition.mealActions;

type SaveMealDialogProps = {
  meal: Meal;
  onClose: () => void;
};

/** Names a logged meal and saves it for one-tap logging later. */
export function SaveMealDialog({ meal, onClose }: SaveMealDialogProps) {
  const [name, setName] = useState(meal.name);
  const saveMeal = useSaveMeal();

  function handleSave() {
    saveMeal.mutate(
      { name: name.trim(), mealId: meal.id },
      {
        onSuccess: () => {
          toast.success(S.saved);
          onClose();
        },
        onError: (error) => toast.error(resolveApiError(error, S.error)),
      },
    );
  }

  return (
    <Dialog open onClose={saveMeal.isPending ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>{S.saveDialogTitle}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={styles.body}>{S.saveDialogBody}</DialogContentText>
        <TextField
          autoFocus
          fullWidth
          label={S.saveNameLabel}
          value={name}
          onChange={(e) => setName(e.target.value)}
          slotProps={{ htmlInput: { maxLength: 80 } }}
        />
      </DialogContent>
      <DialogActions sx={styles.actions}>
        <Button color="inherit" onClick={onClose} disabled={saveMeal.isPending}>
          {S.cancel}
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={!name.trim() || saveMeal.isPending}>
          {S.save}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
