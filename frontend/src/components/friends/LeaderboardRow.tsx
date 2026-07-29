import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { CampaignRounded } from "@mui/icons-material";
import { STRINGS } from "../../constants/strings";
import { getRankMedalColor } from "../../constants/friend";
import type { LeaderboardEntry } from "../../types/friend";
import { leaderboardRowStyles as styles } from "./LeaderboardRow.styles";

const S = STRINGS.friends.leaderboard;

type LeaderboardRowProps = {
  entry: LeaderboardEntry;
  onNudge: (entry: LeaderboardEntry) => void;
  isNudging: boolean;
};

/** One leaderboard row: rank badge, avatar, name, weekly XP, and a nudge button. */
export function LeaderboardRow({
  entry,
  onNudge,
  isNudging,
}: LeaderboardRowProps) {
  const medalColor = getRankMedalColor(entry.rank);

  return (
    <Stack sx={styles.row(entry.is_me)}>
      <Box sx={styles.rankBadge(medalColor)}>
        <Typography component="span" sx={styles.rankText}>
          {entry.rank}
        </Typography>
      </Box>

      <Avatar sx={styles.avatar}>{entry.username[0]?.toUpperCase()}</Avatar>

      <Stack sx={styles.body}>
        <Stack sx={styles.nameRow}>
          <Typography sx={styles.username}>{entry.username}</Typography>
          {entry.is_me && (
            <Chip
              label={S.you}
              size="small"
              color="primary"
              sx={styles.youChip}
            />
          )}
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {STRINGS.friends.list.level(entry.level)}
        </Typography>
      </Stack>

      <Typography sx={styles.xp}>{S.xp(entry.weekly_xp)}</Typography>

      {!entry.is_me && (
        <IconButton
          aria-label={S.nudgeAria(entry.username)}
          size="small"
          color="primary"
          onClick={() => onNudge(entry)}
          disabled={isNudging}
        >
          {isNudging ? (
            <CircularProgress size={16} />
          ) : (
            <CampaignRounded fontSize="small" />
          )}
        </IconButton>
      )}
    </Stack>
  );
}
