import { Box, Paper, Stack, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { XPBar } from './XPBar';
import { STRINGS } from '../../constants/strings';
import type { GamificationProfile } from '../../types/gamification';
import { levelCardStyles as styles } from './LevelCard.styles';

const S = STRINGS.gamification.level;

type LevelCardProps = {
  profile: GamificationProfile;
};

/** Large level display with title, total XP, and progress to the next tier. */
export function LevelCard({ profile }: LevelCardProps) {
  return (
    <Paper variant="outlined" sx={styles.card}>
      <Stack sx={styles.headerRow}>
        <motion.div
          key={profile.level}
          initial={{ scale: 0.7, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
          <Box sx={styles.levelBadge}>
            <Typography variant="h3" sx={styles.levelNumber}>
              {profile.level}
            </Typography>
          </Box>
        </motion.div>

        <Box sx={styles.titleBlock}>
          <Typography variant="h5" sx={styles.levelTitle}>
            {profile.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={styles.totalXp}>
            {S.totalXp(profile.xp)}
          </Typography>
        </Box>
      </Stack>

      <XPBar
        xpIntoLevel={profile.xp_into_level}
        xpToNext={profile.xp_to_next}
        isMaxLevel={profile.next_title === null}
      />
    </Paper>
  );
}
