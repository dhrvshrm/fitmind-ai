import { useState, type FormEvent } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import toast from 'react-hot-toast';
import { PROGRESS_STRINGS } from '../../constants/progressStrings';
import { STRINGS } from '../../constants/strings';
import { useFriends } from '../../hooks/queries/useFriendQueries';
import { useCreateChallenge } from '../../hooks/queries/useProgressQueries';
import { resolveApiError } from '../../lib/apiClient';
import type { ChallengeKind } from '../../types/progress';
import { newChallengeDialogStyles as styles } from './NewChallengeDialog.styles';

const S = PROGRESS_STRINGS.challenges;

type NewChallengeDialogProps = {
  open: boolean;
  kinds: ChallengeKind[];
  onClose: () => void;
};

/** Pick a friend and a challenge, then send the invite. */
export function NewChallengeDialog({ open, kinds, onClose }: NewChallengeDialogProps) {
  const friends = useFriends();
  const create = useCreateChallenge();
  const [friendId, setFriendId] = useState('');
  const [kind, setKind] = useState(kinds[0]?.kind ?? '');
  const list = friends.data ?? [];

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await create.mutateAsync({ friendId, kind });
      toast.success(S.sent);
      onClose();
    } catch (err) {
      toast.error(resolveApiError(err, S.error));
    }
  }

  return (
    <Dialog open={open} onClose={create.isPending ? undefined : onClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit} noValidate>
        <DialogTitle>{S.dialogTitle}</DialogTitle>
        <DialogContent>
          {friends.data && list.length === 0 ? (
            <Alert severity="info">{S.noFriends}</Alert>
          ) : (
            <Stack sx={styles.fields}>
              <TextField
                select
                label={S.friendLabel}
                value={friendId}
                onChange={(e) => setFriendId(e.target.value)}
                disabled={create.isPending || friends.isPending}
              >
                {list.map((friend) => (
                  <MenuItem key={friend.id} value={friend.id}>
                    {friend.username}
                  </MenuItem>
                ))}
              </TextField>
              <Typography variant="body2" color="text.secondary">
                {S.kindLabel}
              </Typography>
              <ToggleButtonGroup
                orientation="vertical"
                exclusive
                value={kind}
                onChange={(_, value: string | null) => value && setKind(value)}
                sx={styles.kinds}
              >
                {kinds.map((k) => (
                  <ToggleButton key={k.kind} value={k.kind} sx={styles.kind}>
                    <Stack sx={styles.kindText}>
                      <Typography variant="subtitle2">{S.kinds[k.kind]?.title ?? k.kind}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {S.kinds[k.kind]?.body}
                      </Typography>
                    </Stack>
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={styles.actions}>
          <Button onClick={onClose} disabled={create.isPending} color="inherit">
            {STRINGS.ui.cancel}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={create.isPending || !friendId || !kind}
            startIcon={create.isPending ? <CircularProgress size={18} color="inherit" /> : undefined}
          >
            {S.send}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
