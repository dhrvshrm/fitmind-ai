import { Box, Chip, Typography } from '@mui/material';
import {
  ExploreRounded,
  MenuBookRounded,
  ScienceRounded,
  SportsSoccerRounded,
} from '@mui/icons-material';
import type { SvgIconComponent } from '@mui/icons-material';
import { LANDING_STRINGS } from '../../constants/landingStrings';
import { IconBadge } from '../ui/IconBadge';
import { InView } from './InView';
import { nextSectionStyles as styles } from './NextSection.styles';

const N = LANDING_STRINGS.next;

const ICONS: SvgIconComponent[] = [SportsSoccerRounded, MenuBookRounded, ScienceRounded, ExploreRounded];

/** What is being built next, so early users know where the product is going. */
export function NextSection() {
  return (
    <Box component="section" id="next" sx={styles.root}>
      <Box sx={styles.inner}>
        <InView>
          <Box>
            <Typography sx={styles.eyebrow}>{N.eyebrow}</Typography>
            <Typography variant="h2" sx={styles.title}>
              {N.title}
            </Typography>
            <Typography color="text.secondary" sx={styles.body}>
              {N.body}
            </Typography>
          </Box>
        </InView>
        <Box sx={styles.grid}>
          {N.items.map((item, index) => (
            <InView key={item.title}>
              <Box sx={styles.item}>
                <Box sx={styles.itemHead}>
                  <IconBadge icon={ICONS[index]} tone="info" />
                  <Chip size="small" variant="outlined" label={N.soon} />
                </Box>
                <Typography sx={styles.itemTitle}>{item.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.body}
                </Typography>
              </Box>
            </InView>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
