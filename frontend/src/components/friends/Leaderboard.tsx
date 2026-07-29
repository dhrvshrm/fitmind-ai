import { useState } from "react";
import { Alert, Paper, Skeleton, Typography } from "@mui/material";
import toast from "react-hot-toast";
import { LeaderboardRow } from "./LeaderboardRow";
import { friendService } from "../../services/friendService";
import { resolveApiError } from "../../lib/apiClient";
import { STRINGS } from "../../constants/strings";
import { LEADERBOARD_LIMIT } from "../../constants/friend";
import type { LeaderboardEntry } from "../../types/friend";
import { leaderboardStyles as styles } from "./Leaderboard.styles";

const S = STRINGS.friends.leaderboard;

type LeaderboardProps = {
  entries: LeaderboardEntry[];
  loading: boolean;
  error: string | null;
};

/** Weekly XP leaderboard (top 10): ranked rows, your position highlighted, nudge per friend. */
export function Leaderboard({ entries, loading, error }: LeaderboardProps) {
  const [nudgingUserId, setNudgingUserId] = useState<string | null>(null);
  const visible = entries.slice(0, LEADERBOARD_LIMIT);

  async function handleNudge(entry: LeaderboardEntry) {
    setNudgingUserId(entry.user_id);
    try {
      await friendService.nudge(entry.user_id);
      toast.success(S.nudgeSent(entry.username));
    } catch (err) {
      toast.error(resolveApiError(err, S.nudgeError));
    } finally {
      setNudgingUserId(null);
    }
  }

  return (
    <Paper variant="outlined" sx={styles.card}>
      <Typography variant="h6" sx={styles.title}>
        {S.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={styles.subtitle}>
        {S.subtitle}
      </Typography>

      {loading && <Skeleton variant="rounded" height={240} />}
      {!loading && error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && visible.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={styles.empty}>
          {S.empty}
        </Typography>
      )}

      {!loading &&
        !error &&
        visible.map((entry) => (
          <LeaderboardRow
            key={entry.user_id}
            entry={entry}
            onNudge={handleNudge}
            isNudging={nudgingUserId === entry.user_id}
          />
        ))}
    </Paper>
  );
}
