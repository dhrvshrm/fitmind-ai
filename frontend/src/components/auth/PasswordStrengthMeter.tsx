import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import { STRINGS } from '../../constants/strings';
import { getPasswordStrength } from '../../utils/validation';

/** Maps strength score (0–4) to a MUI progress color. */
const SCORE_COLORS = ['error', 'error', 'warning', 'info', 'success'] as const;

interface PasswordStrengthMeterProps {
  password: string;
}

/** Live strength indicator shown under the signup password field. */
export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  if (!password) return null;

  const { score, label, percent } = getPasswordStrength(password);

  return (
    <Box sx={{ mt: 1 }}>
      <LinearProgress
        variant="determinate"
        value={percent}
        color={SCORE_COLORS[score]}
        sx={{ height: 6, borderRadius: 3 }}
      />
      <Stack sx={{ mt: 0.5, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Typography variant="caption" color="text.secondary">
          {STRINGS.passwordStrength.label}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
      </Stack>
    </Box>
  );
}
