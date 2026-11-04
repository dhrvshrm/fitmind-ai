import { Alert, Button } from '@mui/material';
import { STRINGS } from '../../constants/strings';
import { errorStateStyles as styles } from './ErrorState.styles';

type ErrorStateProps = {
  message: string;
  /** Offers a retry button when provided. */
  onRetry?: () => void;
};

/** Inline error for a section that failed to load, with an optional retry. */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <Alert
      severity="error"
      variant="outlined"
      sx={styles.root}
      action={
        onRetry && (
          <Button color="inherit" size="small" onClick={onRetry}>
            {STRINGS.ui.retry}
          </Button>
        )
      }
    >
      {message}
    </Alert>
  );
}
