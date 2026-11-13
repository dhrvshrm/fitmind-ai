import type { ReactNode } from "react";
import { Box, Card, Link, Stack, Typography } from "@mui/material";
import { ArrowBackRounded } from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { LANDING_STRINGS } from "../../constants/landingStrings";
import { ROUTES } from "../../constants/routes";
import { Wordmark } from "../ui/Wordmark";
import { authLayoutStyles as styles } from "./AuthLayout.styles";

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Optional footer, e.g. the "switch to login/signup" link. */
  footer?: ReactNode;
};

const D = LANDING_STRINGS.day;
const A = LANDING_STRINGS.auth;

/** The landing page's day, as a few handwritten lines on today's diary page. */
const DIARY_LINES = [
  { time: D.wake.time, text: D.wake.note },
  { time: D.gym.time, text: D.gym.logRows[0][2] },
  { time: D.lunch.time, text: D.lunch.message },
  { time: D.night.time, text: D.night.postcardLines[0] },
];

/**
 * Shared shell for the auth pages, in the landing page's notebook look: a
 * slim bar back home, a diary page with today's handwritten lines (md+), and
 * the form. On phones it's the bar and the form.
 */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <Box sx={styles.root}>
      <Stack component="header" sx={styles.topBar}>
        <Link component={RouterLink} to={ROUTES.HOME} underline="none" color="inherit" aria-label={LANDING_STRINGS.home}>
          <Wordmark size={32} />
        </Link>
        <Link component={RouterLink} to={ROUTES.HOME} underline="hover" color="text.secondary" sx={styles.back}>
          <ArrowBackRounded fontSize="small" />
          {A.backHome}
        </Link>
      </Stack>

      <Box sx={styles.container}>
        <Box sx={styles.diary} aria-hidden>
          <Typography sx={styles.diaryTitle}>{LANDING_STRINGS.hero.lines.join(" ")}</Typography>
          <Typography sx={styles.diaryTitleAccent}>{LANDING_STRINGS.hero.lastLine}</Typography>
          <Box component="ul" sx={styles.diaryList}>
            {DIARY_LINES.map((line) => (
              <Box component="li" key={line.time} sx={styles.diaryLine}>
                <Box component="span" sx={styles.diaryTime}>
                  {line.time}
                </Box>
                {line.text}
              </Box>
            ))}
          </Box>
          <Typography sx={styles.diaryNote}>{A.note}</Typography>
        </Box>

        <Card sx={styles.formCard}>
          <Stack spacing={0.75} sx={styles.header}>
            <Typography variant="h3" component="h1" sx={styles.title}>
              {title}
            </Typography>
            <Typography variant="body1" color="text.secondary">
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
