import { useState } from "react";
import { Avatar, Divider, Skeleton, Stack, Typography } from "@mui/material";
import { GroupRounded } from "@mui/icons-material";
import { FriendProfilePreview } from "./FriendProfilePreview";
import { useFriends } from "../../hooks/queries/useFriendQueries";
import { queryErrorMessage } from "../../hooks/queries/queryHelpers";
import { STRINGS } from "../../constants/strings";
import type { Friend } from "../../types/friend";
import { SectionCard } from "../ui/SectionCard";
import { EmptyState } from "../ui/EmptyState";
import { ErrorState } from "../ui/ErrorState";
import { friendsListStyles as styles } from "./FriendsList.styles";

const S = STRINGS.friends.list;

/** Accepted friends with level/streak; click a row for a profile preview. */
export function FriendsList() {
  const friendsQuery = useFriends();
  const [selected, setSelected] = useState<Friend | null>(null);

  const friends = friendsQuery.data ?? [];
  const error = queryErrorMessage(friendsQuery.error, S.error);

  return (
    <SectionCard title={S.title}>
      {friendsQuery.isPending && <Skeleton variant="rounded" sx={styles.skeleton} />}
      {error && <ErrorState message={error} onRetry={() => friendsQuery.refetch()} />}

      {friendsQuery.isSuccess && friends.length === 0 && (
        <EmptyState icon={GroupRounded} title={S.emptyTitle} description={S.empty} compact />
      )}

      {friendsQuery.isSuccess &&
        friends.map((friend, index) => (
          <Stack key={friend.id}>
            {index > 0 && <Divider />}
            <Stack
              sx={styles.row}
              onClick={() => setSelected(friend)}
              role="button"
              tabIndex={0}
            >
              <Avatar sx={styles.avatar}>
                {friend.username[0]?.toUpperCase()}
              </Avatar>
              <Stack sx={styles.body}>
                <Typography sx={styles.username}>{friend.username}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {S.meta(friend.level, friend.current_streak)}
                </Typography>
              </Stack>
            </Stack>
          </Stack>
        ))}

      <FriendProfilePreview
        friend={selected}
        onClose={() => setSelected(null)}
      />
    </SectionCard>
  );
}
