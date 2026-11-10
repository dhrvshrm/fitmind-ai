import type { ComponentType, ReactNode } from 'react';
import { Box, Card, Skeleton, Typography, type SvgIconProps } from '@mui/material';
import { IconBadge } from './IconBadge';
import { AnimatedNumber } from './AnimatedNumber';
import type { IconBadgeTone } from './IconBadge.styles';
import { STRINGS } from '../../constants/strings';
import { statTileStyles as styles } from './StatTile.styles';

type StatTileProps = {
  label: string;
  value: ReactNode;
  icon?: ComponentType<SvgIconProps>;
  tone?: IconBadgeTone;
  /** Small supporting line under the value (a unit, target or change). */
  hint?: string;
  loading?: boolean;
};

/** A single headline number with its label. */
export function StatTile({ label, value, icon, tone = 'primary', hint, loading = false }: StatTileProps) {
  return (
    <Card sx={styles.card}>
      <Box sx={styles.top}>
        <Typography variant="body2" color="text.secondary" sx={styles.label}>
          {label}
        </Typography>
        {icon && <IconBadge icon={icon} tone={tone} size="small" />}
      </Box>
      {loading ? (
        <Skeleton variant="text" sx={styles.valueSkeleton} />
      ) : (
        <Typography variant="h4" component="p" sx={styles.value}>
          {typeof value === 'number' ? <AnimatedNumber value={value} /> : (value ?? STRINGS.ui.noValue)}
        </Typography>
      )}
      {hint && !loading && (
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      )}
    </Card>
  );
}
