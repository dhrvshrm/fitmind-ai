import {
  Avatar,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  Stack,
  Typography,
} from "@mui/material";
import {
  LocalFireDepartmentRounded,
  MilitaryTechRounded,
} from "@mui/icons-material";
import { STRINGS } from "../../constants/strings";
import type { Friend } from "../../types/friend";
import { friendProfilePreviewStyles as styles } from "./FriendProfilePreview.styles";

const S = STRINGS.friends;

type FriendProfilePreviewProps = {
  friend: Friend | null;
  onClose: () => void;
};

/** Lightweight profile preview dialog, opened by clicking a friend row. */
export function FriendProfilePreview({
  friend,
  onClose,
}: FriendProfilePreviewProps) {
  if (!friend) return null;

  return (
    <Dialog open={Boolean(friend)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogContent sx={styles.content}>
        <Avatar sx={styles.avatar}>{friend.username[0]?.toUpperCase()}</Avatar>
        <Typography variant="h6" sx={styles.username}>
          {friend.username}
        </Typography>

        <Stack sx={styles.statsRow}>
          <Chip
            icon={<MilitaryTechRounded />}
            label={S.list.level(friend.level)}
            variant="outlined"
          />
          <Chip label={S.profilePreview.xp(friend.xp)} variant="outlined" />
          <Chip
            icon={<LocalFireDepartmentRounded />}
            label={S.list.streak(friend.current_streak)}
            variant="outlined"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} fullWidth variant="contained">
          {S.profilePreview.close}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
