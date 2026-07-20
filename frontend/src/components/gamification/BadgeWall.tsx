import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { STRINGS } from '../../constants/strings';
import { getBadgeIcon } from '../../constants/gamification';
import type { Badge } from '../../types/gamification';
import { badgeWallStyles as styles } from './BadgeWall.styles';

const S = STRINGS.gamification.badges;

type BadgeWallProps = {
  allBadges: Badge[];
  earnedIds: ReadonlySet<string>;
  /** Ids unlocked since the last visit — these get the celebratory pop-in. */
  newlyEarnedIds: ReadonlySet<string>;
  onSelect: (badge: Badge) => void;
};

/** Grid of all badges: earned ones highlighted, locked ones greyed out. */
export function BadgeWall({
  allBadges,
  earnedIds,
  newlyEarnedIds,
  onSelect,
}: BadgeWallProps) {
  return (
    <Paper variant="outlined" sx={styles.card}>
      <Stack sx={styles.headerRow}>
        <Typography variant="h6" sx={styles.title}>
          {S.title}
        </Typography>
        <Chip
          label={S.earnedCount(earnedIds.size, allBadges.length)}
          color="primary"
          variant="outlined"
          sx={styles.countChip}
        />
      </Stack>

      <Box sx={styles.grid}>
        {allBadges.map((badge) => {
          const Icon = getBadgeIcon(badge.id);
          const earned = earnedIds.has(badge.id);
          const isNew = newlyEarnedIds.has(badge.id);

          return (
            <motion.div
              key={badge.id}
              initial={isNew ? { scale: 0.3, opacity: 0, rotate: -15 } : false}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            >
              <Paper
                variant="outlined"
                onClick={() => onSelect(badge)}
                sx={styles.badgeCard(earned)}
              >
                <Box sx={styles.iconWrap(earned)}>
                  <Icon fontSize="medium" />
                </Box>
                <Typography sx={styles.badgeName}>{badge.name}</Typography>
                {isNew && (
                  <motion.div
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    transition={{ delay: 2, duration: 1 }}
                  >
                    <Chip
                      label={S.newBadgeChip}
                      color="warning"
                      size="small"
                      sx={styles.newChip}
                    />
                  </motion.div>
                )}
              </Paper>
            </motion.div>
          );
        })}
      </Box>
    </Paper>
  );
}
