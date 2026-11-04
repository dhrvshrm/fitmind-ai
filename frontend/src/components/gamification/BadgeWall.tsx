import { Box, Chip, Paper, Typography } from "@mui/material";
import { WorkspacePremiumRounded } from "@mui/icons-material";
import { motion } from "framer-motion";
import { BadgeIcon } from "./BadgeIcon";
import { STRINGS } from "../../constants/strings";
import type { Badge } from "../../types/gamification";
import { SectionCard } from "../ui/SectionCard";
import { EmptyState } from "../ui/EmptyState";
import { badgeWallStyles as styles } from "./BadgeWall.styles";

const S = STRINGS.gamification.badges;

type BadgeWallProps = {
  allBadges: Badge[];
  earnedIds: ReadonlySet<string>;
  /** Ids unlocked since the last visit; these get the pop-in animation. */
  newlyEarnedIds: ReadonlySet<string>;
  onSelect: (badge: Badge) => void;
};

/** Grid of all badges: earned ones highlighted, locked ones muted. */
export function BadgeWall({
  allBadges,
  earnedIds,
  newlyEarnedIds,
  onSelect,
}: BadgeWallProps) {
  if (allBadges.length === 0) {
    return (
      <SectionCard title={S.title}>
        <EmptyState
          icon={WorkspacePremiumRounded}
          title={S.emptyTitle}
          description={S.emptyBody}
          compact
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title={S.title}
      action={
        <Chip
          label={S.earnedCount(earnedIds.size, allBadges.length)}
          color="primary"
          variant="outlined"
          size="small"
        />
      }
    >
      {earnedIds.size === 0 && (
        <Typography variant="body2" color="text.secondary" sx={styles.hint}>
          {S.noneEarnedHint}
        </Typography>
      )}

      <Box sx={styles.grid}>
        {allBadges.map((badge) => {
          const earned = earnedIds.has(badge.id);
          const isNew = newlyEarnedIds.has(badge.id);

          return (
            <motion.div
              key={badge.id}
              initial={isNew ? { scale: 0.3, opacity: 0, rotate: -15 } : false}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
            >
              <Paper
                variant="outlined"
                onClick={() => onSelect(badge)}
                sx={styles.badgeCard(earned)}
              >
                <Box sx={styles.iconWrap(earned)}>
                  <BadgeIcon badgeId={badge.id} fontSize="medium" />
                </Box>
                <Typography sx={styles.badgeName(earned)}>{badge.name}</Typography>
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
    </SectionCard>
  );
}
