import type { ComponentType, ReactNode } from 'react';
import { Box, Typography, type SvgIconProps } from '@mui/material';
import { IconBadge } from './IconBadge';
import { emptyStateStyles as styles } from './EmptyState.styles';

type EmptyStateProps = {
  icon: ComponentType<SvgIconProps>;
  title: string;
  description?: string;
  /** The one obvious next step (usually a button). */
  action?: ReactNode;
  /** Tighter spacing for use inside a card next to other content. */
  compact?: boolean;
};

/** Shown when a section has no data yet; always says what to do next. */
export function EmptyState({ icon, title, description, action, compact = false }: EmptyStateProps) {
  return (
    <Box sx={compact ? styles.rootCompact : styles.root}>
      <IconBadge icon={icon} tone="neutral" size={compact ? 'medium' : 'large'} />
      <Typography variant="subtitle1" sx={styles.title}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={styles.description}>
          {description}
        </Typography>
      )}
      {action && <Box sx={styles.action}>{action}</Box>}
    </Box>
  );
}
