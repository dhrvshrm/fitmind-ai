import { useEffect, useState } from 'react';
import { Box, Button, Chip, LinearProgress, Skeleton, Stack, Typography } from '@mui/material';
import { AddRounded, GroupsRounded } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { PROGRESS_STRINGS } from '../../constants/progressStrings';
import {
  useAcceptChallenge,
  useChallenges,
  useDeclineChallenge,
} from '../../hooks/queries/useProgressQueries';
import { queryErrorMessage } from '../../hooks/queries/queryHelpers';
import { resolveApiError } from '../../lib/apiClient';
import type { Challenge, ChallengeProgress } from '../../types/progress';
import { formatDateLabel } from '../../utils/date';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { SectionCard } from '../ui/SectionCard';
import { NewChallengeDialog } from './NewChallengeDialog';
import { challengesCardStyles as styles } from './ChallengesCard.styles';

const S = PROGRESS_STRINGS.challenges;

function statusLabel(challenge: Challenge): string {
  if (challenge.status === 'pending' && !challenge.is_creator) return S.status.invited;
  return S.status[challenge.status] ?? challenge.status;
}

function Bar({ label, progress }: { label: string; progress: ChallengeProgress }) {
  return (
    <Box>
      <Stack sx={styles.barLabel}>
        <Typography variant="caption">{label}</Typography>
        <Typography variant="caption" color="text.secondary">
          {S.progress(progress.count, progress.goal)}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={Math.min(100, (progress.count / Math.max(progress.goal, 1)) * 100)}
        color={progress.completed ? 'success' : 'primary'}
        sx={styles.bar}
      />
    </Box>
  );
}

type ChallengeRowProps = {
  challenge: Challenge;
  busy: boolean;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
};

function ChallengeRow({ challenge, busy, onAccept, onDecline }: ChallengeRowProps) {
  const friendName = challenge.friend.name ?? S.someone;
  const kind = S.kinds[challenge.kind];
  return (
    <Box sx={styles.row}>
      <Stack sx={styles.rowHeader}>
        <Box sx={styles.rowTitle}>
          <Typography variant="subtitle2">{kind?.title ?? challenge.kind}</Typography>
          <Typography variant="caption" color="text.secondary">
            {challenge.end_date && challenge.status === 'active'
              ? S.withEnd(friendName, formatDateLabel(challenge.end_date))
              : friendName}
          </Typography>
        </Box>
        <Chip size="small" label={statusLabel(challenge)} variant="outlined" />
      </Stack>
      {challenge.me && challenge.them && (
        <Stack sx={styles.bars}>
          <Bar label={S.you} progress={challenge.me} />
          <Bar label={S.them(friendName)} progress={challenge.them} />
        </Stack>
      )}
      {challenge.status === 'pending' && !challenge.is_creator && (
        <Typography variant="caption" color="text.secondary">
          {kind?.body}
        </Typography>
      )}
      <Stack sx={styles.footer}>
        <Typography variant="caption" color={challenge.rewarded ? 'success.main' : 'text.secondary'}>
          {challenge.rewarded ? S.rewarded(challenge.xp_reward) : S.reward(challenge.xp_reward)}
        </Typography>
        {challenge.status === 'pending' && (
          <Stack sx={styles.actions}>
            {!challenge.is_creator && (
              <Button size="small" variant="contained" disabled={busy} onClick={() => onAccept(challenge.id)}>
                {S.accept}
              </Button>
            )}
            <Button size="small" color="inherit" disabled={busy} onClick={() => onDecline(challenge.id)}>
              {challenge.is_creator ? S.cancel : S.decline}
            </Button>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}

/** Week-long goals with friends; progress is counted from what each person logs. */
export function ChallengesCard() {
  const challenges = useChallenges();
  const accept = useAcceptChallenge();
  const decline = useDeclineChallenge();
  const [open, setOpen] = useState(false);
  const data = challenges.data;
  const error = queryErrorMessage(challenges.error, PROGRESS_STRINGS.page.loadError);
  const busy = accept.isPending || decline.isPending;

  useEffect(() => {
    for (const challenge of data?.challenges ?? []) {
      if (challenge.just_rewarded) toast.success(S.earned(challenge.xp_reward), { id: `challenge-${challenge.id}` });
    }
  }, [data]);

  async function handleAccept(id: string) {
    try {
      await accept.mutateAsync(id);
      toast.success(S.accepted);
    } catch (err) {
      toast.error(resolveApiError(err, S.error));
    }
  }

  async function handleDecline(id: string) {
    try {
      await decline.mutateAsync(id);
      toast.success(S.declined);
    } catch (err) {
      toast.error(resolveApiError(err, S.error));
    }
  }

  const action = (
    <Button size="small" startIcon={<AddRounded />} onClick={() => setOpen(true)} disabled={!data}>
      {S.new}
    </Button>
  );

  return (
    <SectionCard title={S.title} subtitle={S.subtitle} action={action}>
      {challenges.isPending && <Skeleton variant="rounded" height={120} />}
      {error && !data && <ErrorState message={error} onRetry={() => challenges.refetch()} />}
      {data && data.challenges.length === 0 && (
        <EmptyState compact icon={GroupsRounded} title={S.emptyTitle} description={S.emptyBody} />
      )}
      {data && data.challenges.length > 0 && (
        <Stack sx={styles.list}>
          {data.challenges.map((challenge) => (
            <ChallengeRow
              key={challenge.id}
              challenge={challenge}
              busy={busy}
              onAccept={handleAccept}
              onDecline={handleDecline}
            />
          ))}
        </Stack>
      )}
      {data && open && (
        <NewChallengeDialog open={open} kinds={data.kinds} onClose={() => setOpen(false)} />
      )}
    </SectionCard>
  );
}
