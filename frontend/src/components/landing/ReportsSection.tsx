import { Box, Button, Typography } from '@mui/material';
import { ArrowForwardRounded, CheckRounded, ScienceRounded } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { LANDING_STRINGS } from '../../constants/landingStrings';
import { ROUTES } from '../../constants/routes';
import { InView } from './InView';
import { reportsSectionStyles as styles } from './ReportsSection.styles';

const R = LANDING_STRINGS.reports;

/** Blood tests and body scans that change the plan, with a sample slip of what changed. */
export function ReportsSection() {
  return (
    <Box component="section" id="reports" sx={styles.root}>
      <Box sx={styles.inner}>
        <InView>
          <Box>
            <Typography sx={styles.eyebrow}>{R.eyebrow}</Typography>
            <Typography variant="h2" sx={styles.title}>
              {R.title}
            </Typography>
            <Typography variant="h2" component="p" sx={styles.titleAccent}>
              {R.titleAccent}
            </Typography>
            <Typography color="text.secondary" sx={styles.body}>
              {R.body}
            </Typography>
            <Box component="ul" sx={styles.points}>
              {R.points.map((point) => (
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
              {R.cta}
            </Button>
          </Box>
        </InView>

        <InView>
          <Box sx={styles.slip} role="img" aria-label={`${LANDING_STRINGS.example}: ${R.slipTitle}`}>
            <Box sx={styles.slipHead}>
              <ScienceRounded fontSize="small" />
              <Typography sx={styles.slipTitle}>{R.slipTitle}</Typography>
              <Typography sx={styles.example}>{LANDING_STRINGS.example}</Typography>
            </Box>
            <Box component="ul" sx={styles.rows}>
              {R.rows.map(([marker, value, change]) => (
                <Box component="li" key={marker} sx={styles.row}>
                  <Typography component="span" sx={styles.marker}>
                    {marker}
                  </Typography>
                  <Typography component="span" sx={styles.value}>
                    {value}
                  </Typography>
                  <Typography component="span" sx={styles.change}>
                    {change}
                  </Typography>
                </Box>
              ))}
            </Box>
            <Typography sx={styles.slipNote}>{R.slipNote}</Typography>
          </Box>
        </InView>
      </Box>
    </Box>
  );
}
