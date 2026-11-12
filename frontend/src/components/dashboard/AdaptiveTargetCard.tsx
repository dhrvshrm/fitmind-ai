import { Alert, Box, Button, CircularProgress, Skeleton, Stack, Typography } from '@mui/material';
import { CheckCircleOutlineRounded, HourglassEmptyRounded, InfoOutlined, TuneRounded } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { PROGRESS_STRINGS } from '../../constants/progressStrings';
import {
  useAcceptAdaptiveTarget,
  useAdaptiveTarget,
  useDismissAdaptiveTarget,
} from '../../hooks/queries/useProgressQueries';
import { queryErrorMessage } from '../../hooks/queries/queryHelpers';
import { resolveApiError } from '../../lib/apiClient';
import type { AdaptiveStatus } from '../../types/progress';
import { formatDateLabel } from '../../utils/date';
import { ErrorState } from '../ui/ErrorState';
import { ProgressRow } from '../ui/ProgressRow';
import { SectionCard } from '../ui/SectionCard';
import { adaptiveTargetCardStyles as styles } from './AdaptiveTargetCard.styles';

const S = PROGRESS_STRINGS.adaptive;

function Insufficient({ status }: { status: AdaptiveStatus }) {
  return (
    <Stack sx={styles.stack}>
      <Stack sx={styles.titleRow}>
        <HourglassEmptyRounded color="action" fontSize="small" />
        <Typography variant="subtitle2">{S.insufficientTitle}</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary">
        {S.insufficientBody}
      </Typography>
      <ProgressRow
        label={S.loggedDays}
        value={status.logged_days ?? 0}
        goal={status.required_logged_days ?? 0}
        unit={S.daysUnit}
      />
      <ProgressRow
        label={S.weighIns}
        value={status.weigh_ins ?? 0}
        goal={status.required_weigh_ins ?? 0}
        unit={S.weighInsUnit}
      />
    </Stack>
  );
}

/** Suggests a new calorie target from real intake and weight trend; never changes it on its own. */
export function AdaptiveTargetCard() {
  const adaptive = useAdaptiveTarget();
  const accept = useAcceptAdaptiveTarget();
  const dismiss = useDismissAdaptiveTarget();
  const status = adaptive.data;
  const error = queryErrorMessage(adaptive.error, PROGRESS_STRINGS.page.loadError);
  const busy = accept.isPending || dismiss.isPending;

  async function handleAccept(calories: number) {
    try {
      await accept.mutateAsync(calories);
      toast.success(S.accepted);
    } catch (err) {
      toast.error(resolveApiError(err, S.error));
    }
  }

  async function handleDismiss() {
    try {
      await dismiss.mutateAsync();
      toast.success(S.dismissed);
    } catch (err) {
      toast.error(resolveApiError(err, S.error));
    }
  }

  const action = status?.current_target ? (
    <Typography variant="caption" color="text.secondary">
      {S.current(status.current_target)}
    </Typography>
  ) : undefined;

  return (
    <SectionCard title={S.title} subtitle={S.subtitle} action={action}>
      {adaptive.isPending && <Skeleton variant="rounded" height={140} />}
      {error && !status && <ErrorState message={error} onRetry={() => adaptive.refetch()} />}
      {status?.status === 'no_targets' && <Alert severity="info">{S.noTargets}</Alert>}
      {status?.status === 'insufficient_data' && <Insufficient status={status} />}
      {status?.status === 'on_track' && (
        <Alert severity="success" icon={<CheckCircleOutlineRounded />}>
          <Typography variant="subtitle2">{S.onTrackTitle}</Typography>
          <Typography variant="body2">{S.onTrackBody(status.estimated_tdee ?? 0)}</Typography>
        </Alert>
      )}
      {status?.status === 'low_confidence' && (
        <Alert severity="info" icon={<InfoOutlined />}>
          <Typography variant="subtitle2">{S.lowConfidenceTitle}</Typography>
          <Typography variant="body2">{S.lowConfidenceBody}</Typography>
        </Alert>
      )}
      {status?.status === 'cooldown' && (
        <Alert severity="info" icon={<InfoOutlined />}>
          <Typography variant="subtitle2">{S.cooldownTitle}</Typography>
          <Typography variant="body2">{S.cooldownBody(formatDateLabel(status.next_check ?? ''))}</Typography>
        </Alert>
      )}
      {status?.status === 'suggestion' && status.suggested_target && (
        <Stack sx={styles.stack}>
          <Stack sx={styles.titleRow}>
            <TuneRounded color="primary" fontSize="small" />
            <Typography variant="subtitle2">{S.suggestionTitle}</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {S.suggestionBody(status.average_intake ?? 0, status.weekly_weight_change ?? 0, status.estimated_tdee ?? 0)}
          </Typography>
          <Box sx={styles.suggestion}>
            <Typography variant="h6" component="p" sx={styles.suggestionValue}>
              {S.suggestion(status.current_target ?? 0, status.suggested_target)}
            </Typography>
          </Box>
          {status.capped && (
            <Typography variant="caption" color="text.secondary">
              {S.capped}
            </Typography>
          )}
          <Stack sx={styles.actions}>
            <Button
              variant="contained"
              disabled={busy}
              onClick={() => handleAccept(status.suggested_target as number)}
              startIcon={accept.isPending ? <CircularProgress size={18} color="inherit" /> : undefined}
            >
              {S.accept}
            </Button>
            <Button color="inherit" disabled={busy} onClick={handleDismiss}>
              {S.dismiss}
            </Button>
          </Stack>
        </Stack>
      )}
    </SectionCard>
  );
}
