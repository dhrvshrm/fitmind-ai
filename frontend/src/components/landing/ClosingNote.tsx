import { Box, Button, Stack, Typography } from '@mui/material';
import { ArrowForwardRounded } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { LANDING_STRINGS } from '../../constants/landingStrings';
import { ROUTES } from '../../constants/routes';
import { InView } from './InView';
import { closingNoteStyles as styles } from './ClosingNote.styles';

const C = LANDING_STRINGS.closing;

/** The last word: one serif line, a handwritten sign-off and the way in. */
export function ClosingNote() {
  return (
    <Box component="section" sx={styles.root}>
      <InView>
        <Box sx={styles.inner}>
          <Typography variant="h2" sx={styles.line}>
            {C.line}
          </Typography>
          <Typography sx={styles.note}>{C.note}</Typography>
          <Stack sx={styles.actions}>
            <Button component={RouterLink} to={ROUTES.SIGNUP} variant="contained" size="large" endIcon={<ArrowForwardRounded />} sx={styles.primary}>
              {C.primary}
            </Button>
            <Button component={RouterLink} to={ROUTES.LOGIN} size="large" color="inherit" sx={styles.secondary}>
              {C.secondary}
            </Button>
          </Stack>
        </Box>
      </InView>
    </Box>
  );
}
