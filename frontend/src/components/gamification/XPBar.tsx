import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import { STRINGS } from '../../constants/strings';
import { xpBarStyles as styles } from './XPBar.styles';

type XPBarProps = {
  xpIntoLevel: number;
  xpToNext: number;
  /** True once the top tier is reached (`next_title` is null). */
  isMaxLevel: boolean;
};

/** 0–100% progress bar toward the next level, with the percentage labeled. */
export function XPBar({ xpIntoLevel, xpToNext, isMaxLevel }: XPBarProps) {
  const levelSpan = xpIntoLevel + xpToNext;
  const percent = isMaxLevel || levelSpan <= 0
    ? 100
    : Math.round((xpIntoLevel / levelSpan) * 100);

  return (
    <Box sx={styles.root}>
      <Stack sx={styles.labelRow}>
        <Typography variant="body2" color="text.secondary">
          {isMaxLevel
            ? STRINGS.gamification.level.maxTitle
            : STRINGS.gamification.level.xpToNext(xpToNext)}
        </Typography>
        <Typography variant="body2" sx={styles.percentLabel}>
          {percent}%
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={percent}
        color={isMaxLevel ? 'success' : 'primary'}
        sx={styles.track}
        aria-label={STRINGS.gamification.xpBar.ariaLabel}
      />
    </Box>
  );
}
