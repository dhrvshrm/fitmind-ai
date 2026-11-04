import type { ReactNode } from 'react';
import { Box, Card, Stack, Typography } from '@mui/material';
import { sectionCardStyles as styles } from './SectionCard.styles';

type SectionCardProps = {
  title?: string;
  subtitle?: string;
  /** Control shown at the right of the header (a button, chip or value). */
  action?: ReactNode;
  children: ReactNode;
  /** Remove body padding, e.g. for edge-to-edge lists. */
  flush?: boolean;
};

/** The standard content card: optional header, then the section body. */
export function SectionCard({ title, subtitle, action, children, flush = false }: SectionCardProps) {
  const hasHeader = Boolean(title || subtitle || action);
  const bodyStyle = flush ? styles.bodyFlush : hasHeader ? styles.bodyAfterHeader : styles.body;

  return (
    <Card sx={styles.card}>
      {hasHeader && (
        <Stack sx={styles.header}>
          <Box sx={styles.headerText}>
            {title && (
              <Typography variant="h6" component="h2">
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {action && <Box sx={styles.action}>{action}</Box>}
        </Stack>
      )}
      <Box sx={bodyStyle}>{children}</Box>
    </Card>
  );
}
