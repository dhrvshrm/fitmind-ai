import { Box, Typography } from '@mui/material';
import { STRINGS } from '../../constants/strings';
import { wordmarkStyles as styles } from './Wordmark.styles';

type WordmarkProps = {
  /** Size of the mark in px; the name scales with it. */
  size?: number;
};

/**
 * The FitMind mark and name: the neel tile with the dumbbell, "FitMind" in the
 * display serif and an italic "AI" in brand ink. Used by every top bar.
 */
export function Wordmark({ size = 32 }: WordmarkProps) {
  return (
    <Box sx={styles.root}>
      <Box component="img" src="/favicon.svg" alt="" width={size} height={size} sx={styles.mark(size)} />
      <Typography component="span" sx={styles.name(size)}>
        {STRINGS.navbar.brandName}
        <Box component="span" sx={styles.ai}>
          {STRINGS.navbar.brandAI}
        </Box>
      </Typography>
    </Box>
  );
}
