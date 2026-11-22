import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Skeleton,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { CheckRounded } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { TREAT_STRINGS } from '../../constants/treatStrings';
import { useLogTreat, useTreats } from '../../hooks/queries/useDietPlanQueries';
import { queryErrorMessage } from '../../hooks/queries/queryHelpers';
import { resolveApiError } from '../../lib/apiClient';
import type { Craving, TreatOption } from '../../types/treat';
import { ErrorState } from '../ui/ErrorState';
import { treatDialogStyles as styles } from './TreatDialog.styles';

const S = TREAT_STRINGS.dialog;

type TreatDialogProps = {
  craving: Craving;
  onClose: () => void;
};

type TreatOptionCardProps = {
  option: TreatOption;
  busy: boolean;
  logging: boolean;
  onLog: () => void;
};

function TreatOptionCard({ option, busy, logging, onLog }: TreatOptionCardProps) {
  return (
    <Box sx={styles.option}>
      <Box sx={styles.header}>
        <Typography sx={styles.name}>{option.name}</Typography>
        <Box sx={styles.numbers}>
          <Chip size="small" label={S.kcal(option.nutrients.kcal)} />
          <Chip size="small" variant="outlined" color="primary" label={S.protein(option.nutrients.protein)} />
        </Box>
      </Box>
      <Typography variant="caption" color="text.secondary">
        {S.insteadOf(option.instead_of)}
      </Typography>
      <Typography variant="body2">{option.why}</Typography>
      {option.tips.map((tip) => (
        <Alert key={tip} severity="info" variant="outlined">
          {TREAT_STRINGS.tips[tip]}
        </Alert>
      ))}
      <Typography variant="caption" color="text.secondary">
        {S.whatsIn}
      </Typography>
      <Box component="ul" sx={styles.items}>
        {option.items.map((item) => (
          <Typography component="li" variant="body2" key={item.name}>
            {S.item(item.name, item.quantity, item.unit, item.grams)}
          </Typography>
        ))}
      </Box>
      <Box sx={styles.actions}>
        <Button
          variant="contained"
          size="small"
          onClick={onLog}
          disabled={busy}
          startIcon={logging ? <CircularProgress size={16} color="inherit" /> : <CheckRounded />}
        >
          {logging ? S.logging : S.log}
        </Button>
      </Box>
    </Box>
  );
}

/** Lighter versions of one craving, lightest first; logging one resizes the rest of today. */
export function TreatDialog({ craving, onClose }: TreatDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const treats = useTreats(craving);
  const log = useLogTreat();
  const data = treats.data;
  const error = queryErrorMessage(treats.error, S.loadError);

  async function handleLog(option: TreatOption) {
    try {
      const result = await log.mutateAsync(option.id);
      toast.success(S.logged(option.name));
      if (result.week.logged > result.week.suggested) {
        toast(S.overWeek(result.week.logged, result.week.suggested));
      }
      onClose();
    } catch (err) {
      toast.error(resolveApiError(err, S.error));
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" fullScreen={fullScreen} scroll="paper">
      <DialogTitle>
        {TREAT_STRINGS.cravings[craving]}
        <Typography variant="body2" color="text.secondary">
          {S.subtitle}
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={styles.content}>
        {treats.isPending && (
          <>
            <Skeleton variant="rounded" height={160} />
            <Skeleton variant="rounded" height={160} />
          </>
        )}
        {error && !data && <ErrorState message={error} onRetry={() => treats.refetch()} />}
        {data && (
          <Box sx={styles.summary}>
            <Chip size="small" variant="outlined" label={S.caloriesLeft(data.calories_remaining)} />
            <Chip size="small" variant="outlined" label={TREAT_STRINGS.card.week(data.week.logged, data.week.suggested)} />
          </Box>
        )}
        {data && data.options.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            {S.empty}
          </Typography>
        )}
        {data?.options.map((option) => (
          <TreatOptionCard
            key={option.id}
            option={option}
            busy={log.isPending}
            logging={log.isPending && log.variables === option.id}
            onLog={() => handleLog(option)}
          />
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{S.close}</Button>
      </DialogActions>
    </Dialog>
  );
}
