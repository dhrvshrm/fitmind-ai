import { useState } from "react";
import {
  Alert,
  Avatar,
  Button,
  CircularProgress,
  Divider,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { CheckRounded, CloseRounded } from "@mui/icons-material";
import toast from "react-hot-toast";
import { friendService } from "../../services/friendService";
import { resolveApiError } from "../../lib/apiClient";
import { STRINGS } from "../../constants/strings";
import type { FriendRequest } from "../../types/friend";
import { friendsRequestListStyles as styles } from "./FriendsRequestList.styles";

const S = STRINGS.friends.requests;

type FriendsRequestListProps = {
  requests: FriendRequest[];
  loading: boolean;
  error: string | null;
  /** Refetches requests/friends/leaderboard after an accept or decline. */
  onChanged: () => void;
};

/** Pending incoming friend requests, with accept/decline actions per row. */
export function FriendsRequestList({
  requests,
  loading,
  error,
  onChanged,
}: FriendsRequestListProps) {
  const [actingIds, setActingIds] = useState<ReadonlySet<string>>(new Set());

  function setActing(id: string, acting: boolean) {
    setActingIds((prev) => {
      const next = new Set(prev);
      if (acting) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function handleAccept(request: FriendRequest) {
    setActing(request.request_id, true);
    try {
      await friendService.acceptRequest(request.request_id);
      toast.success(S.acceptedToast(request.username));
      onChanged();
    } catch (err) {
      toast.error(resolveApiError(err, S.error));
    } finally {
      setActing(request.request_id, false);
    }
  }

  async function handleDecline(request: FriendRequest) {
    setActing(request.request_id, true);
    try {
      await friendService.declineRequest(request.request_id);
      toast.success(S.declinedToast);
      onChanged();
    } catch (err) {
      toast.error(resolveApiError(err, S.error));
    } finally {
      setActing(request.request_id, false);
    }
  }

  return (
    <Paper variant="outlined" sx={styles.card}>
      <Typography variant="h6" sx={styles.title}>
        {S.title}
      </Typography>

      {loading && <Skeleton variant="rounded" height={72} />}
      {!loading && error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && requests.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={styles.empty}>
          {S.empty}
        </Typography>
      )}

      {!loading &&
        !error &&
        requests.map((request, index) => {
          const acting = actingIds.has(request.request_id);
          return (
            <Stack key={request.request_id}>
              {index > 0 && <Divider />}
              <Stack sx={styles.row}>
                <Avatar sx={styles.avatar}>
                  {request.username[0]?.toUpperCase()}
                </Avatar>
                <Stack sx={styles.body}>
                  <Typography sx={styles.username}>
                    {request.username}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {STRINGS.friends.list.level(request.level)}
                  </Typography>
                </Stack>
                <Stack sx={styles.actions}>
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    startIcon={acting ? undefined : <CheckRounded />}
                    disabled={acting}
                    onClick={() => handleAccept(request)}
                  >
                    {acting ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      S.accept
                    )}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    startIcon={<CloseRounded />}
                    disabled={acting}
                    onClick={() => handleDecline(request)}
                  >
                    {S.decline}
                  </Button>
                </Stack>
              </Stack>
            </Stack>
          );
        })}
    </Paper>
  );
}
