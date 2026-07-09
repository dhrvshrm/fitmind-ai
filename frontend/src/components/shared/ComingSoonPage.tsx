import type { ComponentType } from 'react';
import { Box, Chip, Paper, Typography } from '@mui/material';
import type { SvgIconProps } from '@mui/material';
import { STRINGS } from '../../constants/strings';
import { comingSoonStyles as styles } from './ComingSoonPage.styles';

type ComingSoonPageProps = {
  /** Feature name, e.g. "Workouts". */
  title: string;
  icon: ComponentType<SvgIconProps>;
};

/** Placeholder page for features scheduled for later days. */
export function ComingSoonPage({ title, icon: Icon }: ComingSoonPageProps) {
  return (
    <Box sx={styles.root}>
      <Paper elevation={0} variant="outlined" sx={styles.card}>
        <Icon sx={styles.icon} />
        <Typography variant="h5" sx={styles.title}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {STRINGS.comingSoon.description(title)}
        </Typography>
        <Chip label={STRINGS.comingSoon.badge} color="primary" sx={styles.badge} />
      </Paper>
    </Box>
  );
}
