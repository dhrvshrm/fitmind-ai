import { Button, Skeleton, Stack, Typography } from '@mui/material';
import { TuneRounded } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import { STRINGS } from '../../constants/strings';
import { useTargets, useUserProfile } from '../../hooks/queries/useProfileQueries';
import { personalisationCompleteness } from '../../utils/onboarding';
import { SectionCard } from '../ui/SectionCard';
import { TargetsSummary } from '../nutrition/TargetsSummary';
import { personalisationCardStyles as styles } from './PersonalisationCard.styles';

const S = STRINGS.profile.personalisation;

/** Daily targets, how complete the answers are, and a way to change them. */
export function PersonalisationCard() {
  const navigate = useNavigate();
  const profile = useUserProfile();
  const targets = useTargets();

  const completeness = profile.data ? personalisationCompleteness(profile.data) : null;

  return (
    <SectionCard
      title={S.title}
      subtitle={completeness ? S.completeness(completeness.answered, completeness.total) : undefined}
      action={
        <Button
          size="small"
          startIcon={<TuneRounded />}
          onClick={() => navigate(`${ROUTES.ONBOARDING}?mode=update`)}
        >
          {S.update}
        </Button>
      }
    >
      {targets.isPending && <Skeleton variant="rounded" sx={styles.skeleton} />}
      {targets.data && (
        <Stack sx={styles.body}>
          <TargetsSummary targets={targets.data} showExplanation={false} />
          {completeness && completeness.answered < completeness.total && (
            <Typography variant="body2" color="text.secondary">
              {S.incompleteHint}
            </Typography>
          )}
        </Stack>
      )}
      {targets.isSuccess && !targets.data && (
        <Typography variant="body2" color="text.secondary">
          {S.noTargets}
        </Typography>
      )}
    </SectionCard>
  );
}
