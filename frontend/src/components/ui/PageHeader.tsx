import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { pageHeaderStyles as styles } from './PageHeader.styles';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  /** Buttons or controls shown on the right (below the title on mobile). */
  actions?: ReactNode;
};

/** Title row at the top of every app page. */
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <Stack sx={styles.root}>
      <Box sx={styles.text}>
        <Typography variant="h4" component="h1">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={styles.subtitle}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && <Box sx={styles.actions}>{actions}</Box>}
    </Stack>
  );
}
