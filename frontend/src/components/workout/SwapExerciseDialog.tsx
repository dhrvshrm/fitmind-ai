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
  Typography,
} from '@mui/material';
import toast from 'react-hot-toast';
import { STRINGS } from '../../constants/strings';
import { useSwapExercise, useSwapOptions } from '../../hooks/queries/useWorkoutQueries';
import { queryErrorMessage } from '../../hooks/queries/queryHelpers';
import { resolveApiError } from '../../lib/apiClient';
import { swapExerciseDialogStyles as styles } from './SwapExerciseDialog.styles';

const S = STRINGS.workout.swap;
const M = STRINGS.exercises.muscles;

type SwapExerciseDialogProps = {
  day: string;
  index: number;
  name: string;
  onClose: () => void;
};

/** Pick a replacement with the same movement pattern for one planned exercise. */
export function SwapExerciseDialog({ day, index, name, onClose }: SwapExerciseDialogProps) {
  const options = useSwapOptions(day, index, true);
  const swap = useSwapExercise();
  const error = queryErrorMessage(options.error, S.error);

  async function choose(exerciseId: string) {
    try {
      await swap.mutateAsync({ day, index, exerciseId });
      toast.success(S.swapped);
      onClose();
    } catch (err) {
      toast.error(resolveApiError(err, S.error));
    }
  }

  return (
    <Dialog open onClose={swap.isPending ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>{S.title(name)}</DialogTitle>
      <DialogContent sx={styles.content}>
        <Typography variant="body2" color="text.secondary">
          {S.hint}
        </Typography>
        {options.isPending && (
          <Box sx={styles.center}>
            <CircularProgress size={24} />
          </Box>
        )}
        {error && (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        )}
        {options.data?.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={styles.center}>
            {S.empty}
          </Typography>
        )}
        {options.data && options.data.length > 0 && (
          <List dense disablePadding>
            {options.data.map((option) => (
              <ListItemButton
                key={option.id}
                onClick={() => choose(option.id)}
                disabled={swap.isPending}
                sx={styles.option}
              >
                {option.image && <Box component="img" src={option.image} alt="" loading="lazy" sx={styles.thumb} />}
                <ListItemText
                  primary={option.name}
                  secondary={option.primary_muscles.map((m) => M[m] ?? m).join(', ')}
                />
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
