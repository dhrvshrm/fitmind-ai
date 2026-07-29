import { useCallback, useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { UserSearch } from "./UserSearch";
import { FriendsRequestList } from "./FriendsRequestList";
import { FriendsList } from "./FriendsList";
import { Leaderboard } from "./Leaderboard";
import { friendService } from "../../services/friendService";
import { resolveApiError } from "../../lib/apiClient";
import { STRINGS } from "../../constants/strings";
import type { Friend, FriendRequest, LeaderboardEntry } from "../../types/friend";
import { friendsPageStyles as styles } from "./FriendsPage.styles";

const S = STRINGS.friends;

export function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [friendsError, setFriendsError] = useState<string | null>(null);

  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState<string | null>(null);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  const loadFriends = useCallback(async () => {
    setFriendsLoading(true);
    setFriendsError(null);
    try {
      setFriends(await friendService.getFriends());
    } catch (err) {
      setFriendsError(resolveApiError(err, S.list.error));
    } finally {
      setFriendsLoading(false);
    }
  }, []);

  const loadRequests = useCallback(async () => {
    setRequestsLoading(true);
    setRequestsError(null);
    try {
      setRequests(await friendService.getPendingRequests());
    } catch (err) {
      setRequestsError(resolveApiError(err, S.requests.loadError));
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  const loadLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    try {
      setLeaderboard(await friendService.getLeaderboard());
    } catch (err) {
      setLeaderboardError(resolveApiError(err, S.leaderboard.error));
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  /** Refetches everything — used after accept/decline, which can change the
   * friends list and leaderboard membership as well as the requests list. */
  const loadAll = useCallback(() => {
    loadFriends();
    loadRequests();
    loadLeaderboard();
  }, [loadFriends, loadRequests, loadLeaderboard]);

  useEffect(() => {
    // Deferred so the effect body itself schedules no state updates synchronously.
    queueMicrotask(() => {
      loadAll();
    });
  }, [loadAll]);

  return (
    <Box>
      <Typography variant="h5" sx={styles.title}>
        {S.title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {S.subtitle}
      </Typography>

      <Box sx={styles.grid}>
        <Box sx={styles.leftColumn}>
          <UserSearch />
          <FriendsRequestList
            requests={requests}
            loading={requestsLoading}
            error={requestsError}
            onChanged={loadAll}
          />
          <FriendsList friends={friends} loading={friendsLoading} error={friendsError} />
        </Box>

        <Leaderboard
          entries={leaderboard}
          loading={leaderboardLoading}
          error={leaderboardError}
        />
      </Box>
    </Box>
  );
}
