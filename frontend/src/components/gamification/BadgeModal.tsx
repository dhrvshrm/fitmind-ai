import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  Typography,
} from '@mui/material';
import { LockRounded } from '@mui/icons-material';
import { STRINGS } from '../../constants/strings';
import { getBadgeIcon } from '../../constants/gamification';
import type { Badge } from '../../types/gamification';
import { badgeModalStyles as styles } from './BadgeModal.styles';

const S = STRINGS.gamification.badges;

type BadgeModalProps = {
  badge: Badge | null;
  earned: boolean;
  /** Human-readable earned date; only meaningful when `earned` is true. */
  earnedDateLabel: string | null;
  onClose: () => void;
};

/** Badge detail dialog: icon, name, earned status/date, and unlock condition. */
export function BadgeModal({ badge, earned, earnedDateLabel, onClose }: BadgeModalProps) {
  if (!badge) return null;
  const Icon = getBadgeIcon(badge.id);

  return (
    <Dialog open={Boolean(badge)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogContent sx={styles.content}>
        <Box sx={styles.iconWrap(earned)}>
          {earned ? <Icon sx={styles.icon} /> : <LockRounded sx={styles.icon} />}
        </Box>

        <Typography variant="h6" sx={styles.name}>
          {badge.name}
        </Typography>

        <Chip
          label={earned && earnedDateLabel ? S.earnedOn(earnedDateLabel) : S.locked}
          color={earned ? 'success' : 'default'}
          variant={earned ? 'filled' : 'outlined'}
          sx={styles.statusChip}
        />

        <Typography variant="subtitle2" sx={styles.sectionLabel}>
          {S.howToUnlock}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {badge.description}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} fullWidth variant="contained">
          {S.close}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
