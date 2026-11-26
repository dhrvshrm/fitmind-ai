import { Box, Button, Typography } from '@mui/material';
import {
  ArrowForwardRounded,
  CheckRounded,
  DirectionsWalkRounded,
  FitnessCenterRounded,
  WorkspacePremiumRounded,
} from '@mui/icons-material';
import type { SvgIconComponent } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { LANDING_STRINGS } from '../../constants/landingStrings';
import { ROUTES } from '../../constants/routes';
import { IconBadge } from '../ui/IconBadge';
import { InView } from './InView';
import { levelsSectionStyles as styles } from './LevelsSection.styles';

const L = LANDING_STRINGS.levels;

const ICONS: SvgIconComponent[] = [DirectionsWalkRounded, FitnessCenterRounded, WorkspacePremiumRounded];
const TONES = ['success', 'primary', 'secondary'] as const;

/** Three starting points, from never trained to already lifting: the plan meets you where you are. */
export function LevelsSection() {
  return (
    <Box component="section" id="levels" sx={styles.root}>
      <Box sx={styles.inner}>
        <InView>
          <Box sx={styles.head}>
            <Typography sx={styles.eyebrow}>{L.eyebrow}</Typography>
            <Typography variant="h2" sx={styles.title}>
              {L.title}
            </Typography>
            <Typography variant="h2" component="p" sx={styles.titleAccent}>
              {L.titleAccent}
            </Typography>
            <Typography color="text.secondary" sx={styles.body}>
              {L.body}
            </Typography>
          </Box>
        </InView>

        <Box sx={styles.cards}>
          {L.cards.map((card, index) => (
            <InView key={card.title}>
              <Box sx={styles.card(index)}>
                <Box sx={styles.cardHead}>
                  <IconBadge icon={ICONS[index]} tone={TONES[index]} />
                  <Box>
                    <Typography sx={styles.label}>{card.label}</Typography>
                    <Typography component="h3" sx={styles.cardTitle}>
                      {card.title}
                    </Typography>
                  </Box>
                </Box>
                <Box component="ul" sx={styles.points}>
                  {card.points.map((point) => (
                    <Box component="li" key={point} sx={styles.point}>
                      <CheckRounded sx={styles.check} />
                      <Typography variant="body2">{point}</Typography>
                    </Box>
                  ))}
                </Box>
                <Typography sx={styles.today}>{card.today}</Typography>
              </Box>
            </InView>
          ))}
        </Box>

        <Button
          component={RouterLink}
          to={ROUTES.SIGNUP}
          variant="contained"
          endIcon={<ArrowForwardRounded />}
          sx={styles.cta}
        >
          {L.cta}
        </Button>
      </Box>
    </Box>
  );
}
