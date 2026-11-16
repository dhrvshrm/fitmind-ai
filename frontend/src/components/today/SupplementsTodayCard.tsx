import { Box, Button, Chip } from '@mui/material';
import { CheckRounded, MedicationRounded } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ROUTES } from '../../constants/routes';
import { HEALTH_TAB_PARAM } from '../../constants/supplements';
import { SUPPLEMENT_STRINGS } from '../../constants/supplementStrings';
import { useSetSupplementTaken } from '../../hooks/queries/useSupplementQueries';
import { resolveApiError } from '../../lib/apiClient';
import type { UserSupplement } from '../../types/supplements';
import { TodayCard } from './TodayCard';
import { supplementsTodayCardStyles as styles } from './SupplementsTodayCard.styles';

const S = SUPPLEMENT_STRINGS.today;

type SupplementsTodayCardProps = {
  supplements: UserSupplement[];
};

/** Today's supplements as one-tap chips (shown only to people who track some). */
export function SupplementsTodayCard({ supplements }: SupplementsTodayCardProps) {
  const setTaken = useSetSupplementTaken();
  const taken = supplements.filter((s) => s.taken_today).length;

  function toggle(item: UserSupplement) {
    setTaken.mutate(
      { id: item.id, taken: !item.taken_today },
      { onError: (err) => toast.error(resolveApiError(err, SUPPLEMENT_STRINGS.mine.tickError)) },
    );
  }

  return (
    <TodayCard
      title={S.title}
      icon={MedicationRounded}
      tone="secondary"
      caption={S.subtitle(taken, supplements.length)}
      action={
        <Button component={RouterLink} to={`${ROUTES.HEALTH}?${HEALTH_TAB_PARAM}=supplements`} size="small">
          {S.manage}
        </Button>
      }
    >
      <Box sx={styles.chips}>
        {supplements.map((item) => (
          <Chip
            key={item.id}
            label={item.dose ? `${item.name} · ${item.dose}` : item.name}
            clickable
            aria-pressed={item.taken_today}
            aria-label={SUPPLEMENT_STRINGS.mine.takenAria(item.name)}
            icon={item.taken_today ? <CheckRounded /> : undefined}
            color={item.taken_today ? 'success' : 'default'}
            variant={item.taken_today ? 'filled' : 'outlined'}
            onClick={() => toggle(item)}
            disabled={setTaken.isPending}
          />
        ))}
      </Box>
    </TodayCard>
  );
}
