import { useState } from 'react';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import toast from 'react-hot-toast';
import { MESS_STRINGS } from '../../constants/messStrings';
import { useSaveMessSetup } from '../../hooks/queries/useDietPlanQueries';
import { resolveApiError } from '../../lib/apiClient';
import type { DietType } from '../../types/onboarding';
import type { MessSetup } from '../../types/mess';
import { MessSetupFields } from './MessSetupFields';
import { messModeDialogStyles as styles } from './MessModeDialog.styles';

const S = MESS_STRINGS.dialog;

type MessModeDialogProps = {
  initial: MessSetup;
  dietType?: DietType;
  /** Mess mode is on now (shows the turn-off button). */
  isOn: boolean;
  onClose: () => void;
};

/** Pick the mess meals and the shelf; saving makes a new plan around them. */
export function MessModeDialog({ initial, dietType, isOn, onClose }: MessModeDialogProps) {
  const [value, setValue] = useState<MessSetup>(initial);
  const save = useSaveMessSetup();

  async function submit(setup: MessSetup, done: string) {
    try {
      await save.mutateAsync(setup);
      toast.success(done);
      onClose();
    } catch (err) {
      toast.error(resolveApiError(err, S.error));
    }
  }

  function handleSave() {
    if (value.mess_meals.length === 0) {
      toast.error(S.needMeal);
      return;
    }
    void submit(value, S.saved);
  }

  return (
    <Dialog open onClose={save.isPending ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{S.title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={styles.intro}>
          {S.intro}
        </Typography>
        <MessSetupFields value={value} onChange={setValue} dietType={dietType} />
      </DialogContent>
      <DialogActions sx={styles.actions}>
        {isOn && (
          <Button
            color="inherit"
            onClick={() => submit({ mess_meals: [], shelf: value.shelf }, S.off)}
            disabled={save.isPending}
            sx={styles.turnOff}
          >
            {S.turnOff}
          </Button>
        )}
        <Button color="inherit" onClick={onClose} disabled={save.isPending}>
          {S.cancel}
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={save.isPending}
          startIcon={save.isPending ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {save.isPending ? S.saving : S.save}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
