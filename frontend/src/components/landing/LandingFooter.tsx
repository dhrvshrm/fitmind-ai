import { Box, Stack, Typography } from '@mui/material';
import { LANDING_STRINGS } from '../../constants/landingStrings';
import { Wordmark } from '../ui/Wordmark';
import { landingFooterStyles as styles } from './LandingFooter.styles';

const F = LANDING_STRINGS.footer;

/** Brand, one line on what FitMind is, and the not-medical-advice note. */
export function LandingFooter() {
  return (
    <Box component="footer" sx={styles.root}>
      <Stack sx={styles.inner}>
        <Stack sx={styles.brand}>
          <Wordmark size={30} />
          <Typography variant="body2" color="text.secondary">
            {F.tagline}
          </Typography>
        </Stack>
        <Box sx={styles.meta}>
          <Typography variant="caption" color="text.secondary" component="p">
            {F.disclaimer}
          </Typography>
          <Typography variant="caption" color="text.secondary" component="p">
            {F.rights(new Date().getFullYear())}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}
