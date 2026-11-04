import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { STRINGS } from '../../constants/strings';
import { confirmDialogStyles as styles } from './ConfirmDialog.styles';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  /** Red confirm button, for deletes and other irreversible actions. */
  destructive?: boolean;
  /** Disables both buttons while the action runs. */
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/** Asks the user to confirm a consequential action before it runs. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive = false,
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{description}</DialogContentText>
      </DialogContent>
      <DialogActions sx={styles.actions}>
        <Button onClick={onClose} disabled={loading} color="inherit">
          {STRINGS.ui.cancel}
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          variant="contained"
          color={destructive ? 'error' : 'primary'}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
