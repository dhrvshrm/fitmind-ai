import { useEffect } from 'react';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import { StepHeader } from './StepHeader';
import { TargetsSummary } from '../nutrition/TargetsSummary';
import { ONBOARDING_STRINGS } from '../../constants/onboarding';
import { usePreviewTargets } from '../../hooks/queries/useProfileQueries';
import { toTargetsPreviewPayload } from '../../utils/onboarding';
import type { StepProps } from '../../types/onboarding';
import { stepTargetsStyles as styles } from './StepTargets.styles';

const S = ONBOARDING_STRINGS.steps.targets;

/** Review step: the targets these answers produce, before anything is saved. */
export function StepTargets({ data }: StepProps) {
  const preview = usePreviewTargets();
  const { mutate } = preview;

  // Answers can't change on this step, so this runs once on arrival.
  useEffect(() => {
    mutate(toTargetsPreviewPayload(data));
  }, [mutate, data]);

  return (
    <Stack spacing={2.5}>
      <StepHeader title={S.title} helper={S.helper} />
      {preview.isPending && (
        <Box sx={styles.loading}>
          <CircularProgress size={24} />
          <Typography variant="body2" color="text.secondary">
            {S.loading}
          </Typography>
        </Box>
      )}
      {preview.isError && <Alert severity="info">{S.error}</Alert>}
      {preview.data && <TargetsSummary targets={preview.data} />}
    </Stack>
  );
}
