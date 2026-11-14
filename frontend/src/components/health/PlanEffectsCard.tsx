import { Box, Typography } from '@mui/material';
import { RestaurantMenuRounded } from '@mui/icons-material';
import { HEALTH_STRINGS } from '../../constants/healthStrings';
import type { PlanEffect } from '../../types/health';
import { SectionCard } from '../ui/SectionCard';
import { planEffectsCardStyles as styles } from './PlanEffectsCard.styles';

const E = HEALTH_STRINGS.effects;

type PlanEffectsCardProps = {
  effects: PlanEffect[];
};

/** What the saved answers change in meal plans, in plain words. */
export function PlanEffectsCard({ effects }: PlanEffectsCardProps) {
  return (
    <SectionCard title={E.title} subtitle={E.subtitle}>
      {effects.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {E.none}
        </Typography>
      ) : (
        <Box component="ul" sx={styles.list}>
          {effects.map((effect) => (
            <Box component="li" key={effect} sx={styles.item}>
              <RestaurantMenuRounded fontSize="small" sx={styles.icon} />
              <Typography variant="body2">{E.items[effect]}</Typography>
            </Box>
          ))}
        </Box>
      )}
    </SectionCard>
  );
}
