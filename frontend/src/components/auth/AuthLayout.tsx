import type { ReactNode } from "react";
import { Box, Card, Stack, Typography } from "@mui/material";
import {
  AutoAwesomeRounded,
  EventNoteRounded,
  FitnessCenterRounded,
  MicRounded,
  RestaurantRounded,
} from "@mui/icons-material";
import { STRINGS } from "../../constants/strings";
import { IconBadge } from "../ui/IconBadge";
import { authLayoutStyles as styles } from "./AuthLayout.styles";

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Optional footer, e.g. the "switch to login/signup" link. */
  footer?: ReactNode;
};

/** Icons paired positionally with `STRINGS.app.features`. */
const FEATURE_ICONS = [MicRounded, RestaurantRounded, EventNoteRounded];

/**
 * Shared shell for the auth pages: a calm two-column layout with a tinted
 * brand panel and feature highlights on the left (md+) and the form card on
 * the right. Collapses to the form alone, with a small brand row, on mobile.
 */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <Box sx={styles.root}>
      <Box sx={styles.container}>
        <Box sx={styles.brandPanel}>
          <Box>
            <Stack sx={styles.brandRow}>
              <Box sx={styles.brandMark}>
                <FitnessCenterRounded fontSize="small" />
              </Box>
              <Typography variant="h6" component="p">
                {STRINGS.app.name}
              </Typography>
            </Stack>
            <Typography variant="h3" component="p" sx={styles.heroTitle}>
              {STRINGS.app.heroTitle}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {STRINGS.app.tagline}
            </Typography>
          </Box>

          <Stack spacing={2}>
            {STRINGS.app.features.map((feature, index) => (
              <Stack key={feature} sx={styles.featureRow}>
                <IconBadge icon={FEATURE_ICONS[index] ?? AutoAwesomeRounded} />
                <Typography variant="body2">{feature}</Typography>
              </Stack>
            ))}
          </Stack>
        </Box>

        <Card sx={styles.formCard}>
          <Stack sx={styles.mobileBrand}>
            <Box sx={styles.brandMark}>
              <FitnessCenterRounded fontSize="small" />
            </Box>
            <Typography variant="subtitle1" component="p">
              {STRINGS.app.name}
            </Typography>
          </Stack>

          <Stack spacing={0.5} sx={styles.header}>
            <Typography variant="h4" component="h1">
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          </Stack>

          {children}

          {footer && <Box sx={styles.footer}>{footer}</Box>}
        </Card>
      </Box>
    </Box>
  );
}
