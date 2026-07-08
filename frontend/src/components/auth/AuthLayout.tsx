import type { ComponentType, ReactNode } from 'react';
import { Box, Card, Stack, Typography } from '@mui/material';
import {
  AutoAwesomeRounded,
  EmojiEventsRounded,
  FitnessCenterRounded,
  MonitorHeartRounded,
} from '@mui/icons-material';
import { STRINGS } from '../../constants/strings';
import { authLayoutStyles as styles } from './AuthLayout.styles';

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Optional footer, e.g. the "switch to login/signup" link. */
  footer?: ReactNode;
};

/** Icons paired positionally with `STRINGS.app.features`. */
const FEATURE_ICONS: ComponentType[] = [
  AutoAwesomeRounded,
  MonitorHeartRounded,
  EmojiEventsRounded,
];

/**
 * Shared shell for the auth pages: a two-panel card — branded gradient panel
 * with feature highlights on the left (md+), the form on the right.
 */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <Box sx={styles.root}>
      <Card elevation={8} sx={styles.card}>
        <Box sx={styles.brandPanel}>
          <Box>
            <Stack sx={styles.brandRow}>
              <FitnessCenterRounded />
              <Typography variant="h6" sx={styles.brandName}>
                {STRINGS.app.name}
              </Typography>
            </Stack>
            <Typography variant="h4" sx={styles.heroTitle}>
              {STRINGS.app.heroTitle}
            </Typography>
            <Typography variant="body2" sx={styles.tagline}>
              {STRINGS.app.tagline}
            </Typography>
          </Box>

          <Stack spacing={2}>
            {STRINGS.app.features.map((feature, index) => {
              const Icon = FEATURE_ICONS[index] ?? AutoAwesomeRounded;
              return (
                <Stack key={feature} sx={styles.featureRow}>
                  <Box sx={styles.featureIcon}>
                    <Icon />
                  </Box>
                  <Typography variant="body2" sx={styles.featureText}>
                    {feature}
                  </Typography>
                </Stack>
              );
            })}
          </Stack>
        </Box>

        <Box sx={styles.formPanel}>
          <Stack spacing={0.5} sx={styles.header}>
            <Typography variant="overline" color="primary" sx={styles.mobileBrand}>
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
        </Box>
      </Card>
    </Box>
  );
}
