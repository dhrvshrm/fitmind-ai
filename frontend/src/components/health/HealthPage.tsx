import { Box, Skeleton, Tab, Tabs, Typography } from '@mui/material';
import { InfoOutlined } from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';
import { HEALTH_STRINGS } from '../../constants/healthStrings';
import { HEALTH_TAB_PARAM, HEALTH_TABS, type HealthTab } from '../../constants/supplements';
import { SUPPLEMENT_STRINGS } from '../../constants/supplementStrings';
import { useConsents, useHealthProfile } from '../../hooks/queries/useHealthQueries';
import { queryErrorMessage } from '../../hooks/queries/queryHelpers';
import { ErrorState } from '../ui/ErrorState';
import { PageHeader } from '../ui/PageHeader';
import { ConsentCard } from './ConsentCard';
import { HealthProfileForm } from './HealthProfileForm';
import { PlanEffectsCard } from './PlanEffectsCard';
import { PrivacyCard } from './PrivacyCard';
import { ReportsTab } from './reports/ReportsTab';
import { SupplementsTab } from './supplements/SupplementsTab';
import { healthPageStyles as styles } from './HealthPage.styles';

const S = HEALTH_STRINGS.page;
const T = SUPPLEMENT_STRINGS.tabs;

/** Health profile: consent first, then the questionnaire and what it changes. */
function ProfileTab() {
  const profile = useHealthProfile();
  const consents = useConsents();
  const error = queryErrorMessage(profile.error, S.loadError);
  const view = profile.data;
  const grantedAt = consents.data?.find((c) => c.scope === 'health_profile')?.granted_at ?? null;

  if (error && !view) return <ErrorState message={error} onRetry={() => profile.refetch()} />;
  if (!view) return <Skeleton variant="rounded" height={420} />;
  if (!view.consented) return <ConsentCard />;
  return (
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

/**
 * Health: the health profile, lab reports and supplements, as tabs. The tab
 * is in the URL (/health?tab=supplements) so a supplement reminder opens it directly.
 */
export function HealthPage() {
  const [params, setParams] = useSearchParams();
  const requested = params.get(HEALTH_TAB_PARAM);
  const tab: HealthTab = HEALTH_TABS.includes(requested as HealthTab) ? (requested as HealthTab) : 'profile';

  function choose(next: HealthTab) {
    setParams(next === 'profile' ? {} : { [HEALTH_TAB_PARAM]: next }, { replace: true });
  }

  return (
    <Box>
      <PageHeader title={S.title} subtitle={S.subtitle} />
      <Tabs value={tab} onChange={(_, next: HealthTab) => choose(next)} aria-label={T.aria} sx={styles.tabs}>
        {HEALTH_TABS.map((key) => (
          <Tab key={key} value={key} label={T[key]} />
        ))}
      </Tabs>
      {tab === 'profile' && <ProfileTab />}
      {tab === 'reports' && <ReportsTab />}
      {tab === 'supplements' && <SupplementsTab />}
      <Box sx={styles.disclaimer}>
        <InfoOutlined fontSize="small" sx={styles.disclaimerIcon} />
        <Typography variant="caption" color="text.secondary">
          {S.disclaimer}
        </Typography>
      </Box>
    </Box>
  );
}
