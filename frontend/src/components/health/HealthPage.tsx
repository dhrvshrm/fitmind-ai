import { Box, Skeleton, Typography } from '@mui/material';
import { InfoOutlined } from '@mui/icons-material';
import { HEALTH_STRINGS } from '../../constants/healthStrings';
import { useConsents, useHealthProfile } from '../../hooks/queries/useHealthQueries';
import { queryErrorMessage } from '../../hooks/queries/queryHelpers';
import { ErrorState } from '../ui/ErrorState';
import { PageHeader } from '../ui/PageHeader';
import { ConsentCard } from './ConsentCard';
import { HealthProfileForm } from './HealthProfileForm';
import { PlanEffectsCard } from './PlanEffectsCard';
import { PrivacyCard } from './PrivacyCard';
import { healthPageStyles as styles } from './HealthPage.styles';

const S = HEALTH_STRINGS.page;

/** Health profile: consent first, then the questionnaire and what it changes. */
export function HealthPage() {
  const profile = useHealthProfile();
  const consents = useConsents();
  const error = queryErrorMessage(profile.error, S.loadError);
  const view = profile.data;
  const grantedAt = consents.data?.find((c) => c.scope === 'health_profile')?.granted_at ?? null;

  let body;
  if (error && !view) {
    body = <ErrorState message={error} onRetry={() => profile.refetch()} />;
  } else if (!view) {
    body = <Skeleton variant="rounded" height={420} />;
  } else if (!view.consented) {
    body = <ConsentCard />;
  } else {
    body = (
      <Box sx={styles.grid}>
        <Box sx={styles.column}>
          {/* Keyed by the save time so a fresh profile resets the form. */}
          <HealthProfileForm key={view.profile?.updated_at ?? 'new'} profile={view.profile} />
        </Box>
        <Box sx={styles.side}>
          <PlanEffectsCard effects={view.plan_effects} />
          <PrivacyCard grantedAt={grantedAt} />
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader title={S.title} subtitle={S.subtitle} />
      {body}
      <Box sx={styles.disclaimer}>
        <InfoOutlined fontSize="small" sx={styles.disclaimerIcon} />
        <Typography variant="caption" color="text.secondary">
          {S.disclaimer}
        </Typography>
      </Box>
    </Box>
  );
}
