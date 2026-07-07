import type { ReactNode } from 'react';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { STRINGS } from '../../constants/strings';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Optional footer, e.g. the "switch to login/signup" link. */
  footer?: ReactNode;
}

/**
 * Shared shell for the auth pages: centered, responsive card with app branding.
 * Both `LoginPage` and `SignupPage` render their form inside it.
 */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <Box
      sx={{
        minHeight: '100svh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        background: 'linear-gradient(160deg, #f7f6fb 0%, #efe6fb 100%)',
      }}
    >
      <Card
        elevation={8}
        sx={{ width: '100%', maxWidth: 420, borderRadius: 3 }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack spacing={0.5} sx={{ mb: 3, textAlign: 'center' }}>
            <Typography variant="overline" color="primary" sx={{ fontWeight: 700 }}>
              {STRINGS.app.name}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          </Stack>

          {children}

          {footer && (
            <Box sx={{ mt: 3, textAlign: 'center' }}>{footer}</Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
