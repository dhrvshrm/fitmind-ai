import { useState } from "react";
import {
  Alert,
  Avatar,
  Divider,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { FriendProfilePreview } from "./FriendProfilePreview";
import { STRINGS } from "../../constants/strings";
import type { Friend } from "../../types/friend";
import { friendsListStyles as styles } from "./FriendsList.styles";

const S = STRINGS.friends.list;

type FriendsListProps = {
  friends: Friend[];
  loading: boolean;
  error: string | null;
};

/** Accepted friends with level/streak; click a row for a profile preview. */
export function FriendsList({ friends, loading, error }: FriendsListProps) {
  const [selected, setSelected] = useState<Friend | null>(null);

  return (
    <Paper variant="outlined" sx={styles.card}>
      <Typography variant="h6" sx={styles.title}>
        {S.title}
      </Typography>

      {loading && <Skeleton variant="rounded" height={72} />}
      {!loading && error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && friends.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={styles.empty}>
          {S.empty}
        </Typography>
      )}

      {!loading &&
        !error &&
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
                  {S.level(friend.level)} · {S.streak(friend.current_streak)}
                </Typography>
              </Stack>
            </Stack>
          </Stack>
        ))}

      <FriendProfilePreview
        friend={selected}
        onClose={() => setSelected(null)}
      />
    </Paper>
  );
}
