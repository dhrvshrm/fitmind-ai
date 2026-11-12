import { Box } from '@mui/material';
import { ACTIVITY_STRINGS } from '../../constants/activityStrings';
import { PageHeader } from '../ui/PageHeader';
import { ActivitySettingsCard } from './ActivitySettingsCard';
import { DeskRoutines } from './DeskRoutines';
import { StepsCard } from './StepsCard';
import { activityPageStyles as styles } from './ActivityPage.styles';

const S = ACTIVITY_STRINGS.page;

/** Steps, desk stretches and break reminders for long work days. */
export function ActivityPage() {
  return (
    <Box>
      <PageHeader title={S.title} subtitle={S.subtitle} />
      <Box sx={styles.grid}>
        <Box sx={styles.column}>
          <StepsCard />
        </Box>
        <Box sx={styles.column}>
          <DeskRoutines />
          <ActivitySettingsCard />
        </Box>
      </Box>
    </Box>
  );
}
