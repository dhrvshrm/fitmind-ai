import { useState } from "react";
import {
  Avatar,
  Button,
  CircularProgress,
  Divider,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { CheckRounded, CloseRounded, PersonAddAlt1Rounded } from "@mui/icons-material";
import toast from "react-hot-toast";
import {
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  useFriendRequests,
} from "../../hooks/queries/useFriendQueries";
import { queryErrorMessage } from "../../hooks/queries/queryHelpers";
import { resolveApiError } from "../../lib/apiClient";
import { STRINGS } from "../../constants/strings";
import type { FriendRequest } from "../../types/friend";
import { SectionCard } from "../ui/SectionCard";
import { EmptyState } from "../ui/EmptyState";
import { ErrorState } from "../ui/ErrorState";
import { friendsRequestListStyles as styles } from "./FriendsRequestList.styles";

const S = STRINGS.friends.requests;

/** Pending incoming friend requests, with accept/decline actions per row. */
export function FriendsRequestList() {
  const requestsQuery = useFriendRequests();
  const acceptRequest = useAcceptFriendRequest();
  const declineRequest = useDeclineFriendRequest();
  const [actingIds, setActingIds] = useState<ReadonlySet<string>>(new Set());

  const requests = requestsQuery.data ?? [];
  const error = queryErrorMessage(requestsQuery.error, S.loadError);

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
      await acceptRequest.mutateAsync(request.request_id);
      toast.success(S.acceptedToast(request.username));
    } catch (err) {
      toast.error(resolveApiError(err, S.error));
    } finally {
      setActing(request.request_id, false);
    }
  }

  async function handleDecline(request: FriendRequest) {
    setActing(request.request_id, true);
    try {
      await declineRequest.mutateAsync(request.request_id);
      toast.success(S.declinedToast);
    } catch (err) {
      toast.error(resolveApiError(err, S.error));
    } finally {
      setActing(request.request_id, false);
    }
  }

  return (
    <SectionCard title={S.title}>
      {requestsQuery.isPending && <Skeleton variant="rounded" sx={styles.skeleton} />}
      {error && <ErrorState message={error} onRetry={() => requestsQuery.refetch()} />}

      {requestsQuery.isSuccess && requests.length === 0 && (
        <EmptyState icon={PersonAddAlt1Rounded} title={S.emptyTitle} description={S.empty} compact />
      )}

      {requestsQuery.isSuccess &&
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
    </SectionCard>
  );
}
