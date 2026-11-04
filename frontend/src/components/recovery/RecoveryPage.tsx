import { Box } from '@mui/material';
import { RecoveryLogForm } from './RecoveryLogForm';
import { RecoveryScoreCard } from './RecoveryScoreCard';
import { RecoveryHistory } from './RecoveryHistory';
import { useRecoveryHistory } from '../../hooks/queries/useRecoveryQueries';
import { STRINGS } from '../../constants/strings';
import { toIsoDate } from '../../utils/date';
import { PageHeader } from '../ui/PageHeader';
import { recoveryPageStyles as styles } from './RecoveryPage.styles';

const S = STRINGS.recovery;

export function RecoveryPage() {
  // Shares the cache entry with RecoveryHistory, so this is one request.
  const history = useRecoveryHistory();

  // History is newest-first; today's entry at the top means already checked in.
  const alreadyLoggedToday = history.data?.[0]?.date === toIsoDate(new Date());

  return (
    <Box>
      <PageHeader title={S.title} subtitle={S.subtitle} />

      <Box sx={styles.grid}>
        <RecoveryLogForm alreadyLogged={alreadyLoggedToday} />
        <Box sx={styles.rightColumn}>
          <RecoveryScoreCard />
          <RecoveryHistory />
        </Box>
      </Box>
    </Box>
  );
}
