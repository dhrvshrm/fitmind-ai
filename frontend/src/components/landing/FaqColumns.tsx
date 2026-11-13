import { Box, Typography } from '@mui/material';
import { LANDING_STRINGS } from '../../constants/landingStrings';
import { InView } from './InView';
import { faqColumnsStyles as styles } from './FaqColumns.styles';

const F = LANDING_STRINGS.faq;

/** Questions and answers set like a printed page: two columns, rules, no boxes. */
export function FaqColumns() {
  return (
    <Box component="section" id="faq" sx={styles.root}>
      <Box sx={styles.inner}>
        <Box sx={styles.heading}>
          <Typography variant="overline" component="p" sx={styles.eyebrow}>
            {F.eyebrow}
          </Typography>
          <Typography variant="h2" sx={styles.title}>
            {F.title}
          </Typography>
        </Box>
        <Box component="dl" sx={styles.grid}>
          {F.items.map((item, index) => (
            <InView key={item.q} index={index % 2}>
              <Box sx={styles.item}>
                <Typography component="dt" sx={styles.q}>
                  {item.q}
                </Typography>
                <Typography component="dd" variant="body1" color="text.secondary" sx={styles.a}>
                  {item.a}
                </Typography>
              </Box>
            </InView>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
