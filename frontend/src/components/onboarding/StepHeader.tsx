import { Stack, Typography } from '@mui/material';
import { stepHeaderStyles as styles } from './StepHeader.styles';

type StepHeaderProps = {
  title: string;
  helper?: string;
};

/** Consistent title + helper text shown at the top of each onboarding step. */
export function StepHeader({ title, helper }: StepHeaderProps) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="h6" sx={styles.title}>
        {title}
      </Typography>
      {helper && (
        <Typography variant="body2" color="text.secondary">
          {helper}
        </Typography>
      )}
    </Stack>
  );
}
