import { useState } from "react";
import { Skeleton } from "@mui/material";
import { LeaderboardRounded } from "@mui/icons-material";
import toast from "react-hot-toast";
import { LeaderboardRow } from "./LeaderboardRow";
import { useLeaderboard, useNudgeFriend } from "../../hooks/queries/useFriendQueries";
import { queryErrorMessage } from "../../hooks/queries/queryHelpers";
import { resolveApiError } from "../../lib/apiClient";
import { STRINGS } from "../../constants/strings";
import { LEADERBOARD_LIMIT } from "../../constants/friend";
import type { LeaderboardEntry } from "../../types/friend";
import { SectionCard } from "../ui/SectionCard";
import { EmptyState } from "../ui/EmptyState";
import { ErrorState } from "../ui/ErrorState";
import { leaderboardStyles as styles } from "./Leaderboard.styles";

const S = STRINGS.friends.leaderboard;

/** Weekly XP leaderboard (top 10): ranked rows, your position highlighted, nudge per friend. */
export function Leaderboard() {
  const leaderboardQuery = useLeaderboard();
  const nudge = useNudgeFriend();
  const [nudgingUserId, setNudgingUserId] = useState<string | null>(null);

  const visible = (leaderboardQuery.data ?? []).slice(0, LEADERBOARD_LIMIT);
  const error = queryErrorMessage(leaderboardQuery.error, S.error);

  async function handleNudge(entry: LeaderboardEntry) {
    setNudgingUserId(entry.user_id);
    try {
      await nudge.mutateAsync(entry.user_id);
      toast.success(S.nudgeSent(entry.username));
    } catch (err) {
      toast.error(resolveApiError(err, S.nudgeError));
    } finally {
      setNudgingUserId(null);
    }
  }

  return (
    <SectionCard title={S.title} subtitle={S.subtitle}>
      {leaderboardQuery.isPending && <Skeleton variant="rounded" sx={styles.skeleton} />}
      {error && <ErrorState message={error} onRetry={() => leaderboardQuery.refetch()} />}

      {leaderboardQuery.isSuccess && visible.length === 0 && (
        <EmptyState icon={LeaderboardRounded} title={S.emptyTitle} description={S.empty} compact />
      )}

      {leaderboardQuery.isSuccess &&
        visible.map((entry) => (
          <LeaderboardRow
            key={entry.user_id}
            entry={entry}
            onNudge={handleNudge}
            isNudging={nudgingUserId === entry.user_id}
          />
        ))}
    </SectionCard>
  );
}
