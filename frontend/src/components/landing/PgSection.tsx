import { Box, Button, Stack, Typography } from '@mui/material';
import { ArrowForwardRounded, CheckRounded } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { LANDING_STRINGS } from '../../constants/landingStrings';
import { ROUTES } from '../../constants/routes';
import { InView } from './InView';
import { pgSectionStyles as styles } from './PgSection.styles';

const P = LANDING_STRINGS.pg;

/**
 * For students and working people in a PG or hostel: the mess serves the
 * meals, a small shelf does the rest. A pinned chit shows one sample day.
 */
export function PgSection() {
  return (
    <Box component="section" id="pg" sx={styles.root}>
      <Box sx={styles.inner}>
        <InView>
          <Box>
            <Typography sx={styles.eyebrow}>{P.eyebrow}</Typography>
            <Typography variant="h2" sx={styles.title}>
              {P.title}
            </Typography>
            <Typography variant="h2" component="p" sx={styles.titleAccent}>
              {P.titleAccent}
            </Typography>
            <Typography color="text.secondary" sx={styles.body}>
              {P.body}
            </Typography>
            <Box component="ul" sx={styles.points}>
              {P.points.map((point) => (
                <Box component="li" key={point} sx={styles.point}>
                  <CheckRounded fontSize="small" sx={styles.check} />
                  <Typography variant="body2">{point}</Typography>
                </Box>
              ))}
            </Box>
            <Button
              component={RouterLink}
              to={ROUTES.SIGNUP}
              variant="outlined"
              endIcon={<ArrowForwardRounded />}
              sx={styles.cta}
            >
              {P.cta}
            </Button>
          </Box>
        </InView>

        <InView>
          <Box sx={styles.chitWrap}>
            <Box sx={styles.chit} role="img" aria-label={`${LANDING_STRINGS.example}: ${P.chitTitle}`}>
              <Box sx={styles.pin} />
              <Typography sx={styles.chitExample}>{LANDING_STRINGS.example}</Typography>
              <Typography sx={styles.chitTitle}>{P.chitTitle}</Typography>
              <Box component="ol" sx={styles.chitRows}>
                {P.chitRows.map(([time, what, cost]) => (
                  <Stack component="li" key={time} sx={styles.chitRow}>
                    <Box component="span" sx={styles.chitTime}>
                      {time}
                    </Box>
                    <Box component="span" sx={styles.chitWhat}>
                      {what}
                    </Box>
                    <Box component="span" sx={styles.chitCost}>
                      {cost}
                    </Box>
                  </Stack>
                ))}
              </Box>
              <Stack sx={styles.chitTotal}>
                <span>{P.chitTotal[0]}</span>
                <span>{P.chitTotal[1]}</span>
              </Stack>
              <Typography sx={styles.chitProtein}>{P.chitProtein}</Typography>
              <Typography sx={styles.chitNote}>{P.chitNote}</Typography>
            </Box>
          </Box>
        </InView>
      </Box>
    </Box>
  );
}
