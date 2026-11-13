import { Box, Button, Stack, Typography } from '@mui/material';
import { ArrowForwardRounded } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { LANDING_STRINGS } from '../../constants/landingStrings';
import { ROUTES } from '../../constants/routes';
import { InView } from './InView';
import { heroMastheadStyles as styles } from './HeroMasthead.styles';

const H = LANDING_STRINGS.hero;

/** A hand-drawn arrow from the margin note down to the headline. */
function NoteArrow() {
  return (
    <Box component="svg" viewBox="0 0 90 60" sx={styles.arrow} aria-hidden>
      <path d="M4 6 C 30 4, 60 14, 70 44" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M61 38 L 71 47 L 78 35" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </Box>
  );
}

/** A loose hand-drawn underline. */
function Squiggle() {
  return (
    <Box component="svg" viewBox="0 0 300 16" preserveAspectRatio="none" sx={styles.squiggle} aria-hidden>
      <path d="M3 11 C 40 3, 70 15, 110 8 S 180 2, 220 9 S 280 13, 297 6" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </Box>
  );
}

/**
 * The first screen, set like the front page of a notebook: a margin note,
 * a three-line headline, then the pitch and a short ledger of facts.
 */
export function HeroMasthead() {
  return (
    <Box component="section" sx={styles.root}>
      <Box sx={styles.inner}>
        <InView>
          <Stack sx={styles.noteRow}>
            <Typography sx={styles.note}>{H.note}</Typography>
            <NoteArrow />
          </Stack>
        </InView>

        <InView index={1}>
          <Typography variant="h1" sx={styles.title}>
            {H.lines.map((line) => (
              <Box component="span" key={line} sx={styles.line}>
                {line}
              </Box>
            ))}
            <Box component="span" sx={styles.lastLine}>
              {H.lastLine}
              <Squiggle />
            </Box>
          </Typography>
        </InView>

        <Box sx={styles.lower}>
          <InView index={2}>
            <Box>
              <Typography variant="body1" sx={styles.body}>
                {H.body}
              </Typography>
              <Stack sx={styles.ctas}>
                <Button component={RouterLink} to={ROUTES.SIGNUP} variant="contained" size="large" endIcon={<ArrowForwardRounded />} sx={styles.primary}>
                  {H.primary}
                </Button>
                <Button href="#day" size="large" color="inherit" sx={styles.secondary}>
                  {H.secondary}
                </Button>
              </Stack>
              <Typography variant="caption" color="text.secondary" component="p" sx={styles.freeNote}>
                {H.freeNote}
              </Typography>
            </Box>
          </InView>

          <InView index={3}>
            <Box component="dl" sx={styles.ledger}>
              {H.facts.map((fact) => (
                <Box key={fact.value} sx={styles.fact}>
                  <Typography component="dt" sx={styles.factValue}>
                    {fact.value}
                  </Typography>
                  <Typography component="dd" variant="body2" color="text.secondary" sx={styles.factLabel}>
                    {fact.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </InView>
        </Box>
      </Box>
    </Box>
  );
}
