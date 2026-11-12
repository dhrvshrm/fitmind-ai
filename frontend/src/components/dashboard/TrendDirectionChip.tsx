import { Chip } from '@mui/material';
import { TrendingDownRounded, TrendingFlatRounded, TrendingUpRounded } from '@mui/icons-material';
import { PROGRESS_STRINGS } from '../../constants/progressStrings';
import type { TrendDirection } from '../../types/progress';
import { trendDirectionChipStyles as styles } from './TrendDirectionChip.styles';

const ICONS = { down: TrendingDownRounded, up: TrendingUpRounded, steady: TrendingFlatRounded };

type TrendDirectionChipProps = {
  direction: TrendDirection | null;
};

/** "Trending down / up / holding steady", neutral in color: no direction is good or bad by itself. */
export function TrendDirectionChip({ direction }: TrendDirectionChipProps) {
  if (!direction) return null;
  const Icon = ICONS[direction];
  return <Chip size="small" variant="outlined" icon={<Icon />} label={PROGRESS_STRINGS.direction[direction]} sx={styles.chip} />;
}
