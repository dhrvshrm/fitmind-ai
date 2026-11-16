import { Chip, Stack, Tooltip } from '@mui/material';
import { CenterFocusStrongRounded } from '@mui/icons-material';
import { BODY_SCAN_STRINGS } from '../../constants/bodyScanStrings';
import type { Exercise } from '../../types/workout';
import { focusChipStyles as styles } from './FocusChip.styles';

const S = BODY_SCAN_STRINGS.workout;

/** Marks body-scan focus work: the area it targets and, for an unbalanced limb, the side to start with. */
export function FocusChip({ exercise }: { exercise: Exercise }) {
  if (!exercise.focus_area) return null;
  return (
    <Tooltip title={S.focusTooltip(exercise.weaker_side)}>
      <Stack sx={styles.row}>
        <Chip
          size="small"
          color="secondary"
          icon={<CenterFocusStrongRounded />}
          label={S.focusChip[exercise.focus_area]}
          sx={styles.chip}
        />
        {exercise.weaker_side && (
          <Chip size="small" color="secondary" variant="outlined" label={S.weakerFirst(exercise.weaker_side)} />
        )}
      </Stack>
    </Tooltip>
  );
}
