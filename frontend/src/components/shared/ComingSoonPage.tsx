import type { ComponentType } from 'react';
import { Box, Chip, type SvgIconProps } from '@mui/material';
import { STRINGS } from '../../constants/strings';
import { SectionCard } from '../ui/SectionCard';
import { EmptyState } from '../ui/EmptyState';
import { comingSoonStyles as styles } from './ComingSoonPage.styles';

type ComingSoonPageProps = {
  /** Feature name, e.g. "Workouts". */
  title: string;
  icon: ComponentType<SvgIconProps>;
};

/** Placeholder page for features scheduled for later days. */
export function ComingSoonPage({ title, icon }: ComingSoonPageProps) {
  return (
    <Box sx={styles.root}>
      <Box sx={styles.card}>
        <SectionCard>
          <EmptyState
            icon={icon}
            title={title}
            description={STRINGS.comingSoon.description(title)}
            action={<Chip label={STRINGS.comingSoon.badge} color="primary" variant="outlined" />}
          />
        </SectionCard>
      </Box>
    </Box>
  );
}
