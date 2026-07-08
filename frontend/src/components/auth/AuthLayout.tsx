import type { ReactNode } from 'react';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { STRINGS } from '../../constants/strings';
import { authLayoutStyles as styles } from './AuthLayout.styles';

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Optional footer, e.g. the "switch to login/signup" link. */
  footer?: ReactNode;
};

/**
 * Shared shell for the auth pages: centered, responsive card with app branding.
 * Both `LoginPage` and `SignupPage` render their form inside it.
 */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <Box sx={styles.root}>
      <Card elevation={8} sx={styles.card}>
        <CardContent sx={styles.content}>
          <Stack spacing={0.5} sx={styles.header}>
            <Typography variant="overline" color="primary" sx={styles.brand}>
              {STRINGS.app.name}
            </Typography>
            <Typography variant="h5" sx={styles.title}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          </Stack>

          {children}

          {footer && <Box sx={styles.footer}>{footer}</Box>}
        </CardContent>
      </Card>
    </Box>
  );
}
