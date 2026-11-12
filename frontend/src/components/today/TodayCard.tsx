import type { ComponentType, ReactNode } from 'react';
import { Box, Card, Typography, type SvgIconProps } from '@mui/material';
import { IconBadge } from '../ui/IconBadge';
import type { IconBadgeTone } from '../ui/IconBadge.styles';
import { todayCardStyles as styles } from './TodayCard.styles';

type TodayCardProps = {
  title: string;
  icon: ComponentType<SvgIconProps>;
  tone?: IconBadgeTone;
  /** Small text under the title (a time, a count). */
  caption?: ReactNode;
  /** Control at the right of the header. */
  action?: ReactNode;
  /** Brand-tinted background for the card that matters most right now. */
  highlight?: boolean;
  /** Gentle hover lift for cards that are mainly one big action. */
  interactive?: boolean;
  children: ReactNode;
};

/** The card shell every Today section uses: icon, small title, then content. */
export function TodayCard({
  title,
  icon,
  tone = 'primary',
  caption,
  action,
  highlight = false,
  interactive = false,
  children,
}: TodayCardProps) {
  return (
    <Card component="section" aria-label={title} sx={styles.card(highlight, interactive)}>
      <Box sx={styles.header}>
        <IconBadge icon={icon} tone={tone} size="small" />
        <Box sx={styles.headerText}>
          <Typography variant="overline" component="h2" sx={styles.title}>
            {title}
          </Typography>
          {caption && (
            <Typography variant="caption" sx={styles.caption}>
              {caption}
            </Typography>
          )}
        </Box>
        {action && <Box sx={styles.action}>{action}</Box>}
      </Box>
      <Box sx={styles.body}>{children}</Box>
    </Card>
  );
}
