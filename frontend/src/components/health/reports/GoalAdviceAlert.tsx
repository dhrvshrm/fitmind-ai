import { useState } from 'react';
import { Alert, AlertTitle, Button, Stack, Typography } from '@mui/material';
import { FlagRounded } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { BODY_SCAN_STRINGS } from '../../../constants/bodyScanStrings';
import { GOAL_OPTIONS } from '../../../constants/onboarding';
import { QUERY_KEYS } from '../../../constants/queryKeys';
import { useUpdateProfile } from '../../../hooks/queries/useProfileQueries';
import { useInvalidate } from '../../../hooks/queries/queryHelpers';
import { resolveApiError } from '../../../lib/apiClient';
import type { GoalAdvice } from '../../../types/bodyScan';
import { goalAdviceAlertStyles as styles } from './GoalAdviceAlert.styles';

const S = BODY_SCAN_STRINGS.goalAdvice;
const goalLabel = (value: string) =>
  (GOAL_OPTIONS.find((option) => option.value === value)?.label ?? value).toLowerCase();

/**
 * A one-time suggestion when the newest scan and the chosen goal pull apart
 * (building muscle with high body fat, or cutting when already very lean).
 * Only a suggestion: nothing changes unless the person switches.
 */
export function GoalAdviceAlert({ advice }: { advice: GoalAdvice }) {
  const update = useUpdateProfile();
  const invalidate = useInvalidate();
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const suggested = goalLabel(advice.suggested);
  const handleSwitch = () =>
    update.mutate(
      { fitness_goal: advice.suggested },
      {
        onSuccess: () => {
          invalidate(QUERY_KEYS.labReports.scans);
          toast.success(S.switched);
        },
        onError: (error) => toast.error(resolveApiError(error, S.error)),
      },
    );

  return (
    <Alert severity="warning" variant="outlined" icon={<FlagRounded />}>
      <AlertTitle>{S.title(suggested)}</AlertTitle>
      <Typography variant="body2">{S.reason[advice.reason]}</Typography>
      <Typography variant="caption" color="text.secondary" component="p" sx={styles.keep}>
        {S.keep}
      </Typography>
      <Stack direction="row" spacing={1} sx={styles.actions}>
        <Button size="small" variant="contained" onClick={handleSwitch} disabled={update.isPending}>
          {update.isPending ? S.switching : S.switch(suggested)}
        </Button>
        <Button size="small" onClick={() => setDismissed(true)} disabled={update.isPending}>
          {S.dismiss}
        </Button>
      </Stack>
    </Alert>
  );
}
