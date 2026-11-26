import { Stack, Typography } from '@mui/material';
import { DirectionsWalkRounded } from '@mui/icons-material';
import { STRINGS } from '../../constants/strings';
import type { FoundationInfo } from '../../types/workout';
import { IconBadge } from '../ui/IconBadge';
import { SectionCard } from '../ui/SectionCard';
import { foundationCardStyles as styles } from './FoundationCard.styles';

const S = STRINGS.workout.foundation;

/** The foundation phase at a glance: which week, today's walking goal and the strength days. */
export function FoundationCard({ info }: { info: FoundationInfo }) {
  return (
    <SectionCard title={S.title(info.week, info.of)}>
      <Stack sx={styles.row}>
        <IconBadge icon={DirectionsWalkRounded} tone="success" />
        <Stack sx={styles.text}>
          <Typography variant="body2">{S.body(info.step_target, info.walk_minutes)}</Typography>
          <Typography variant="body2" color="text.secondary">
            {S.strength}
          </Typography>
        </Stack>
      </Stack>
    </SectionCard>
  );
}
