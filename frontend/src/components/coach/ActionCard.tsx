import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import {
  CheckCircleRounded,
  ErrorOutlineRounded,
  HourglassEmptyRounded,
  RemoveCircleOutlineRounded,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { COACH_STRINGS } from '../../constants/coachStrings';
import type { CoachProposal } from '../../types/coach';
import { actionCardStyles as styles } from './ActionCard.styles';

const S = COACH_STRINGS.action;

type ActionCardProps = {
  proposal: CoachProposal;
  busy: boolean;
  onConfirm: (proposal: CoachProposal) => void;
  onDismiss: (proposal: CoachProposal) => void;
};

const STATUS_ICON = {
  pending: HourglassEmptyRounded,
  executing: HourglassEmptyRounded,
  done: CheckCircleRounded,
  failed: ErrorOutlineRounded,
  cancelled: RemoveCircleOutlineRounded,
  expired: RemoveCircleOutlineRounded,
} as const;

const STATUS_COLOR = {
  pending: 'default',
  executing: 'default',
  done: 'success',
  failed: 'error',
  cancelled: 'default',
  expired: 'default',
} as const;

/** A change the coach set up. Numbers come from the backend; nothing runs until Confirm. */
export function ActionCard({ proposal, busy, onConfirm, onDismiss }: ActionCardProps) {
  const pending = proposal.status === 'pending';
  const StatusIcon = STATUS_ICON[proposal.status];

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      sx={styles.card(pending)}
    >
      <Stack sx={styles.header}>
        <Typography variant="subtitle2" sx={styles.title}>
          {proposal.title}
        </Typography>
        {proposal.estimate && <Chip label={S.estimate} size="small" variant="outlined" sx={styles.chip} />}
      </Stack>
      <Typography variant="body2" color="text.secondary">
        {proposal.summary}
      </Typography>

      {proposal.changes.length > 0 && (
        <Box component="dl" sx={styles.changes}>
          {proposal.changes.map((change) => (
            <Box key={change.label} sx={styles.changeRow}>
              <Typography component="dt" variant="caption" color="text.secondary" sx={styles.changeLabel}>
                {change.label}
              </Typography>
              <Typography component="dd" variant="body2" sx={styles.changeValue}>
                {change.value}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {pending ? (
        <Stack sx={styles.actions}>
          <Button size="small" onClick={() => onDismiss(proposal)} disabled={busy}>
            {S.dismiss}
          </Button>
          <Button size="small" variant="contained" onClick={() => onConfirm(proposal)} disabled={busy}>
            {S.confirm}
          </Button>
        </Stack>
      ) : (
        <Stack sx={styles.result}>
          <Chip
            icon={<StatusIcon fontSize="small" />}
            label={S.status[proposal.status]}
            color={STATUS_COLOR[proposal.status]}
            size="small"
            variant="outlined"
          />
          {proposal.result_message && (
            <Typography variant="caption" color="text.secondary">
              {proposal.result_message}
            </Typography>
          )}
        </Stack>
      )}
    </Box>
  );
}
