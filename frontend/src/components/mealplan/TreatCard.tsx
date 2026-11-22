import { useState } from 'react';
import { Box, Button } from '@mui/material';
import {
  CakeRounded,
  IcecreamRounded,
  LunchDiningRounded,
  OutdoorGrillRounded,
  StorefrontRounded,
  TapasRounded,
} from '@mui/icons-material';
import type { SvgIconComponent } from '@mui/icons-material';
import { CRAVINGS, TREAT_STRINGS } from '../../constants/treatStrings';
import type { Craving } from '../../types/treat';
import { SectionCard } from '../ui/SectionCard';
import { TreatDialog } from './TreatDialog';
import { treatCardStyles as styles } from './TreatCard.styles';

const S = TREAT_STRINGS.card;

const CRAVING_ICONS: Record<Craving, SvgIconComponent> = {
  sweet: IcecreamRounded,
  cake: CakeRounded,
  pizza_burger: LunchDiningRounded,
  salty: TapasRounded,
  tandoori: OutdoorGrillRounded,
  street_food: StorefrontRounded,
};

/** "Craving something?": pick a craving to see lighter versions of it. */
export function TreatCard() {
  const [craving, setCraving] = useState<Craving | null>(null);

  return (
    <SectionCard title={S.title} subtitle={S.subtitle}>
      <Box role="group" aria-label={S.cravingsAria} sx={styles.cravings}>
        {CRAVINGS.map((key) => {
          const Icon = CRAVING_ICONS[key];
          return (
            <Button
              key={key}
              variant="outlined"
              color="inherit"
              startIcon={<Icon color="primary" />}
              onClick={() => setCraving(key)}
              sx={styles.craving}
            >
              {TREAT_STRINGS.cravings[key]}
            </Button>
          );
        })}
      </Box>
      {craving && <TreatDialog craving={craving} onClose={() => setCraving(null)} />}
    </SectionCard>
  );
}
