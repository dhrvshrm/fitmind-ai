import type { ComponentType } from 'react';
import { Box, type SvgIconProps } from '@mui/material';
import { iconBadgeStyles as styles, type IconBadgeTone } from './IconBadge.styles';

type IconBadgeProps = {
  icon: ComponentType<SvgIconProps>;
  tone?: IconBadgeTone;
  size?: 'small' | 'medium' | 'large';
};

/** An icon on a softly tinted square; used by stat tiles and empty states. */
export function IconBadge({ icon: Icon, tone = 'primary', size = 'medium' }: IconBadgeProps) {
  return (
    <Box sx={styles.root(tone, size)}>
      <Icon fontSize={size === 'small' ? 'small' : 'medium'} />
    </Box>
  );
}
