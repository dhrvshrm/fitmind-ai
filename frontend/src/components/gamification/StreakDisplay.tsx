import { Box, Typography } from '@mui/material';
import { LocalFireDepartmentRounded } from '@mui/icons-material';
import { STRINGS } from '../../constants/strings';
import { SectionCard } from '../ui/SectionCard';
import { streakDisplayStyles as styles } from './StreakDisplay.styles';

const S = STRINGS.gamification.streak;

type StreakDisplayProps = {
  currentStreak: number;
  longestStreak: number;
};

/** Current + longest workout streak, each as a flame stat tile. */
export function StreakDisplay({ currentStreak, longestStreak }: StreakDisplayProps) {
  return (
    <SectionCard title={S.title}>
      <Box sx={styles.grid}>
        <Box sx={styles.stat}>
          <LocalFireDepartmentRounded sx={styles.icon(currentStreak > 0)} />
          <Typography variant="h4" component="p" sx={styles.value}>
            {currentStreak}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={styles.label}>
            {S.current}
          </Typography>
        </Box>

        <Box sx={styles.stat}>
          <LocalFireDepartmentRounded sx={styles.icon(longestStreak > 0)} />
          <Typography variant="h4" component="p" sx={styles.value}>
            {longestStreak}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={styles.label}>
            {S.longest}
          </Typography>
        </Box>
      </Box>
    </SectionCard>
  );
}
