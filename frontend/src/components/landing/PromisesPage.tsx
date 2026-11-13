import { Box, Typography } from '@mui/material';
import { LANDING_STRINGS } from '../../constants/landingStrings';
import { InView } from './InView';
import { promisesPageStyles as styles } from './PromisesPage.styles';

const P = LANDING_STRINGS.promises;

/** A small hand-drawn cross, for the things we promise not to do. */
function Cross() {
  return (
    <Box component="svg" viewBox="0 0 24 24" sx={styles.cross} aria-hidden>
      <path d="M5 5 C 9 9, 14 14, 19 19 M19 5 C 15 9, 10 14, 5 19" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </Box>
  );
}

/** Trust, written as a page torn from a notebook: what FitMind will not do, signed. */
export function PromisesPage() {
  return (
    <Box component="section" id="promises" sx={styles.root}>
      <InView>
        <Box sx={styles.page}>
          <Typography variant="overline" component="p" sx={styles.eyebrow}>
            {P.eyebrow}
          </Typography>
          <Typography variant="h2" sx={styles.title}>
            {P.title}
          </Typography>
          <Box component="ul" sx={styles.list}>
            {P.items.map((item) => (
              <Box component="li" key={item} sx={styles.item}>
                <Cross />
                <Typography sx={styles.itemText}>{item}</Typography>
              </Box>
            ))}
          </Box>
          <Typography sx={styles.signature}>{P.signature}</Typography>
        </Box>
      </InView>
    </Box>
  );
}
