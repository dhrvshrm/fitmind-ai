import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import { STRINGS } from '../../constants/strings';
import { getPasswordStrength } from '../../utils/validation';
import { passwordStrengthStyles as styles } from './PasswordStrengthMeter.styles';

/** Maps strength score (0–4) to a MUI progress color. */
const SCORE_COLORS = ['error', 'error', 'warning', 'info', 'success'] as const;

type PasswordStrengthMeterProps = {
  password: string;
};

/** Live strength indicator shown under the signup password field. */
export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  if (!password) return null;

  const { score, label, percent } = getPasswordStrength(password);

  return (
    <Box sx={styles.root}>
      <LinearProgress
        variant="determinate"
        value={percent}
        color={SCORE_COLORS[score]}
        sx={styles.bar}
      />
      <Stack sx={styles.labels}>
        <Typography variant="caption" color="text.secondary">
          {STRINGS.passwordStrength.label}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={styles.levelLabel}>
          {label}
        </Typography>
      </Stack>
    </Box>
  );
}
