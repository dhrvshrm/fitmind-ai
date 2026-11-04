import { Box } from "@mui/material";
import { UserSearch } from "./UserSearch";
import { FriendsRequestList } from "./FriendsRequestList";
import { FriendsList } from "./FriendsList";
import { Leaderboard } from "./Leaderboard";
import { STRINGS } from "../../constants/strings";
import { PageHeader } from "../ui/PageHeader";
import { friendsPageStyles as styles } from "./FriendsPage.styles";

const S = STRINGS.friends;

/**
 * Friends hub. Each section loads its own data through the friend query
 * hooks; accepting or declining a request invalidates the friend queries so
 * the requests, friends list and leaderboard refresh together.
 */
export function FriendsPage() {
  return (
    <Box>
      <PageHeader title={S.title} subtitle={S.subtitle} />

      <Box sx={styles.grid}>
        <Box sx={styles.leftColumn}>
          <UserSearch />
          <FriendsRequestList />
          <FriendsList />
        </Box>

        <Leaderboard />
      </Box>
    </Box>
  );
}
